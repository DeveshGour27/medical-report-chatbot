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
    contents = await file.read()
    pdf_path = f"temp_{file.filename}"
    with open(pdf_path, "wb") as f:
        f.write(contents)

    parsed = report_parser.extract_from_pdf(pdf_path)
    os.remove(pdf_path)

    return {"status": "success", "extractedData": parsed}

@app.post("/save_report")
def save_report(data: dict):
    rid = data.get("id")
    saved_reports[rid] = data
    return {"status": "saved", "id": rid}

@app.post("/chat_with_report")
def chat_with_report(payload: dict):
    print("\n------ NEW CHAT REQUEST ------")
    print("Payload received:", payload)

    report_id = str(payload.get("report_id"))
    question = payload.get("question", "").lower()

    print("report_id:", report_id)
    print("question:", question)

    # Check if report exists in memory
    if report_id not in saved_reports:
        print("❌ ERROR: Report not found in saved_reports")
        print("Saved reports keys:", list(saved_reports.keys()))
        return {"answer": "Report not found on server."}

    print("✔ Report found!")
    report = saved_reports[report_id]

    extracted_data = report.get("extractedData", {})
    print("ExtractedData keys:", extracted_data.keys())

    # use key "0" or fallback
    extracted_block = extracted_data.get("0") or list(extracted_data.values())[0]
    print("Extracted block:", extracted_block)

    # -------------------------------
    # NEW FIX: Sort tests so the ASKED test appears FIRST
    # -------------------------------
    def relevance_key(test_name):
        return 0 if test_name.lower() in question else 1

    ordered_keys = sorted(extracted_block.keys(), key=relevance_key)

    # Build context for AI
    context_lines = []
    for key in ordered_keys:
        v = extracted_block[key]
        context_lines.append(
            f"{key}: {v.get('value')} {v.get('unit')} "
            f"(normal {v.get('reference_low')}–{v.get('reference_high')})"
        )

    context = "\n".join(context_lines)

    full_prompt = f"""
    Patient report:
    {context}

    Question: {question}
    """

    answer = medical_chatbot(full_prompt)
    print("AI Answer:", answer[:200], "...")

    return {"answer": answer}

@app.delete("/delete_report/{report_id}")
def delete_report(report_id: str):
    if report_id in saved_reports:
        del saved_reports[report_id]
        return {"message": f"Report {report_id} deleted"}
    return {"error": "Report not found"}
