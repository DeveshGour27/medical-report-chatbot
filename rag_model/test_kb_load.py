#!/usr/bin/env python3
"""Test if KB loads correctly with the legacy adapter"""
import sys
from pathlib import Path

# Add rag_model to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from rag_pipeline6_wrapper import kb
    if kb:
        print(f"✅ KB LOADED: {len(kb.tests)} tests found")
        print(f"   Tests: {list(kb.tests.keys())[:5]}")
        print(f"   Diseases: {len(kb.diseases)} diseases")
    else:
        print("❌ KB is None - failed to load")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
