import time
import requests

payload = {
    "question": "what is my wbc count?",
    "extractedData": {
        "0": {
            "test " + str(i): {"value": str(i), "unit": "x", "reference_low": "1", "reference_high": "100"} for i in range(50)
        }
    },
    "rawText": "Raw text fallback"
}

start = time.time()
print("Sending request with 50 tests...")
res = requests.post("http://127.0.0.1:8000/chat_with_report", json=payload, timeout=50)
print(f"Response ({time.time() - start:.2f}s): {res.text[:100]}...")
