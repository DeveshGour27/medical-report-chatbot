import json
import re
from pathlib import Path

KB_PATH = Path("d:/website/complete_project/medical-report-chatbot/rag_model/medical_knowledge.json")

def extract_numeric_range(range_str):
    """Extract min and max from range strings like '13.5–17.5 g/dL'"""
    if not range_str or not isinstance(range_str, str):
        return None, None
    
    numbers = re.findall(r'\d+\.?\d*', range_str)
    if len(numbers) >= 2:
        try:
            return float(numbers[0]), float(numbers[-1])
        except:
            return None, None
    elif len(numbers) == 1:
        try:
            return float(numbers[0]), float(numbers[0])
        except:
            return None, None
    return None, None

with open(KB_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

tests_dict = {}
if "medical_tests" in data:
    for test in data["medical_tests"]:
        test_name = test.get("test_name", "").lower().strip()
        if not test_name:
            continue
        
        # Parse normal ranges
        normal_ranges = test.get("normal_ranges", {})
        ref_low = None
        ref_high = None
        
        if normal_ranges and isinstance(normal_ranges, dict):
            for key, value in normal_ranges.items():
                low, high = extract_numeric_range(value)
                if low is not None:
                    ref_low = low
                if high is not None:
                    ref_high = high
                if ref_low is not None and ref_high is not None:
                    break
        
        tests_dict[test_name] = {
            "full_name": test.get("test_name", test_name),
            "alternative_names": test.get("alternative_names", []),
            "description": test.get("what_it_measures", "")[:500],
            "procedure": test.get("procedure", "")[:200],
            "preparation": test.get("preparation", "")[:200],
            "category": "blood_test",
            "reference_ranges": {
                "default": {
                    "low": ref_low,
                    "high": ref_high
                }
            },
            "unit": test.get("units", ""),
            "risk_levels": test.get("risk_levels", {}),
            "low_causes": [c.strip() for c in str(test.get("low_causes", "")).split("\n") if c.strip()][:5],
            "high_causes": [c.strip() for c in str(test.get("high_causes", "")).split("\n") if c.strip()][:5],
            "low_symptoms": [s.strip() for s in str(test.get("symptoms", "")).split("\n") if s.strip()][:3],
            "high_symptoms": [s.strip() for s in str(test.get("symptoms", "")).split("\n") if s.strip()][:3],
            "diet_advice": {
                "low": [d.strip() for d in str(test.get("diet_recommendations", "")).split(";") if d.strip()][:2],
                "high": [d.strip() for d in str(test.get("diet_recommendations", "")).split(";") if d.strip()][:2]
            },
            "when_to_see_doctor": test.get("emergency_conditions", ""),
            "lifestyle_advice": test.get("lifestyle_advice", "")[:200],
            "related_conditions": [c.strip() for c in str(test.get("related_conditions", "")).split(",") if c.strip()][:3],
            "specialist_type": test.get("specialist_type", ""),
            "follow_up_tests": test.get("follow_up_tests", []),
            "sources": test.get("source_names", [])
        }

new_kb = {
    "metadata": data.get("metadata", {}),
    "tests": tests_dict,
    "diseases": {}
}

with open(KB_PATH, 'w', encoding='utf-8') as f:
    json.dump(new_kb, f, indent=2, ensure_ascii=False)

print(f"✅ Conversion complete! {len(tests_dict)} tests loaded")
