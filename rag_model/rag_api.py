from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

from rag_pipeline5 import medical_chatbot, report_parser

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Query(BaseModel):
    question: str

saved_reports = {}   # in-memory storage

@app.post("/extract_report")
async def extract_report(file: UploadFile = File(...)):
    try:
        print(f"\n[RAG API] Extracting report: {file.filename}")
        contents = await file.read()
        pdf_path = f"temp_{file.filename}"
        
        with open(pdf_path, "wb") as f:
            f.write(contents)

        parsed = report_parser.extract_from_pdf(pdf_path)
        raw_text = report_parser.raw_text  # grab raw text for LLM fallback
        
        os.remove(pdf_path)
        
        if not parsed or len(parsed) == 0:
            print(f"[RAG API] ⚠️  No structured data extracted. Returning raw text for LLM.")
            # Return raw text so the AI can still answer questions from the PDF
            return {
                "status": "partial",
                "extractedData": {"0": {}},
                "rawText": raw_text or ""
            }
        
        # ✅ CORRECT: Wrap all tests inside the "0" key
        inner = {}
        for test_name, test_data in parsed.items():
            inner[test_name] = {
                "value": str(test_data.get('value', '')),
                "unit": test_data.get('unit', ''),
                "reference_low": str(test_data.get('reference_low', '')),
                "reference_high": str(test_data.get('reference_high', ''))
            }
        
        print(f"[RAG API] ✓ Successfully extracted {len(inner)} tests")
        return {
            "status": "success",
            "extractedData": {"0": inner},  # ← wrapped in "0" key
            "rawText": raw_text or ""
        }
    except Exception as e:
        print(f"[RAG API] ❌ Error extracting report: {str(e)}")
        return {"status": "error", "extractedData": {"0": {}}, "rawText": "", "error": str(e)}

@app.post("/save_report")
def save_report(data: dict):
    rid = data.get("id")
    saved_reports[rid] = data
    return {"status": "saved", "id": rid}

@app.post("/chat_with_report")
def chat_with_report(payload: dict):
    print("\n------ NEW CHAT REQUEST ------")
    print("Payload received keys:", list(payload.keys()))

    question = payload.get("question", "").lower()
    extracted_data = payload.get("extractedData", {})
    raw_text = payload.get("rawText", "")  # fallback raw text from PDF

    print("question:", question)

    if not extracted_data and not raw_text:
        print("❌ ERROR: No data at all in payload")
        return {"answer": "No medical data was provided for this report."}

    # -------------------------------------------------------
    # Try structured data first
    # -------------------------------------------------------
    # Handle both {"0": {...tests}} and flat {test_name: {...}}
    extracted_block = extracted_data.get("0") if extracted_data else None
    if not extracted_block and extracted_data:
        # Maybe it's already flat
        first_val = list(extracted_data.values())[0] if extracted_data else None
        if isinstance(first_val, dict) and 'value' in first_val:
            # It's a flat dict of tests
            extracted_block = extracted_data
        elif isinstance(first_val, dict):
            extracted_block = first_val

    if extracted_block and len(extracted_block) > 0:
        print(f"✔ Using structured data: {len(extracted_block)} tests found")
        
        def relevance_key(test_name):
            return 0 if test_name.lower() in question else 1

        ordered_keys = sorted(extracted_block.keys(), key=relevance_key)

        context_lines = []
        for key in ordered_keys:
            v = extracted_block[key]
            if isinstance(v, dict):
                context_lines.append(
                    f"{key}: {v.get('value', 'N/A')} {v.get('unit', '')} "
                    f"(normal range: {v.get('reference_low', '?')}–{v.get('reference_high', '?')})"
                )

        context = "\n".join(context_lines)
        full_prompt = f"""You are a warm, conversational medical AI assistant.
Below is the patient's structured lab report data.

Lab Results:
{context}

Patient Question: "{question}"

Please explain what these results mean in a clear, natural, empathetic way.
Always mention if values are within normal range or not."""

    elif raw_text:
        # Fallback: use raw PDF text
        print("⚠️  No structured data, using raw PDF text as context")
        context = raw_text[:3000]  # limit to avoid token overflow
        full_prompt = f"""You are a medical AI assistant helping a patient understand their medical report.

Here is the raw text from the patient's uploaded medical report:
---
{context}
---

Patient Question: "{question}"

Please answer based on the report text above. Be clear, empathetic and helpful."""
    else:
        return {"answer": "I could not read any data from your medical report. Please try re-uploading the PDF."}

    answer = medical_chatbot(full_prompt)
    print("AI Answer:", answer[:200], "...")
    return {"answer": answer}

@app.delete("/delete_report/{report_id}")
def delete_report(report_id: str):
    if report_id in saved_reports:
        del saved_reports[report_id]
        return {"message": f"Report {report_id} deleted"}
    return {"error": "Report not found"}
