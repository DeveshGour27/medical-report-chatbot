from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

from rag_pipeline6_wrapper import medical_chatbot, report_parser

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
        
        # ✅ CORRECT: Wrap all tests inside the "0" key, keeping numeric values as numbers
        inner = {}
        for test_name, test_data in parsed.items():
            inner[test_name] = {
                "value": test_data.get('value'),  # Keep as float/number
                "unit": test_data.get('unit', ''),
                "reference_low": test_data.get('reference_low'),  # Keep as float/number
                "reference_high": test_data.get('reference_high')  # Keep as float/number
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
        
        # Convert all values to proper numeric types
        parsed_data_for_llm = {}
        for test_name, test_data in extracted_block.items():
            try:
                value = test_data.get('value')
                ref_low = test_data.get('reference_low')
                ref_high = test_data.get('reference_high')
                
                # Convert to float if not None
                if value is not None and value != '':
                    value = float(value) if not isinstance(value, (int, float)) else value
                else:
                    value = None
                    
                if ref_low is not None and ref_low != '':
                    ref_low = float(ref_low) if not isinstance(ref_low, (int, float)) else ref_low
                else:
                    ref_low = None
                    
                if ref_high is not None and ref_high != '':
                    ref_high = float(ref_high) if not isinstance(ref_high, (int, float)) else ref_high
                else:
                    ref_high = None
                
                parsed_data_for_llm[test_name] = {
                    "value": value,
                    "unit": test_data.get('unit', ''),
                    "reference_low": ref_low,
                    "reference_high": ref_high
                }
            except (ValueError, TypeError) as e:
                print(f"⚠️  Could not convert values for {test_name}: {e}")
                continue
        
        if parsed_data_for_llm:
            answer = medical_chatbot(
                full_prompt=question,
                parsed_data=parsed_data_for_llm,
                session_id="default"
            )
            print("AI Answer:", answer[:200] if answer else "No answer")
            return {"answer": answer}
        else:
            print("❌ No valid test data after conversion")

    elif raw_text:
        # Fallback: use raw PDF text
        print("⚠️  No structured data, using raw PDF text as context")
        full_prompt = f"""You are a medical AI assistant helping a patient understand their medical report.

Here is the raw text from the patient's uploaded medical report:
---
{raw_text[:3000]}
---

Patient Question: "{question}"

Please answer based on the report text above. Be clear, empathetic and helpful."""
        answer = medical_chatbot(full_prompt)
        print("AI Answer:", answer[:200] if answer else "No answer")
        return {"answer": answer}
    else:
        return {"answer": "I could not read any data from your medical report. Please try re-uploading the PDF."}

@app.delete("/delete_report/{report_id}")
def delete_report(report_id: str):
    if report_id in saved_reports:
        del saved_reports[report_id]
        return {"message": f"Report {report_id} deleted"}
    return {"error": "Report not found"}
