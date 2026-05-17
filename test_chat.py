import requests
import time

payload = {
    "question": "what is my wbc count?",
    "extractedData": {
        "0": {
            "wbc count": {
                "value": "10570",
                "unit": "/cmm",
                "reference_low": "4000",
                "reference_high": "10000"
            }
        }
    },
    "rawText": "Raw text fallback"
}

start = time.time()
try:
    print("Sending request...")
    res = requests.post("http://127.0.0.1:8000/chat_with_report", json=payload, timeout=35)
    print(f"Response ({time.time() - start:.2f}s): {res.text}")
except Exception as e:
    print(f"Error ({time.time() - start:.2f}s): {e}")
