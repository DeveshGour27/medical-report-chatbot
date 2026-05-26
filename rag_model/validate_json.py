#!/usr/bin/env python3
"""Validate medical_knowledge.json structure"""
import json
from pathlib import Path

kb_path = Path(__file__).parent / "medical_knowledge.json"
print(f"Checking: {kb_path}")
print(f"File exists: {kb_path.exists()}")

if kb_path.exists():
    try:
        with open(kb_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"✅ JSON is valid")
        print(f"   Top-level keys: {list(data.keys())}")
        print(f"   Medical tests: {len(data.get('medical_tests', []))} items")
        
        # Check first test structure
        if data.get('medical_tests'):
            first = data['medical_tests'][0]
            print(f"   First test keys: {list(first.keys())}")
            print(f"   First test name: {first.get('test_name')}")
    except json.JSONDecodeError as e:
        print(f"❌ JSON error: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")
