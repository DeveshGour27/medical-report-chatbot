"""
RAG API - Enhanced with Long-Term Memory, Health Profile, Timeline, and PDF Generation
========================================================================================
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import os
import json
import logging

from rag_pipeline6_wrapper import medical_chatbot, report_parser
from memory_engine import (
    init_memory_db,
    add_chat_to_memory,
    add_report_to_memory,
    retrieve_relevant_memory,
    get_user_chat_history,
    get_user_medical_timeline,
    get_all_user_insights,
    save_health_profile,
    get_health_profile,
    build_memory_context_for_prompt,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="MedReport RAG API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize memory database on startup
try:
    init_memory_db()
    logger.info("✓ Memory DB initialized")
except Exception as e:
    logger.error(f"Failed to init memory DB: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# PYDANTIC MODELS
# ─────────────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    extractedData: Optional[dict] = {}
    rawText: Optional[str] = ""
    userId: Optional[str] = "anonymous"
    reportId: Optional[str] = None
    reportDate: Optional[str] = None

class SaveReportRequest(BaseModel):
    id: Optional[str] = None
    userId: Optional[str] = "anonymous"
    reportDate: Optional[str] = None
    extractedData: Optional[dict] = {}
    rawText: Optional[str] = ""

class HealthProfileRequest(BaseModel):
    userId: str
    userInfo: Optional[dict] = {}

class PDFRequest(BaseModel):
    userId: str
    userInfo: Optional[dict] = {}
    aiSummary: Optional[str] = ""

saved_reports = {}  # in-memory fallback


# ─────────────────────────────────────────────────────────────────────────────
# EXTRACT REPORT
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/extract_report")
async def extract_report(file: UploadFile = File(...)):
    try:
        logger.info(f"\n[RAG API] Extracting report: {file.filename}")
        contents = await file.read()
        pdf_path = f"temp_{file.filename}"
        
        with open(pdf_path, "wb") as f:
            f.write(contents)

        parsed = report_parser.extract_from_pdf(pdf_path)
        raw_text = report_parser.raw_text
        
        os.remove(pdf_path)
        
        if not parsed or len(parsed) == 0:
            logger.warning("[RAG API] No structured data extracted. Returning raw text for LLM.")
            return {
                "status": "partial",
                "extractedData": {"0": {}},
                "rawText": raw_text or ""
            }
        
        inner = {}
        try:
            from rag_pipeline6 import classify_risk
            from rag_pipeline6_wrapper import kb
        except ImportError:
            classify_risk = None
            kb = None

        for test_name, test_data in parsed.items():
            val = test_data.get('value')
            ref_low = test_data.get('reference_low')
            ref_high = test_data.get('reference_high')
            
            # Fill missing references from KB if possible
            if kb and (ref_low is None or ref_high is None):
                kb_info = kb.get_test(test_name)
                if kb_info:
                    kb_ref = kb_info.get("reference_ranges", {}).get("default", {})
                    ref_low = ref_low if ref_low is not None else kb_ref.get("low")
                    ref_high = ref_high if ref_high is not None else kb_ref.get("high")
            
            risk = "Unknown"
            if classify_risk:
                risk_obj = classify_risk(test_name, val, ref_low, ref_high)
                risk = risk_obj.get("level", "Unknown")

            inner[test_name] = {
                "value": val,
                "unit": test_data.get('unit', ''),
                "reference_low": ref_low,
                "reference_high": ref_high,
                "risk_level": risk
            }
        
        logger.info(f"[RAG API] ✓ Successfully extracted {len(inner)} tests")
        return {
            "status": "success",
            "extractedData": {"0": inner},
            "rawText": raw_text or ""
        }
    except Exception as e:
        logger.error(f"[RAG API] Error extracting report: {str(e)}")
        return {"status": "error", "extractedData": {"0": {}}, "rawText": "", "error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# SAVE REPORT (also stores in memory)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/save_report")
async def save_report(data: SaveReportRequest):
    rid = data.id or "unknown"
    user_id = data.userId or "anonymous"
    
    saved_reports[rid] = data.dict()
    
    # Store report data in memory engine for future context
    if data.extractedData:
        extracted_flat = data.extractedData.get("0", data.extractedData)
        if extracted_flat and len(extracted_flat) > 0:
            try:
                add_report_to_memory(
                    user_id=user_id,
                    report_id=rid,
                    report_date=data.reportDate or "",
                    extracted_data=extracted_flat,
                    raw_text=data.rawText or ""
                )
                logger.info(f"✓ Added report {rid} to memory for user {user_id}")
                
                # Automatically update health profile in background
                try:
                    await generate_health_profile(HealthProfileRequest(userId=user_id))
                    logger.info(f"✓ Auto-updated health profile for user {user_id}")
                except Exception as hp_err:
                    logger.error(f"Auto health profile generation failed: {hp_err}")
                
            except Exception as e:
                logger.warning(f"Memory save for report failed (non-critical): {e}")
    
    return {"status": "saved", "id": rid}

# ─────────────────────────────────────────────────────────────────────────────
# CHAT WITH REPORT (memory-augmented)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/chat_with_report")
def chat_with_report(payload: ChatRequest):
    logger.info("\n------ NEW MEMORY-AUGMENTED CHAT REQUEST ------")
    
    question = payload.question.lower() if payload.question else ""
    extracted_data = payload.extractedData or {}
    raw_text = payload.rawText or ""
    user_id = payload.userId or "anonymous"
    report_id = payload.reportId

    if not extracted_data and not raw_text:
        logger.warning("No data in payload")
        return {"answer": "No medical data was provided for this report."}

    # Save user message to persistent memory
    try:
        add_chat_to_memory(
            user_id=user_id,
            role="user",
            content=payload.question,
            report_id=report_id,
            topic="medical_chat"
        )
    except Exception as e:
        logger.warning(f"Chat memory save failed (non-critical): {e}")

    # Retrieve relevant past memory context
    memory_context = ""
    try:
        memory_context = build_memory_context_for_prompt(user_id, payload.question)
    except Exception as e:
        logger.warning(f"Memory retrieval failed (non-critical): {e}")

    # ── Handle extracted data ──
    extracted_block = extracted_data.get("0") if extracted_data else None
    if not extracted_block and extracted_data:
        first_val = list(extracted_data.values())[0] if extracted_data else None
        if isinstance(first_val, dict) and 'value' in first_val:
            extracted_block = extracted_data
        elif isinstance(first_val, dict):
            extracted_block = first_val

    answer = None

    if extracted_block and len(extracted_block) > 0:
        logger.info(f"✔ Using structured data: {len(extracted_block)} tests found")
        
        parsed_data_for_llm = {}
        for test_name, test_data in extracted_block.items():
            try:
                value = test_data.get('value')
                ref_low = test_data.get('reference_low')
                ref_high = test_data.get('reference_high')
                
                if value is not None and value != '':
                    value = float(value) if not isinstance(value, (int, float)) else value
                else:
                    value = None
                    
                if ref_low is not None and ref_low != '':
                    ref_low = float(ref_low) if not isinstance(ref_low, (int, float)) else ref_low
                else:
                    ref_low = None
                    
                if ref_high is not None and ref_high != '':
                    ref_high = float(ref_high) if not isinstance(ref_high, (int, float)) else ref_high
                else:
                    ref_high = None
                
                parsed_data_for_llm[test_name] = {
                    "value": value,
                    "unit": test_data.get('unit', ''),
                    "reference_low": ref_low,
                    "reference_high": ref_high
                }
            except (ValueError, TypeError) as e:
                logger.warning(f"Could not convert values for {test_name}: {e}")
                continue
        
        if parsed_data_for_llm:
            # Build full prompt with memory context prepended
            full_question = payload.question
            if memory_context:
                full_question = f"{memory_context}\n\n{payload.question}"
            
            # Fetch recent chat history
            recent_chats = get_user_chat_history(user_id, limit=6)
            
            answer = medical_chatbot(
                full_prompt=full_question,
                parsed_data=parsed_data_for_llm,
                session_id=user_id,
                chat_history=recent_chats
            )

    if answer is None and raw_text:
        logger.info("⚠️ No structured data, using raw PDF text as context")
        memory_prefix = f"{memory_context}\n\n" if memory_context else ""
        full_prompt = f"""{memory_prefix}You are a medical AI assistant helping a patient understand their medical report.
Here is the raw text from the patient's uploaded medical report:
---
{raw_text[:3000]}
---
Patient Question: "{payload.question}"
Please answer based on the report text above. Be clear, empathetic and helpful."""
        answer = medical_chatbot(full_prompt)

    if answer is None:
        answer = "I could not read any data from your medical report. Please try re-uploading the PDF."

    # Save AI response to persistent memory
    try:
        add_chat_to_memory(
            user_id=user_id,
            role="assistant",
            content=answer,
            report_id=report_id,
            topic="medical_chat"
        )
    except Exception as e:
        logger.warning(f"AI response memory save failed (non-critical): {e}")

    logger.info(f"AI Answer: {answer[:200] if answer else 'No answer'}")
    return {"answer": answer}


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH PROFILE GENERATION
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/generate_health_profile")
async def generate_health_profile(request: HealthProfileRequest):
    """
    AI-generates a comprehensive health profile based on all user data.
    Called after each report upload or on-demand.
    """
    user_id = request.userId
    
    # Get all insights
    insights = get_all_user_insights(user_id)
    lab_tests = insights.get("lab_tests", {})
    
    if not lab_tests:
        profile = {
            "chronic_conditions": [],
            "allergies": [],
            "current_medications": [],
            "previous_diagnoses": [],
            "risk_indicators": [],
            "recurring_symptoms": [],
            "health_summary": "No medical data available yet. Upload reports to build your health profile.",
            "lab_trends": {},
            "last_updated": "",
            "total_reports": 0,
            "total_tests_tracked": 0
        }
        return {"status": "empty", "profile": profile}
    
    # Build lab trends summary
    lab_trends = {}
    risk_indicators = []
    
    for test_name, history in lab_tests.items():
        if not history:
            continue
        
        latest = history[-1]
        risk = latest.get("risk_level", "Unknown")
        
        if risk in ("Critical", "Severe"):
            risk_indicators.append(f"{test_name.title()} - {risk} ({latest.get('value')} {latest.get('unit', '')})")
        
        if len(history) >= 2:
            try:
                first_v = float(history[0].get("value", 0))
                last_v = float(latest.get("value", 0))
                pct = (last_v - first_v) / first_v * 100 if first_v else 0
                trend = "increasing" if pct > 5 else ("decreasing" if pct < -5 else "stable")
            except:
                trend = "unknown"
        else:
            trend = "single_reading"
        
        lab_trends[test_name] = {
            "latest_value": latest.get("value"),
            "unit": latest.get("unit", ""),
            "risk_level": risk,
            "readings": len(history),
            "trend": trend
        }
    
    # Generate AI narrative summary if LLM is available
    ai_summary = ""
    try:
        from rag_pipeline6_wrapper import medical_chatbot
        
        test_summary = "\n".join([
            f"- {name.title()}: {info['latest_value']} {info['unit']} ({info['risk_level']}, trend: {info['trend']})"
            for name, info in list(lab_trends.items())[:15]
        ])
        
        summary_prompt = f"""Based on this patient's lab history, generate a concise health summary.

LAB TEST HISTORY:
{test_summary}

RISK INDICATORS: {', '.join(risk_indicators) if risk_indicators else 'None detected'}

Please provide:
1. A brief overall health summary (2-3 sentences)
2. Any chronic conditions suggested by patterns (be conservative, these are suggestions only)
3. Key health risks to monitor

Keep it empathetic and under 200 words. This is for the patient's health profile dashboard.
Always remind them to consult their doctor."""
        
        ai_summary = medical_chatbot(summary_prompt)
    except Exception as e:
        logger.warning(f"AI summary generation failed: {e}")
        ai_summary = f"You have {len(lab_tests)} tests tracked across {insights.get('total_reports', 0)} reports. {len(risk_indicators)} test(s) show abnormal values. Please consult your doctor for detailed analysis."
    
    profile = {
        "chronic_conditions": [],  # Populated by AI analysis over time
        "allergies": [],           # Can be manually added or extracted from reports
        "current_medications": [], # Can be manually added or extracted
        "previous_diagnoses": [],
        "risk_indicators": risk_indicators,
        "recurring_symptoms": [],
        "health_summary": ai_summary,
        "lab_trends": lab_trends,
        "last_updated": "",
        "total_reports": insights.get("total_reports", 0),
        "total_tests_tracked": len(lab_tests)
    }
    
    # Save to database
    try:
        save_health_profile(user_id, profile)
    except Exception as e:
        logger.warning(f"Failed to save health profile: {e}")
    
    return {"status": "success", "profile": profile}


# ─────────────────────────────────────────────────────────────────────────────
# GET HEALTH PROFILE
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health_profile/{user_id}")
def get_user_health_profile(user_id: str):
    """Get the saved health profile for a user."""
    result = get_health_profile(user_id)
    if result:
        return {"status": "found", **result}
    return {"status": "not_found", "profile": None}


# ─────────────────────────────────────────────────────────────────────────────
# GET TIMELINE
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/timeline/{user_id}")
def get_timeline(user_id: str):
    """Get chronological health timeline for a user."""
    try:
        timeline = get_user_medical_timeline(user_id)
        insights = get_all_user_insights(user_id)
        return {
            "status": "success",
            "timeline": timeline,
            "total_reports": insights.get("total_reports", 0),
            "total_tests": len(insights.get("lab_tests", {}))
        }
    except Exception as e:
        logger.error(f"Timeline fetch failed: {e}")
        return {"status": "error", "timeline": [], "error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# GET PERSISTENT CHAT HISTORY
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/chat_history/{user_id}")
def get_chat_history_endpoint(user_id: str, limit: int = 50):
    """Get persistent chat history for a user."""
    try:
        history = get_user_chat_history(user_id, limit=limit)
        return {"status": "success", "history": history, "count": len(history)}
    except Exception as e:
        logger.error(f"Chat history fetch failed: {e}")
        return {"status": "error", "history": [], "error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# GENERATE PDF
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/generate_pdf")
async def generate_pdf_report(request: PDFRequest):
    """
    Generate and return a PDF medical history report for download.
    """
    user_id = request.userId
    user_info = request.userInfo or {}
    
    try:
        from pdf_generator import generate_medical_pdf
        
        # Gather all data
        profile_result = get_health_profile(user_id)
        health_profile = profile_result.get("profile", {}) if profile_result else {}
        
        timeline = get_user_medical_timeline(user_id)
        insights = get_all_user_insights(user_id)
        
        ai_summary = request.aiSummary or health_profile.get("health_summary", "")
        
        pdf_bytes = generate_medical_pdf(
            user_info=user_info,
            health_profile=health_profile,
            timeline=timeline,
            lab_insights=insights,
            ai_summary=ai_summary
        )
        
        username = user_info.get("username", "patient").replace(" ", "_")
        filename = f"MedReport_{username}_{__import__('datetime').datetime.now().strftime('%Y%m%d')}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except ImportError as e:
        raise HTTPException(status_code=503, detail=f"PDF generation unavailable: {str(e)}")
    except Exception as e:
        logger.error(f"PDF generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# DELETE REPORT
# ─────────────────────────────────────────────────────────────────────────────

@app.delete("/delete_report/{report_id}")
def delete_report(report_id: str):
    if report_id in saved_reports:
        del saved_reports[report_id]
        return {"message": f"Report {report_id} deleted"}
    return {"error": "Report not found"}


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "3.0.0", "memory": "enabled"}
