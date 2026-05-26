"""
Medical Memory Engine
=====================
Provides semantic long-term memory for the medical chatbot using:
  - ChromaDB (local persistent vector database) — no external service needed
  - sentence-transformers (HuggingFace, runs fully offline/locally)
  - SQLite for structured medical data (reports, diagnoses, medications)

Designed to be deployment-safe on Render (no paid services required).
"""

import os
import json
import sqlite3
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent
CHROMA_DIR = BASE_DIR / "medical_db" / "chroma_store"
MEDICAL_DB_PATH = BASE_DIR / "medical_history.db"

# ─────────────────────────────────────────────────────────────────────────────
# CHROMADB + EMBEDDINGS (lazy-loaded for fast startup)
# ─────────────────────────────────────────────────────────────────────────────

_chroma_client = None
_embedding_fn = None


def _get_embedding_fn():
    """Load HuggingFace embedding model once (lazy)."""
    global _embedding_fn
    if _embedding_fn is None:
        try:
            from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
            _embedding_fn = SentenceTransformerEmbeddingFunction(
                model_name="all-MiniLM-L6-v2"  # Small, fast, deployment-safe
            )
            logger.info("✓ Loaded sentence-transformer embedding model (all-MiniLM-L6-v2)")
        except Exception as e:
            logger.warning(f"Could not load embedding model: {e}. Using default.")
            _embedding_fn = None
    return _embedding_fn


def _get_chroma_client():
    """Get or create ChromaDB persistent client (lazy)."""
    global _chroma_client
    if _chroma_client is None:
        try:
            import chromadb
            CHROMA_DIR.mkdir(parents=True, exist_ok=True)
            _chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
            logger.info(f"✓ ChromaDB initialized at {CHROMA_DIR}")
        except Exception as e:
            logger.error(f"Failed to init ChromaDB: {e}")
            _chroma_client = None
    return _chroma_client


def _get_collection(user_id: str):
    """Get or create a ChromaDB collection for a specific user."""
    client = _get_chroma_client()
    if client is None:
        return None
    try:
        ef = _get_embedding_fn()
        col_name = f"user_{user_id.replace('-', '_')}"[:63]  # ChromaDB name limit
        if ef:
            collection = client.get_or_create_collection(name=col_name, embedding_function=ef)
        else:
            collection = client.get_or_create_collection(name=col_name)
        return collection
    except Exception as e:
        logger.error(f"Failed to get/create collection for {user_id}: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# EXTENDED SQLITE SCHEMA
# ─────────────────────────────────────────────────────────────────────────────

def init_memory_db():
    """Initialize extended SQLite schema for long-term medical memory."""
    con = sqlite3.connect(MEDICAL_DB_PATH)
    
    # Extended chat history with user_id
    con.execute("""
        CREATE TABLE IF NOT EXISTS persistent_chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            report_id TEXT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            topic TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    
    # Medical insights extracted from reports
    con.execute("""
        CREATE TABLE IF NOT EXISTS medical_insights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            report_id TEXT,
            report_date TEXT,
            category TEXT,
            insight_type TEXT,
            key TEXT,
            value TEXT,
            unit TEXT,
            risk_level TEXT,
            source TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    
    # Health profile (auto-updated)
    con.execute("""
        CREATE TABLE IF NOT EXISTS health_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            profile_json TEXT,
            last_updated TEXT DEFAULT (datetime('now'))
        )
    """)
    
    con.commit()
    con.close()
    logger.info("✓ Memory DB initialized (extended schema)")


# ─────────────────────────────────────────────────────────────────────────────
# CORE MEMORY OPERATIONS
# ─────────────────────────────────────────────────────────────────────────────

def add_chat_to_memory(user_id: str, role: str, content: str,
                       report_id: str = None, topic: str = None):
    """
    Persist a chat message to both SQLite (structured) and ChromaDB (semantic).
    This is called after every chat message.
    """
    # 1. Save to SQLite
    try:
        con = sqlite3.connect(MEDICAL_DB_PATH)
        con.execute(
            "INSERT INTO persistent_chats (user_id, report_id, role, content, topic) VALUES (?,?,?,?,?)",
            (user_id, report_id, role, content, topic)
        )
        con.commit()
        msg_id = con.execute("SELECT last_insert_rowid()").fetchone()[0]
        con.close()
    except Exception as e:
        logger.error(f"SQLite chat save failed: {e}")
        msg_id = None

    # 2. Add to ChromaDB for semantic search (only meaningful content, skip short)
    if role == "assistant" and len(content) > 50:
        try:
            collection = _get_collection(user_id)
            if collection:
                doc_id = f"chat_{user_id}_{msg_id or datetime.now().timestamp()}"
                collection.upsert(
                    ids=[doc_id],
                    documents=[content[:2000]],
                    metadatas=[{
                        "user_id": user_id,
                        "type": "chat",
                        "role": role,
                        "report_id": report_id or "",
                        "topic": topic or "",
                        "created_at": datetime.now().isoformat()
                    }]
                )
        except Exception as e:
            logger.warning(f"ChromaDB chat add failed (non-critical): {e}")


def add_report_to_memory(user_id: str, report_id: str, report_date: str,
                          extracted_data: dict, raw_text: str = ""):
    """
    Store extracted medical report data in memory for future reference.
    Called after every successful report extraction.
    """
    # Save structured insights to SQLite
    try:
        con = sqlite3.connect(MEDICAL_DB_PATH)
        for test_name, data in extracted_data.items():
            con.execute("""
                INSERT INTO medical_insights
                (user_id, report_id, report_date, category, insight_type, key, value, unit, risk_level, source)
                VALUES (?,?,?,?,?,?,?,?,?,?)
            """, (
                user_id, report_id, report_date,
                "lab_test", "test_result",
                test_name,
                str(data.get("value", "")),
                data.get("unit", ""),
                data.get("risk_level", "Unknown"),
                "pdf_extraction"
            ))
        con.commit()
        con.close()
    except Exception as e:
        logger.error(f"SQLite insight save failed: {e}")

    # Add raw text summary to ChromaDB for semantic search
    if raw_text and len(raw_text) > 100:
        try:
            collection = _get_collection(user_id)
            if collection:
                doc_id = f"report_{user_id}_{report_id}"
                # Chunk raw text if too long
                chunk = raw_text[:3000]
                collection.upsert(
                    ids=[doc_id],
                    documents=[chunk],
                    metadatas=[{
                        "user_id": user_id,
                        "type": "report",
                        "report_id": report_id,
                        "report_date": report_date,
                        "created_at": datetime.now().isoformat()
                    }]
                )
        except Exception as e:
            logger.warning(f"ChromaDB report add failed (non-critical): {e}")


def delete_report_from_memory(user_id: str, report_id: str):
    """Delete all insights and chats related to a specific report."""
    try:
        con = sqlite3.connect(MEDICAL_DB_PATH)
        con.execute("DELETE FROM medical_insights WHERE user_id = ? AND report_id = ?", (user_id, report_id))
        con.execute("DELETE FROM persistent_chats WHERE user_id = ? AND report_id = ?", (user_id, report_id))
        con.commit()
        con.close()
        
        # We should also update the health profile to remove any old data
        con = sqlite3.connect(MEDICAL_DB_PATH)
        con.execute("DELETE FROM health_profiles WHERE user_id = ?", (user_id,))
        con.commit()
        con.close()
        logger.info(f"Deleted memory for report {report_id}")
    except Exception as e:
        logger.error(f"Failed to delete report memory: {e}")

def delete_user_memory(user_id: str):
    """Delete all memory (insights, chats, profiles) for a user."""
    try:
        con = sqlite3.connect(MEDICAL_DB_PATH)
        con.execute("DELETE FROM medical_insights WHERE user_id = ?", (user_id,))
        con.execute("DELETE FROM persistent_chats WHERE user_id = ?", (user_id,))
        con.execute("DELETE FROM health_profiles WHERE user_id = ?", (user_id,))
        con.commit()
        con.close()
        logger.info(f"Deleted all memory for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to delete user memory: {e}")

def retrieve_relevant_memory(user_id: str, query: str, n_results: int = 5) -> list[dict]:
    """
    Retrieve semantically relevant past context for a user's query.
    Returns list of relevant memory chunks with metadata.
    """
    results = []
    try:
        collection = _get_collection(user_id)
        if collection and collection.count() > 0:
            query_results = collection.query(
                query_texts=[query[:500]],
                n_results=min(n_results, collection.count()),
                include=["documents", "metadatas", "distances"]
            )
            docs = query_results.get("documents", [[]])[0]
            metas = query_results.get("metadatas", [[]])[0]
            distances = query_results.get("distances", [[]])[0]
            
            for doc, meta, dist in zip(docs, metas, distances):
                # Only include reasonably relevant results (distance < 1.5)
                if dist < 1.5:
                    results.append({
                        "content": doc,
                        "type": meta.get("type", "unknown"),
                        "report_id": meta.get("report_id", ""),
                        "created_at": meta.get("created_at", ""),
                        "relevance": round(1 - dist / 2, 2)
                    })
    except Exception as e:
        logger.warning(f"ChromaDB retrieval failed (non-critical): {e}")
    
    return results


def get_user_chat_history(user_id: str, limit: int = 20) -> list[dict]:
    """Get recent persistent chat history for a user from SQLite."""
    try:
        con = sqlite3.connect(MEDICAL_DB_PATH)
        rows = con.execute("""
            SELECT role, content, report_id, topic, created_at
            FROM persistent_chats
            WHERE user_id = ?
            ORDER BY id DESC LIMIT ?
        """, (user_id, limit)).fetchall()
        con.close()
        return [
            {"role": r[0], "content": r[1], "report_id": r[2],
             "topic": r[3], "created_at": r[4]}
            for r in reversed(rows)
        ]
    except Exception as e:
        logger.error(f"Failed to get chat history: {e}")
        return []


def get_user_medical_timeline(user_id: str) -> list[dict]:
    """Get chronological medical timeline for a user (reports + insights)."""
    timeline = []
    try:
        con = sqlite3.connect(MEDICAL_DB_PATH)
        
        # Get all insights grouped by report
        rows = con.execute("""
            SELECT report_id, report_date, insight_type, key, value, unit, risk_level, created_at
            FROM medical_insights
            WHERE user_id = ?
            ORDER BY created_at ASC
        """, (user_id,)).fetchall()
        
        # Group by report_id
        report_map = {}
        for row in rows:
            rid = row[0]
            if rid not in report_map:
                report_map[rid] = {
                    "report_id": rid,
                    "report_date": row[1],
                    "created_at": row[7],
                    "type": "report",
                    "tests": []
                }
            report_map[rid]["tests"].append({
                "name": row[3],
                "value": row[4],
                "unit": row[5],
                "risk_level": row[6]
            })
        
        timeline = list(report_map.values())
        
        # Add chat summary events
        chat_rows = con.execute("""
            SELECT report_id, topic, created_at, COUNT(*) as msg_count
            FROM persistent_chats
            WHERE user_id = ? AND role = 'user'
            GROUP BY report_id, DATE(created_at)
            ORDER BY created_at ASC
        """, (user_id,)).fetchall()
        
        for row in chat_rows:
            timeline.append({
                "type": "chat_session",
                "report_id": row[0],
                "topic": row[1],
                "created_at": row[2],
                "message_count": row[3]
            })
        
        con.close()
        
        # Sort all by date
        timeline.sort(key=lambda x: x.get("created_at", ""))
        
    except Exception as e:
        logger.error(f"Failed to get timeline: {e}")
    
    return timeline


def get_all_user_insights(user_id: str) -> dict:
    """Get all structured medical insights for health profile generation."""
    insights = {
        "lab_tests": {},
        "medications": [],
        "diagnoses": [],
        "allergies": [],
        "total_reports": 0
    }
    try:
        con = sqlite3.connect(MEDICAL_DB_PATH)
        
        # Get all test results, grouped by test name
        rows = con.execute("""
            SELECT key, value, unit, risk_level, report_date, report_id
            FROM medical_insights
            WHERE user_id = ? AND insight_type = 'test_result'
            ORDER BY report_date ASC
        """, (user_id,)).fetchall()
        
        for row in rows:
            test_name = row[0]
            if test_name not in insights["lab_tests"]:
                insights["lab_tests"][test_name] = []
            insights["lab_tests"][test_name].append({
                "value": row[1],
                "unit": row[2],
                "risk_level": row[3],
                "date": row[4],
                "report_id": row[5]
            })
        
        # Count unique reports
        count = con.execute(
            "SELECT COUNT(DISTINCT report_id) FROM medical_insights WHERE user_id = ?",
            (user_id,)
        ).fetchone()[0]
        insights["total_reports"] = count
        
        con.close()
    except Exception as e:
        logger.error(f"Failed to get insights: {e}")
    
    return insights


def save_health_profile(user_id: str, profile: dict):
    """Save the AI-generated health profile to database."""
    try:
        con = sqlite3.connect(MEDICAL_DB_PATH)
        con.execute("""
            INSERT INTO health_profiles (user_id, profile_json, last_updated)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(user_id) DO UPDATE SET
                profile_json = excluded.profile_json,
                last_updated = excluded.last_updated
        """, (user_id, json.dumps(profile)))
        con.commit()
        con.close()
        logger.info(f"✓ Saved health profile for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to save health profile: {e}")


def get_health_profile(user_id: str) -> Optional[dict]:
    """Get the saved health profile for a user."""
    try:
        con = sqlite3.connect(MEDICAL_DB_PATH)
        row = con.execute(
            "SELECT profile_json, last_updated FROM health_profiles WHERE user_id = ?",
            (user_id,)
        ).fetchone()
        con.close()
        if row:
            return {"profile": json.loads(row[0]), "last_updated": row[1]}
    except Exception as e:
        logger.error(f"Failed to get health profile: {e}")
    return None


def build_memory_context_for_prompt(user_id: str, query: str) -> str:
    """
    Build a text block of relevant past memory to inject into the LLM prompt.
    Combines semantic search results + recent chat summary.
    """
    parts = []
    
    # 1. Semantic memory retrieval
    relevant = retrieve_relevant_memory(user_id, query, n_results=3)
    if relevant:
        parts.append("══ RELEVANT PAST MEDICAL HISTORY (from memory) ══")
        for mem in relevant:
            mem_type = mem.get("type", "")
            content = mem.get("content", "")[:500]
            date = mem.get("created_at", "")[:10]
            if mem_type == "report":
                parts.append(f"[Past Report - {date}]: {content}")
            elif mem_type == "chat":
                parts.append(f"[Past AI Response - {date}]: {content}")
        parts.append("")
    
    # 2. Lab trend summary
    insights = get_all_user_insights(user_id)
    lab_tests = insights.get("lab_tests", {})
    if lab_tests:
        trend_parts = []
        for test_name, history in lab_tests.items():
            if len(history) >= 2:
                first_val = history[0].get("value", "?")
                last_val = history[-1].get("value", "?")
                last_date = history[-1].get("date", "?")
                trend_parts.append(
                    f"  • {test_name.title()}: {first_val} → {last_val} ({last_date})"
                )
        if trend_parts:
            parts.append("══ LAB VALUE TRENDS (all-time history) ══")
            parts.extend(trend_parts[:10])  # Cap to avoid token overflow
            parts.append("")
    
    return "\n".join(parts)
