"""
Wrapper to use rag_pipeline6 components with rag_api.py interface.
Provides:
  - MedicalReportParser: Extract from PDFs (text + images via OCR)
  - medical_chatbot: Generate chat responses with KB context
"""

import os
import json
import logging
import re
from pathlib import Path
from rag_pipeline6 import (
    MedicalReportParser,
    KnowledgeBase,
    GroqClient,
    build_smart_response,
    init_db,
    detect_intent,
)
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LegacyKBAdapter:
    """Adapter to read old medical_knowledge.json format and convert to new format on-the-fly"""
    def __init__(self, path: Path):
        with open(path, "r", encoding="utf-8") as f:
            self.data = json.load(f)
        self._convert_format()
    
    def _convert_format(self):
        """Convert medical_tests array to tests dict"""
        self.tests = {}
        self.diseases = {}
        
        # If already in new format, use as-is
        if "tests" in self.data:
            self.tests = self.data.get("tests", {})
            self.diseases = self.data.get("diseases", {})
            return
        
        # Convert from old format (medical_tests array)
        for test in self.data.get("medical_tests", []):
            test_name = test.get("test_name", "").lower().strip()
            if not test_name:
                continue
            
            # Extract numeric range from normal_ranges
            ranges = test.get("normal_ranges", {})
            ref_low, ref_high = None, None
            if ranges and isinstance(ranges, dict):
                for val in ranges.values():
                    nums = re.findall(r'\d+\.?\d*', str(val))
                    if len(nums) >= 2:
                        try:
                            ref_low = float(nums[0])
                            ref_high = float(nums[-1])
                            break
                        except:
                            pass
            
            self.tests[test_name] = {
                "full_name": test.get("test_name", test_name),
                "alternative_names": test.get("alternative_names", []),
                "description": test.get("what_it_measures", test.get("purpose", ""))[:600],
                "reference_ranges": {"default": {"low": ref_low, "high": ref_high}},
                "unit": test.get("units", ""),
                "low_causes": test.get("low_causes", "")[:400] if isinstance(test.get("low_causes"), str) else "",
                "high_causes": test.get("high_causes", "")[:400] if isinstance(test.get("high_causes"), str) else "",
                "low_symptoms": test.get("symptoms", "")[:300] if isinstance(test.get("symptoms"), str) else "",
                "high_symptoms": test.get("symptoms", "")[:300] if isinstance(test.get("symptoms"), str) else "",
                "diet_advice": {
                    "low": [test.get("diet_recommendations", "")[:300]] if test.get("diet_recommendations") else [],
                    "high": [test.get("foods_to_avoid", "")[:300]] if test.get("foods_to_avoid") else [],
                },
                "when_to_see_doctor": test.get("emergency_conditions", ""),
                "follow_up_tests": test.get("follow_up_tests", []),
                "patient_explanation": test.get("patient_friendly_explanation", "")[:500],
                "sources": test.get("source_names", []),
                "category": test.get("embedding_metadata", {}).get("category", "blood_test"),
            }
        
        logger.info(f"Converted legacy format: {len(self.tests)} tests")
    
    def get_test(self, name: str):
        """Get test by name (case-insensitive, also checks alternative_names)"""
        name_lower = name.lower().strip()
        if name_lower in self.tests:
            return self.tests[name_lower]
        for key, val in self.tests.items():
            if name_lower in key or key in name_lower:
                return val
            if name_lower in val.get("full_name", "").lower():
                return val
            # Also check alternative names
            for alt in val.get("alternative_names", []):
                if name_lower in alt.lower() or alt.lower() in name_lower:
                    return val
        return None
    
    def get_disease(self, name: str):
        """Get disease by name"""
        name_lower = name.lower().strip()
        return self.diseases.get(name_lower)

    def build_context_for_test(self, test_key: str, value: float, unit: str) -> str:
        """Build KB context string for a specific test (compatibility with rag_pipeline6)"""
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
            if info.get("low_causes"):
                parts.append(f"COMMON CAUSES OF LOW VALUES: {info.get('low_causes', '')}")
            if info.get("low_symptoms"):
                parts.append(f"SYMPTOMS WHEN LOW: {info.get('low_symptoms', '')}")
            diet = info.get("diet_advice", {}).get("low", [])
            if diet:
                parts.append(f"DIETARY ADVICE: {'; '.join(diet)}")
        elif status == "high":
            if info.get("high_causes"):
                parts.append(f"COMMON CAUSES OF HIGH VALUES: {info.get('high_causes', '')}")
            if info.get("high_symptoms"):
                parts.append(f"SYMPTOMS WHEN HIGH: {info.get('high_symptoms', '')}")
            diet = info.get("diet_advice", {}).get("high", [])
            if diet:
                parts.append(f"DIETARY ADVICE: {'; '.join(diet)}")

        parts.append(f"WHEN TO SEE A DOCTOR: {info.get('when_to_see_doctor', '')}")
        parts.append(f"SOURCES: {'; '.join(info.get('sources', []))}")
        return "\n".join(parts)

    def build_context_for_disease(self, disease_key: str) -> str:
        return f"No disease information available for: {disease_key}"
    
    def search_kb_for_query(self, query: str) -> list[str]:
        """Search KB for relevant articles based on query keywords"""
        articles = []
        ql = query.lower()
        
        # Search tests
        for key, info in self.tests.items():
            fn = info.get("full_name", "").lower()
            alts = [a.lower() for a in info.get("alternative_names", [])]
            if key in ql or fn in ql or any(a in ql for a in alts):
                article = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST: {info.get('full_name', key)}
DESCRIPTION: {info.get('description', '')}
NORMAL RANGE: {info.get('reference_ranges', {}).get('default', {})}
UNIT: {info.get('unit', '')}
CAUSES OF LOW VALUES: {info.get('low_causes', '')}
CAUSES OF HIGH VALUES: {info.get('high_causes', '')}
WHEN TO SEE A DOCTOR: {info.get('when_to_see_doctor', '')}
SOURCES CITED IN KB: {', '.join(info.get('sources', []))}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"""

                follow_ups = info.get("follow_up_tests", [])
                if follow_ups:
                    article += f"\n\n[EXACT FOLLOW-UP TESTS FROM KB - DO NOT ADD MORE]:\n"
                    for t in follow_ups:
                        article += f"  • {t}\n"
                    article += "[END OF KB DATA]"

                articles.append(article)
        
        return articles[:3]  # Cap to 3 articles to avoid token overflow
    
    def get_all_test_names(self) -> list[str]:
        """Get all test names"""
        return list(self.tests.keys())
    
    def get_all_disease_names(self) -> list[str]:
        """Get all disease names"""
        return list(self.diseases.keys())

# Initialize once
try:
    KNOWLEDGE_PATH = Path(__file__).parent / "medical_knowledge.json"
    
    # If KB doesn't exist
    if not KNOWLEDGE_PATH.exists():
        logger.warning(f"medical_knowledge.json not found at {KNOWLEDGE_PATH}")
        kb = None
    else:
        try:
            kb = KnowledgeBase(KNOWLEDGE_PATH)
            # If KnowledgeBase loaded 0 tests, the JSON uses legacy 'medical_tests' format — fall back
            if len(kb.tests) == 0:
                raise ValueError("KnowledgeBase found 0 tests — JSON is in legacy format, switching to LegacyKBAdapter")
            logger.info(f"✓ Loaded medical knowledge base ({len(kb.tests)} tests, new format)")
        except Exception as kb_err:
            logger.warning(f"KnowledgeBase fallback triggered: {kb_err}")
            # Fallback to legacy adapter for old medical_tests array format
            kb = LegacyKBAdapter(KNOWLEDGE_PATH)
            logger.info(f"✓ Loaded medical knowledge base (legacy format, {len(kb.tests)} tests)")
except Exception as e:
    logger.error(f"Failed to load KB: {e}")
    kb = None


# Initialize report parser and LLM client
report_parser = MedicalReportParser()
logger.info("✓ Initialized MedicalReportParser (with OCR support)")

try:
    groq_client = GroqClient()
    logger.info("✓ Initialized Groq LLM client")
except Exception as e:
    logger.error(f"Failed to initialize Groq: {e}")
    groq_client = None

# Initialize database for history tracking
try:
    init_db()
    logger.info("✓ Initialized chat history database")
except Exception as e:
    logger.warning(f"Failed to init DB: {e}")


def medical_chatbot(full_prompt: str, parsed_data: dict = None, session_id: str = "default", chat_history: list = None) -> str:
    """
    Generate a chat response using LLM + KB context.
    
    Args:
        full_prompt: The user's question/prompt
        parsed_data: Optional extracted report data
        session_id: For tracking chat history
        chat_history: Recent conversation history
    
    Returns:
        AI response string
    """
    if not groq_client:
        return "LLM client not initialized. Check GROQ_API_KEY."
    
    if not parsed_data:
        parsed_data = {}
        
    if chat_history is None:
        chat_history = []
    
    try:
        # Extract question from full_prompt
        import re
        match = re.search(r'Patient Question: "(.*?)"', full_prompt)
        user_question = match.group(1) if match else full_prompt
        
        # Build smart response (uses KB context + LLM)
        if kb:
            response = build_smart_response(
                query=user_question,
                parsed_data=parsed_data,
                patient_info={},
                kb=kb,
                groq=groq_client,
                chat_history=chat_history,
                session_id=session_id,
            )
            return response.get("answer", "Unable to generate response")
        else:
            # Fallback: Use LLM directly without KB
            messages = [{"role": "user", "content": full_prompt}]
            answer = groq_client.chat(messages, max_tokens=800)
            return answer
            
    except Exception as e:
        logger.error(f"Error in medical_chatbot: {e}")
        return f"Error: {str(e)}"
