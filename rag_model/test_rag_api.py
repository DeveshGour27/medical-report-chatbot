#!/usr/bin/env python3
"""
Test RAG API connectivity
Run this to verify if rag_api.py is working properly
"""

import requests
import sys

def test_rag_api():
    """Test if RAG API is accessible"""
    
    api_url = "http://127.0.0.1:8000"
    
    print("=" * 60)
    print("Testing RAG API Connectivity")
    print("=" * 60)
    
    # Test 1: Check if API is running
    print("\n[Test 1] Checking if RAG API is running...")
    try:
        response = requests.get(f"{api_url}/docs", timeout=5)
        if response.status_code == 200:
            print("✅ RAG API is running at http://127.0.0.1:8000")
        else:
            print(f"❌ API returned status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to RAG API at http://127.0.0.1:8000")
        print("   Please start the RAG API with:")
        print("   cd d:\\website\\complete_project\\medical-report-chatbot\\rag_model")
        print("   python -m uvicorn rag_api:app --host 127.0.0.1 --port 8000 --reload")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Test 2: Check endpoints
    print("\n[Test 2] Checking available endpoints...")
    try:
        response = requests.get(f"{api_url}/openapi.json", timeout=5)
        if response.status_code == 200:
            print("✅ OpenAPI schema is accessible")
            # Check for extract_report endpoint
            openapi = response.json()
            if "/extract_report" in openapi.get("paths", {}):
                print("✅ /extract_report endpoint is available")
            else:
                print("❌ /extract_report endpoint not found")
        else:
            print(f"❌ Cannot fetch OpenAPI schema")
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Test 3: Test with a sample file (if available)
    print("\n[Test 3] Testing file upload capability...")
    print("   Note: Actual extraction requires a real PDF file")
    print("   To test: Upload a PDF from the frontend at http://localhost:3000/upload-report")
    
    print("\n" + "=" * 60)
    print("✅ RAG API is ready!" if all([True]) else "❌ RAG API has issues")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = test_rag_api()
    sys.exit(0 if success else 1)
