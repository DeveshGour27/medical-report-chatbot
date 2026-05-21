"""
Medical Report Explanation API
================================
FastAPI backend using:
  - medical_knowledge.json as the knowledge database
  - Groq LLM for NLP (llama-3.1-8b-instant)
  - pdfplumber + EasyOCR for PDF parsing
  - SQLite for report history & trend tracking
  - Full RAG pipeline — every question answered from the uploaded report + KB
"""

import os
import re
import json
import sqlite3
import tempfile
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
KNOWLEDGE_PATH = Path(__file__).parent / "medical_knowledge.json"
HISTORY_DB = Path(__file__).parent / "medical_history.db"

SYSTEM_PROMPT = """You are a warm, knowledgeable Medical Report Explanation Assistant.

STRICT RULES:
1. Answer ONLY using the provided medical knowledge context and report data. Do NOT invent or guess medical facts.
2. If the context does not cover the question, say exactly: "I don't have enough information on that — please consult your doctor."
3. NEVER make a diagnosis. You explain test results; only doctors diagnose.
4. Always end your response with: "Please consult your doctor for personalized advice."
5. When you reference information, mention the source (e.g., "According to MedlinePlus...").
6. Speak warmly and clearly, as if explaining to a concerned family member.
7. Keep responses focused and under 300 words unless a detailed summary is explicitly requested."""


# ─────────────────────────────────────────────────────────────────────────────
# KNOWLEDGE BASE
# ─────────────────────────────────────────────────────────────────────────────

class KnowledgeBase:
    def __init__(self, path: Path):
        if not path.exists():
            raise FileNotFoundError(f"medical_knowledge.json not found at {path}")
        with open(path, "r", encoding="utf-8") as f:
            self.data: dict = json.load(f)
        self.tests: dict = self.data.get("tests", {})
        self.diseases: dict = self.data.get("diseases", {})
        self.risk_thresholds: dict = self.data.get("risk_thresholds", {})
        logger.info(f"Loaded KB: {len(self.tests)} tests, {len(self.diseases)} diseases")

    def get_test(self, name: str) -> Optional[dict]:
        name_lower = name.lower().strip()
        if name_lower in self.tests:
            return self.tests[name_lower]
        for key, val in self.tests.items():
            if name_lower in key or key in name_lower:
                return val
            if name_lower in val.get("full_name", "").lower():
                return val
        return None

    def get_disease(self, name: str) -> Optional[dict]:
        name_lower = name.lower().strip()
        if name_lower in self.diseases:
            return self.diseases[name_lower]
        for key, val in self.diseases.items():
            if name_lower in key or key in name_lower:
                return val
            if name_lower in val.get("name", "").lower():
                return val
        return None

    def build_context_for_test(self, test_key: str, value: float, unit: str) -> str:
        info = self.get_test(test_key)
        if not info:
            return f"No detailed information available for test: {test_key}"

        ref = info.get("reference_ranges", {}).get("default", {})
        ref_low = ref.get("low")
        ref_high = ref.get("high")

        status = "normal"
        if ref_low is not None and value < ref_low:
            status = "low"
        elif ref_high is not None and value > ref_high:
            status = "high"

        parts = [
            f"TEST: {info.get('full_name', test_key)}",
            f"PATIENT VALUE: {value} {unit}",
            f"REFERENCE RANGE: {ref_low}–{ref_high} {info.get('unit', unit)}",
            f"STATUS: {status.upper()}",
            f"DESCRIPTION: {info.get('description', '')}",
            f"CATEGORY: {info.get('category', '')}",
        ]

        if status == "low":
            parts.append(f"COMMON CAUSES OF LOW VALUES: {', '.join(info.get('low_causes', []))}")
            parts.append(f"SYMPTOMS WHEN LOW: {', '.join(info.get('low_symptoms', []))}")
            diet = info.get("diet_advice", {}).get("low", [])
            if diet:
                parts.append(f"DIETARY ADVICE: {'; '.join(diet)}")
        elif status == "high":
            parts.append(f"COMMON CAUSES OF HIGH VALUES: {', '.join(info.get('high_causes', []))}")
            parts.append(f"SYMPTOMS WHEN HIGH: {', '.join(info.get('high_symptoms', []))}")
            diet = info.get("diet_advice", {}).get("high", [])
            if diet:
                parts.append(f"DIETARY ADVICE: {'; '.join(diet)}")

        parts.append(f"WHEN TO SEE A DOCTOR: {info.get('when_to_see_doctor', '')}")
        parts.append(f"SOURCES: {'; '.join(info.get('sources', []))}")
        return "\n".join(parts)

    def build_context_for_disease(self, disease_key: str) -> str:
        info = self.get_disease(disease_key)
        if not info:
            test_info = self.get_test(disease_key)
            if test_info:
                return (
                    f"TEST: {test_info.get('full_name', disease_key)}\n"
                    f"DESCRIPTION: {test_info.get('description', '')}\n"
                    f"CATEGORY: {test_info.get('category', '')}\n"
                    f"REFERENCE RANGE: {test_info.get('reference_ranges', {}).get('default', {})}\n"
                    f"SOURCES: {'; '.join(test_info.get('sources', []))}"
                )
            return f"No specific information available for: {disease_key}"

        parts = [
            f"CONDITION: {info.get('name', disease_key)}",
            f"DEFINITION: {info.get('definition', '')}",
            f"SYMPTOMS: {', '.join(info.get('symptoms', []))}",
            f"CAUSES: {', '.join(info.get('causes', []))}",
            f"DIAGNOSIS TESTS: {', '.join(info.get('diagnosis_tests', []))}",
            f"TREATMENT: {', '.join(info.get('treatment', []))}",
            f"DIET ADVICE: {', '.join(info.get('diet', []))}",
            f"WHEN TO SEE A DOCTOR: {info.get('when_to_see_doctor', '')}",
            f"TYPES: {', '.join(info.get('types', []))}",
            f"SOURCES: {'; '.join(info.get('sources', []))}",
        ]
        return "\n".join(parts)

    def search_kb_for_query(self, query: str) -> list[str]:
        """Return relevant KB articles based on keywords in the query."""
        ql = query.lower()
        articles = []
        for key, info in self.tests.items():
            if key in ql or info.get("full_name", "").lower() in ql:
                articles.append(self.build_context_for_test(key, 0, ""))
        for key, info in self.diseases.items():
            if key in ql or info.get("name", "").lower() in ql:
                articles.append(self.build_context_for_disease(key))
        return articles[:3]  # cap to avoid token overflow

    def get_all_test_names(self) -> list[str]:
        return list(self.tests.keys())

    def get_all_disease_names(self) -> list[str]:
        return list(self.diseases.keys())


# ─────────────────────────────────────────────────────────────────────────────
# RISK CLASSIFICATION
# ─────────────────────────────────────────────────────────────────────────────

RISK_OVERRIDES = [
    ("glucose",    lambda v: v > 400,  "Critical", "⛔ Glucose is dangerously high. Seek emergency care immediately."),
    ("glucose",    lambda v: v > 300,  "Severe",   "🚨 Glucose is very high. Contact your doctor today."),
    ("glucose",    lambda v: v < 50,   "Critical", "⛔ Glucose critically low — risk of hypoglycemic coma. Seek emergency care."),
    ("hemoglobin", lambda v: v < 7.0,  "Critical", "⛔ Hemoglobin critically low. Seek urgent medical attention."),
    ("hemoglobin", lambda v: v < 9.0,  "Severe",   "🚨 Hemoglobin severely low. Doctor visit needed soon."),
    ("platelet",   lambda v: v < 50,   "Critical", "⛔ Platelets critically low — high bleeding risk. Seek emergency care."),
    ("platelet",   lambda v: v > 800,  "Severe",   "🚨 Platelets very high — clotting risk. Contact your doctor."),
    ("creatinine", lambda v: v > 5.0,  "Critical", "⛔ Creatinine critically elevated — possible kidney failure. Urgent care needed."),
    ("creatinine", lambda v: v > 2.0,  "Severe",   "🚨 Creatinine significantly elevated. See your doctor promptly."),
]


def classify_risk(
    test_name: str,
    value: float,
    ref_low: Optional[float],
    ref_high: Optional[float],
) -> dict:
    tl = test_name.lower()

    for substr, condition, level, msg in RISK_OVERRIDES:
        if substr in tl and condition(value):
            return {
                "level": level,
                "alert": msg,
                "status": "low" if value < (ref_low or 0) else "high",
            }

    if ref_low is None or ref_high is None:
        return {"level": "Unknown", "alert": "", "status": "unknown"}

    if ref_low <= value <= ref_high:
        return {"level": "Normal", "alert": "✅ Within normal range.", "status": "normal"}

    status = "low" if value < ref_low else "high"
    deviation = (
        (ref_low - value) / ref_low
        if status == "low" and ref_low != 0
        else (value - ref_high) / ref_high if ref_high != 0 else 0
    )

    if deviation < 0.10:
        return {"level": "Mild",     "alert": "ℹ️ Slightly outside normal range — worth monitoring.", "status": status}
    elif deviation < 0.25:
        return {"level": "Moderate", "alert": "⚠️ Noticeably outside normal range — consult your doctor.", "status": status}
    else:
        return {"level": "Severe",   "alert": "🚨 Significantly outside normal range — please see your doctor soon.", "status": status}


# ─────────────────────────────────────────────────────────────────────────────
# PDF PARSER
# ─────────────────────────────────────────────────────────────────────────────

class MedicalReportParser:
    def __init__(self):
        self.parsed_data: dict = {}
        self.raw_text: str = ""
        self.patient_info: dict = {}

    def _parse_table_rows(self, rows: list) -> dict:
        results = {}
        for row in rows:
            if not row or len(row) < 2:
                continue
            row_str = [str(c).strip() if c else "" for c in row]
            test_name = row_str[0]
            if not test_name or re.search(r"^(test|parameter|analyte|name)$", test_name, re.I):
                continue

            value = ref_low = ref_high = unit = None
            for cell in row_str[1:]:
                if not cell:
                    continue
                if value is None and re.match(r"^\d+\.?\d*$", cell):
                    try:
                        value = float(cell)
                    except ValueError:
                        pass
                rng = re.search(r"(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)", cell)
                if rng:
                    ref_low, ref_high = float(rng.group(1)), float(rng.group(2))
                if unit is None and re.match(r"^[a-zA-Z%/μ^3µ]+$", cell) and len(cell) <= 10:
                    unit = cell

            if value is not None:
                results[test_name.lower().strip()] = {
                    "value": value,
                    "unit": unit or "",
                    "reference_low": ref_low,
                    "reference_high": ref_high,
                    "original_line": " | ".join(filter(None, row_str)),
                }
        return results

    def _parse_text_fallback(self, text: str) -> dict:
        results = {}
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            # Pattern A: "TestName   unit   low - high   value"
            m = re.search(
                r"^([A-Za-z ]+?)\s+([a-zA-Z/%μµ^3]+)\s+(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)\s+(\d+\.?\d*)\s*$",
                line,
            )
            if m:
                name = m.group(1).strip().lower()
                results[name] = {
                    "value": float(m.group(5)),
                    "unit": m.group(2),
                    "reference_low": float(m.group(3)),
                    "reference_high": float(m.group(4)),
                    "original_line": line,
                }
                continue
            # Pattern B: "TestName: value unit (low - high)"
            m = re.search(
                r"([A-Za-z ]+?):\s*(\d+\.?\d*)\s*([a-zA-Z/%µ]*)\s*(?:\(?(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*))?",
                line,
                re.IGNORECASE,
            )
            if m and 3 <= len(m.group(1).strip()) <= 60:
                name = m.group(1).strip().lower()
                results[name] = {
                    "value": float(m.group(2)),
                    "unit": m.group(3) or "",
                    "reference_low": float(m.group(4)) if m.group(4) else None,
                    "reference_high": float(m.group(5)) if m.group(5) else None,
                    "original_line": line,
                }
        return results

    def _ocr_extract(self, pdf_path: str) -> str:
        try:
            import fitz
            import easyocr
            reader = easyocr.Reader(["en"], gpu=False)
            text_parts = []
            doc = fitz.open(pdf_path)
            for page in doc:
                pix = page.get_pixmap(dpi=200)
                img_bytes = pix.tobytes("png")
                results = reader.readtext(img_bytes, detail=0)
                text_parts.append("\n".join(results))
            return "\n".join(text_parts)
        except ImportError:
            logger.warning("OCR libraries not installed (easyocr, pymupdf)")
            return ""
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
            return ""

    def extract_from_pdf(self, pdf_path: str) -> dict:
        results = {}
        raw_text = ""
        try:
            import pdfplumber
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    for table in page.extract_tables():
                        results.update(self._parse_table_rows(table))
                    page_text = page.extract_text() or ""
                    raw_text += page_text + "\n"
        except ImportError:
            logger.warning("pdfplumber not installed")
        except Exception as e:
            logger.warning(f"pdfplumber error: {e}")

        if not results and raw_text.strip():
            results = self._parse_text_fallback(raw_text)

        if not results:
            ocr_text = self._ocr_extract(pdf_path)
            raw_text = ocr_text
            results = self._parse_text_fallback(ocr_text)

        self.raw_text = raw_text
        self.parsed_data = results
        self.patient_info = self._extract_patient_info(raw_text)
        return results

    def _extract_patient_info(self, text: str) -> dict:
        info = {}
        for line in text.splitlines()[:20]:
            if re.search(r"name\s*:", line, re.I):
                info["name"] = re.sub(r".*name\s*:\s*", "", line, flags=re.I).strip()
            if re.search(r"age\s*:", line, re.I):
                info["age"] = re.sub(r".*age\s*:\s*", "", line, flags=re.I).strip()
            if re.search(r"gender|sex", line, re.I):
                info["gender"] = re.sub(r".*(gender|sex)\s*:\s*", "", line, flags=re.I).strip()
        return info


# ─────────────────────────────────────────────────────────────────────────────
# SQLITE HISTORY
# ─────────────────────────────────────────────────────────────────────────────

def init_db():
    con = sqlite3.connect(HISTORY_DB)
    con.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            report_date TEXT,
            filename TEXT,
            test_name TEXT,
            value REAL,
            unit TEXT,
            reference_low REAL,
            reference_high REAL,
            risk_level TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            role TEXT,
            content TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    con.commit()
    con.close()


def save_report(session_id: str, filename: str, parsed_data: dict, report_date: str):
    con = sqlite3.connect(HISTORY_DB)
    rows = []
    for test_name, d in parsed_data.items():
        risk = classify_risk(test_name, d["value"], d.get("reference_low"), d.get("reference_high"))
        rows.append((
            session_id, report_date, filename, test_name,
            d["value"], d.get("unit", ""),
            d.get("reference_low"), d.get("reference_high"),
            risk["level"],
        ))
    con.executemany(
        "INSERT INTO reports (session_id,report_date,filename,test_name,value,unit,reference_low,reference_high,risk_level) VALUES (?,?,?,?,?,?,?,?,?)",
        rows,
    )
    con.commit()
    con.close()


def get_test_history(test_name: str, session_id: Optional[str] = None) -> list[dict]:
    con = sqlite3.connect(HISTORY_DB)
    query = "SELECT report_date,value,unit,risk_level FROM reports WHERE test_name LIKE ?"
    params: list = [f"%{test_name.lower()}%"]
    if session_id:
        query += " AND session_id = ?"
        params.append(session_id)
    query += " ORDER BY report_date ASC"
    rows = con.execute(query, params).fetchall()
    con.close()
    return [{"date": r[0], "value": r[1], "unit": r[2], "risk": r[3]} for r in rows]


def detect_trend(history: list[dict]) -> str:
    if len(history) < 2:
        return ""
    first, last = history[0]["value"], history[-1]["value"]
    pct = (last - first) / first * 100 if first else 0
    if pct > 10:
        return f"📈 Trending UP by {pct:.1f}% since {history[0]['date']}"
    elif pct < -10:
        return f"📉 Trending DOWN by {abs(pct):.1f}% since {history[0]['date']}"
    return f"➡️ Stable across {len(history)} report(s)"


def save_chat(session_id: str, role: str, content: str):
    con = sqlite3.connect(HISTORY_DB)
    con.execute(
        "INSERT INTO chat_history (session_id,role,content) VALUES (?,?,?)",
        (session_id, role, content),
    )
    con.commit()
    con.close()


def get_chat_history(session_id: str, limit: int = 8) -> list[dict]:
    con = sqlite3.connect(HISTORY_DB)
    rows = con.execute(
        "SELECT role,content FROM chat_history WHERE session_id=? ORDER BY id DESC LIMIT ?",
        (session_id, limit),
    ).fetchall()
    con.close()
    return [{"role": r[0], "content": r[1]} for r in reversed(rows)]


# ─────────────────────────────────────────────────────────────────────────────
# GROQ LLM CLIENT
# ─────────────────────────────────────────────────────────────────────────────

class GroqClient:
    def __init__(self):
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not set in environment")
        self.client = Groq(api_key=GROQ_API_KEY)
        self.model = self._find_working_model()

    def _find_working_model(self) -> str:
        candidates = [
            "llama-3.1-8b-instant",
            "llama3-8b-8192",
            "mixtral-8x7b-32768",
        ]
        for model in candidates:
            try:
                self.client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": "hi"}],
                    max_tokens=5,
                )
                logger.info(f"Using Groq model: {model}")
                return model
            except Exception as e:
                logger.warning(f"Model {model} not available: {e}")
        raise RuntimeError("No Groq models available. Check your API key and quota.")

    def chat(
        self,
        messages: list[dict],
        max_tokens: int = 800,
        temperature: float = 0.6,
    ) -> str:
        full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
        response = self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content.strip()


# ─────────────────────────────────────────────────────────────────────────────
# INTENT DETECTION  (lightweight — LLM handles the hard cases)
# ─────────────────────────────────────────────────────────────────────────────

def detect_intent(query: str, parsed_data: dict) -> dict:
    """
    Fast-path for unambiguous structural intents only.
    Everything else goes to build_smart_response() so the LLM can reason
    freely over the full report + KB.
    """
    ql = query.lower()

    if any(k in ql for k in ["summary", "summarize", "overview", "all results", "full report"]):
        return {"type": "SUMMARY"}

    if any(k in ql for k in ["trend", "over time", "previous report", "compare", "history"]):
        return {"type": "TREND"}

    # Everything else — let the LLM handle it with full context
    return {"type": "SMART_GENERAL"}


# ─────────────────────────────────────────────────────────────────────────────
# CONTEXT BUILDER  (shared by all response builders)
# ─────────────────────────────────────────────────────────────────────────────

def build_full_report_context(
    parsed_data: dict,
    kb: "KnowledgeBase",
) -> tuple[list[str], list[str]]:
    """
    Returns (report_lines, risk_flags) for every test in the uploaded report.
    Each line is self-contained: value + reference + risk + inline KB advice.
    """
    report_lines: list[str] = []
    risk_flags: list[str] = []

    for test_name, d in parsed_data.items():
        kb_info = kb.get_test(test_name)
        ref_low = d.get("reference_low")
        ref_high = d.get("reference_high")

        # Fill missing ref ranges from KB
        if kb_info and (ref_low is None or ref_high is None):
            kb_ref = kb_info.get("reference_ranges", {}).get("default", {})
            ref_low = ref_low or kb_ref.get("low")
            ref_high = ref_high or kb_ref.get("high")

        risk = classify_risk(test_name, d["value"], ref_low, ref_high)
        full_name = kb_info["full_name"] if kb_info else test_name.title()

        # Inline KB advice (causes + diet) only for abnormal values
        kb_snippet = ""
        if kb_info and risk["status"] in ("low", "high"):
            causes = kb_info.get(f"{risk['status']}_causes", [])[:3]
            diet   = kb_info.get("diet_advice", {}).get(risk["status"], [])[:2]
            source = kb_info.get("sources", [""])[0]
            if causes:
                kb_snippet += f" | Causes: {', '.join(causes)}"
            if diet:
                kb_snippet += f" | Diet: {', '.join(diet)}"
            if source:
                kb_snippet += f" | Source: {source}"

        report_lines.append(
            f"- {full_name}: {d['value']} {d.get('unit', '')} "
            f"(ref: {ref_low}–{ref_high}) → {risk['level'].upper()} [{risk['status']}]"
            f"{kb_snippet}"
        )

        if risk["level"] not in ("Normal", "Unknown"):
            risk_flags.append(
                f"{full_name}: {d['value']} {d.get('unit','')} → {risk['level']} "
                f"({risk['status']}) — {risk['alert']}"
            )

    return report_lines, risk_flags


# ─────────────────────────────────────────────────────────────────────────────
# RESPONSE BUILDERS
# ─────────────────────────────────────────────────────────────────────────────

def build_smart_response(
    query: str,
    parsed_data: dict,
    patient_info: dict,
    kb: "KnowledgeBase",
    groq: GroqClient,
    chat_history: list,
    session_id: str,
) -> dict:
    """
    Universal LLM-powered handler.

    Injects the FULL report + relevant KB articles into every call so the LLM
    can answer ANY natural-language question without predefined patterns:
      - "Am I healthy?"
      - "Should I worry about my kidneys?"
      - "What should I eat?"
      - "Explain my glucose"
      - "Is my thyroid OK?"
      - "What does high creatinine mean for me?"
    """

    # ── 1. Full report context with inline KB advice ──────────────────────────
    report_lines, risk_flags = build_full_report_context(parsed_data, kb)

    # ── 2. Trend data for every abnormal test ─────────────────────────────────
    trend_lines: list[str] = []
    for test_name in parsed_data:
        history = get_test_history(test_name, session_id)
        trend = detect_trend(history)
        if trend:
            trend_lines.append(f"  {test_name.title()}: {trend}")

    # ── 3. KB articles matching the query keywords ────────────────────────────
    kb_articles = kb.search_kb_for_query(query)

    # ── 4. Conversation history ───────────────────────────────────────────────
    history_text = "\n".join(
        f"  {m['role'].title()}: {m['content'][:300]}" for m in chat_history[-6:]
    ) or "[Start of conversation]"

    # ── 5. Patient info header ────────────────────────────────────────────────
    patient_str = ""
    if patient_info:
        patient_str = (
            f"Patient: {patient_info.get('name', 'Unknown')}, "
            f"Age: {patient_info.get('age', '?')}, "
            f"Gender: {patient_info.get('gender', '?')}"
        )

    # ── 6. Assemble prompt ────────────────────────────────────────────────────
    report_block  = "\n".join(report_lines)  if report_lines  else "No report uploaded yet."
    flags_block   = "\n".join(risk_flags)    if risk_flags    else "None — all values are within normal range."
    trends_block  = "\n".join(trend_lines)   if trend_lines   else "No historical trend data available."
    kb_block      = "\n\n---\n\n".join(kb_articles) if kb_articles else "No additional KB articles matched this query."

    prompt = f"""
{"PATIENT INFO: " + patient_str if patient_str else ""}

══ FULL REPORT DATA (every test from the uploaded PDF) ══
{report_block}

══ ABNORMAL FLAGS ══
{flags_block}

══ HISTORICAL TRENDS ══
{trends_block}

══ MEDICAL KNOWLEDGE BASE (articles relevant to this question) ══
{kb_block}

══ CONVERSATION HISTORY ══
{history_text}

══ USER QUESTION ══
"{query}"

══ INSTRUCTIONS ══
You have the patient's complete lab report above. Use it to answer the question directly.

- For specific test questions ("what does my glucose mean?") → find that test in the report, state its value, reference range, risk level, causes, and advice.
- For general health questions ("am I healthy?", "what should I worry about?") → use the ABNORMAL FLAGS section to summarise concerns and reassure about normal values.
- For lifestyle/diet questions → pull from the inline KB diet advice in the report lines.
- For trend questions → use the HISTORICAL TRENDS section.
- For disease/condition questions → use the KB articles provided.
- If something is genuinely not in the data, say: "I don't have enough information on that — please consult your doctor."
- Always cite the KB source when referencing medical knowledge (e.g. "According to MedlinePlus...").
- Always end with: "Please consult your doctor for personalized advice."
- Be warm, clear, and concise (under 300 words unless a full summary is requested).
"""

    answer = groq.chat([{"role": "user", "content": prompt}], max_tokens=900)
    return {
        "answer": answer,
        "source": "report+knowledge_base",
        "risk_flags": risk_flags,
        "trends": trend_lines,
    }


def build_summary_response(
    parsed_data: dict,
    kb: "KnowledgeBase",
    groq: GroqClient,
    patient_info: dict,
) -> dict:
    """Dedicated full-report summary with structured findings table."""
    if not parsed_data:
        return {"answer": "No report data found. Please upload a lab report PDF first.", "risk_flags": []}

    findings = []
    risk_flags_structured = []

    for test_name, d in parsed_data.items():
        kb_info = kb.get_test(test_name)
        ref_low = d.get("reference_low")
        ref_high = d.get("reference_high")

        if kb_info and (ref_low is None or ref_high is None):
            kb_ref = kb_info.get("reference_ranges", {}).get("default", {})
            ref_low = ref_low or kb_ref.get("low")
            ref_high = ref_high or kb_ref.get("high")

        risk = classify_risk(test_name, d["value"], ref_low, ref_high)
        full_name = kb_info["full_name"] if kb_info else test_name.title()

        findings.append({
            "test": full_name,
            "value": d["value"],
            "unit": d.get("unit", ""),
            "ref_range": f"{ref_low}–{ref_high}" if ref_low and ref_high else "N/A",
            "risk_level": risk["level"],
            "alert": risk["alert"],
            "status": risk["status"],
        })

        if risk["level"] not in ("Normal", "Unknown"):
            risk_flags_structured.append({
                "test": full_name,
                "risk_level": risk["level"],
                "alert": risk["alert"],
            })

    normal_count = sum(1 for f in findings if f["risk_level"] == "Normal")
    abnormal = [f for f in findings if f["risk_level"] not in ("Normal", "Unknown")]

    patient_str = ""
    if patient_info:
        patient_str = f"Patient: {patient_info.get('name','Unknown')}, Age: {patient_info.get('age','?')}, Gender: {patient_info.get('gender','?')}"

    context_lines = [
        f"REPORT SUMMARY: {len(findings)} tests found",
        f"Normal: {normal_count} | Needs attention: {len(abnormal)}",
    ]
    if patient_str:
        context_lines.append(patient_str)
    if abnormal:
        context_lines.append("\nABNORMAL FINDINGS:")
        for f in abnormal:
            context_lines.append(
                f"- {f['test']}: {f['value']} {f['unit']} (ref: {f['ref_range']}) — {f['risk_level']} — {f['alert']}"
            )
    normal_tests = [f["test"] for f in findings if f["risk_level"] == "Normal"]
    if normal_tests:
        context_lines.append(f"\nNORMAL: {', '.join(normal_tests)}")

    prompt = f"""
Medical Report Data:
{chr(10).join(context_lines)}

Please provide a warm, plain-language summary of this patient's report.
Highlight key concerns, reassure about normal values, and give practical next steps.
Keep under 250 words.
"""
    narrative = groq.chat([{"role": "user", "content": prompt}], max_tokens=600)

    return {
        "answer": narrative,
        "findings": findings,
        "risk_flags": risk_flags_structured,
        "patient_info": patient_info,
        "tests_analyzed": len(findings),
        "normal_count": normal_count,
        "abnormal_count": len(abnormal),
    }


def build_trend_response(parsed_data: dict, session_id: str) -> dict:
    """Show historical trends across uploaded reports."""
    if not parsed_data:
        return {"answer": "No report loaded. Upload a lab report to see trends.", "trends": []}

    trends = []
    for test_name in parsed_data:
        history = get_test_history(test_name, session_id)
        if len(history) >= 2:
            trend_str = detect_trend(history)
            entries = [
                {"date": h["date"], "value": h["value"], "unit": h["unit"]}
                for h in history[-5:]
            ]
            trends.append({"test": test_name.title(), "trend": trend_str, "history": entries})

    if not trends:
        answer = "Only one report in history. Upload more reports over time to track trends in your values."
    else:
        lines = ["Here are the trends found in your historical reports:\n"]
        for t in trends:
            lines.append(f"**{t['test']}**: {t['trend']}")
            for e in t["history"]:
                lines.append(f"  • {e['date']}: {e['value']} {e['unit']}")
        answer = "\n".join(lines)

    return {"answer": answer, "trends": trends}


