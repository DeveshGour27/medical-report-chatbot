#!/usr/bin/env python3
import json
import re
from pathlib import Path

KB_PATH = Path(__file__).parent / "medical_knowledge.json"

def extract_numeric_range(range_str):
    """Extract min and max from range strings"""
    if not range_str or not isinstance(range_str, str):
        return None, None
    numbers = re.findall(r'\d+\.?\d*', range_str)
    if len(numbers) >= 2:
        try:
            return float(numbers[0]), float(numbers[-1])
        except: return None, None
    elif len(numbers) == 1:
        try: return float(numbers[0]), float(numbers[0])
        except: return None, None
    return None, None

# Read original
with open(KB_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

tests_dict = {}
for test in data.get("medical_tests", []):
    test_name = test.get("test_name", "").lower().strip()
    if not test_name: continue
    
    normal_ranges = test.get("normal_ranges", {})
    ref_low, ref_high = None, None
    
    if normal_ranges and isinstance(normal_ranges, dict):
        for value in normal_ranges.values():
            low, high = extract_numeric_range(value)
            if low is not None: ref_low = low
            if high is not None: ref_high = high
            if ref_low and ref_high: break
    
    tests_dict[test_name] = {
        "full_name": test.get("test_name", test_name),
        "alternative_names": test.get("alternative_names", []),
        "description": test.get("what_it_measures", "")[:500],
        "reference_ranges": {
            "default": {"low": ref_low, "high": ref_high}
        },
        "unit": test.get("units", ""),
        "risk_levels": test.get("risk_levels", {}),
        "low_causes": [c.strip() for c in str(test.get("low_causes", "")).split("\n") if c.strip()][:3],
        "high_causes": [c.strip() for c in str(test.get("high_causes", "")).split("\n") if c.strip()][:3],
        "sources": test.get("source_names", [])
    }

# Create new structure
new_kb = {
    "metadata": data.get("metadata", {}),
    "tests": tests_dict,
    "diseases": {}
}

# Write back
with open(KB_PATH, 'w', encoding='utf-8') as f:
    json.dump(new_kb, f, indent=2, ensure_ascii=False)

print(f"✅ Converted {len(tests_dict)} tests!")
