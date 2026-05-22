#!/usr/bin/env python3
"""Test the complete RAG pipeline initialization"""
import sys
import os
from pathlib import Path

# Add to path
rag_dir = Path(__file__).parent
sys.path.insert(0, str(rag_dir))

print("=" * 60)
print("TESTING RAG PIPELINE INITIALIZATION")
print("=" * 60)

# 1. Validate JSON
print("\n1. Validating medical_knowledge.json...")
import json
with open(rag_dir / "medical_knowledge.json", 'r', encoding='utf-8') as f:
    kb_data = json.load(f)
print(f"   ✓ JSON valid, has {len(kb_data.get('medical_tests', []))} medical_tests")

# 2. Test legacy adapter
print("\n2. Testing LegacyKBAdapter...")
from rag_pipeline6_wrapper import LegacyKBAdapter
try:
    adapter = LegacyKBAdapter(rag_dir / "medical_knowledge.json")
    print(f"   ✓ Adapter created: {len(adapter.tests)} tests converted")
    print(f"     Sample tests: {list(adapter.tests.keys())[:3]}")
    
    # Verify structure
    first_test_key = list(adapter.tests.keys())[0]
    first_test = adapter.tests[first_test_key]
    print(f"     Test '{first_test_key}' has keys: {list(first_test.keys())}")
except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback
    traceback.print_exc()

# 3. Test full wrapper import
print("\n3. Testing rag_pipeline6_wrapper import...")
try:
    from rag_pipeline6_wrapper import kb, report_parser, groq_client
    if kb:
        print(f"   ✓ KB loaded: {len(kb.tests)} tests")
        print(f"   ✓ Report parser initialized")
        if groq_client:
            print(f"   ✓ Groq client initialized (model: {groq_client.model})")
        else:
            print(f"   ⚠ Groq client not available (check API key)")
    else:
        print(f"   ❌ KB is None")
except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("INITIALIZATION TESTS COMPLETE")
print("=" * 60)
