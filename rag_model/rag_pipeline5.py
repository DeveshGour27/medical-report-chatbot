import os
import re
import PyPDF2
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.schema import Document
from dotenv import load_dotenv

load_dotenv()

# Environment setup
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing. Please add it to your .env file.")

# Embedding and Vector DB
from langchain_huggingface import HuggingFaceEmbeddings
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

from langchain_chroma import Chroma
DB_PATH = "./medical_db"
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
knowledge_db = Chroma(persist_directory=DB_PATH, embedding_function=embeddings)

# Structured Report Parser
class MedicalReportParser:
    """Parse medical reports and extract structured data"""
    
    def __init__(self):
        self.parsed_data = {}
        self.raw_text = ""
    
    def parse_test_values(self, text):
        """Extract test values from medical report text"""
        results = {}
        lines = text.split('\n')
        
        for line in lines:
            if not line.strip():
                continue
            
            pattern_table = r'^([A-Za-z\s]+?)\s+([a-zA-Z/%]+)\s+([0-9.]+)\s*[-]\s*([0-9.]+).*?\s+([0-9.]+)\s*$'
            match = re.search(pattern_table, line.strip())
            
            if match:
                test_name = match.group(1).strip()
                unit = match.group(2)
                ref_low = float(match.group(3))
                ref_high = float(match.group(4))
                value = float(match.group(5))
                
                results[test_name.lower()] = {
                    'value': value,
                    'unit': unit,
                    'reference_low': ref_low,
                    'reference_high': ref_high,
                    'original_line': line.strip()
                }
                continue
            
            pattern_colon = r'([A-Za-z\s]+?)[:]\s*([0-9.]+)\s*([a-zA-Z/%]*)\s*(?:\(.*?([0-9.]+)\s*[-]\s*([0-9.]+))?'
            match = re.search(pattern_colon, line, re.IGNORECASE)
            
            if match:
                test_name = match.group(1).strip()
                value = float(match.group(2))
                unit = match.group(3) or ""
                ref_low = float(match.group(4)) if match.group(4) else None
                ref_high = float(match.group(5)) if match.group(5) else None
                
                results[test_name.lower()] = {
                    'value': value,
                    'unit': unit,
                    'reference_low': ref_low,
                    'reference_high': ref_high,
                    'original_line': line.strip()
                }
        
        return results
    
    def extract_from_pdf(self, pdf_path):
        if not os.path.exists(pdf_path):
            print(f"File not found: {pdf_path}")
            return None
        
        text = ""
        try:
            with open(pdf_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            print(f"Error reading PDF: {e}")
            return None
        
        self.raw_text = text
        self.parsed_data = self.parse_test_values(text)
        return self.parsed_data
    
    def get_test_value(self, test_name):
        test_name_lower = test_name.lower()
        
        if test_name_lower in self.parsed_data:
            return self.parsed_data[test_name_lower]
        
        for key in self.parsed_data:
            if test_name_lower in key or key in test_name_lower:
                return self.parsed_data[key]
        
        return None

report_parser = MedicalReportParser()

# Load Knowledge Base
def load_knowledge_base(file_path="database.txt"):
    if not os.path.exists(file_path):
        print(f"Knowledge base file '{file_path}' not found.")
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        
        if not text.strip():
            print("Knowledge base file is empty")
            return False
        
        doc = Document(page_content=text, metadata={"source": "Knowledge Base"})
        chunks = splitter.split_documents([doc])
        
        if chunks:
            knowledge_db.add_documents(chunks)
            print(f"Loaded {len(chunks)} chunks from knowledge base")
            return True
            
        return False
            
    except Exception as e:
        print(f"Error loading knowledge base: {e}")
        return False

# Initialize LLM with Groq
def initialize_llm():
    print("\nInitializing Groq AI...")
    
    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        
        models_to_try = [
            "llama-3.3-70b-versatile",
            "llama-3.1-70b-versatile",
            "mixtral-8x7b-32768",
        ]
        
        for model_name in models_to_try:
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": "Hello"}],
                    max_tokens=20,
                )
                
                if response and response.choices:
                    class GroqWrapper:
                        def __init__(self, client, model):
                            self.client = client
                            self.model = model
                        
                        def invoke(self, prompt):
                            response = self.client.chat.completions.create(
                                model=self.model,
                                messages=[
                                    {"role": "system",
                                     "content": "You are a warm, natural medical chatbot who explains information like a real doctor."},
                                    {"role": "user", "content": prompt}
                                ],
                                max_tokens=900,
                                temperature=0.7
                            )
                            return response.choices[0].message.content
                    
                    print(f"✓ Loaded model: {model_name}")
                    return GroqWrapper(client, model_name)
                    
            except:
                continue
        
        print("All models failed.")
        return None
    except:
        return None

llm = initialize_llm()

# Format for web
def format_response_for_web(text):
    paragraphs = [p.strip() for p in text.split('\n') if p.strip()]
    return "\n\n".join(paragraphs)

# 🔥 RESTORED FUNCTION
def detect_test_value_query(query):
    """Detect test queries & summary request."""
    query_lower = query.lower()

    summary_keywords = ['summary', 'summarize', 'overview', 'report summary', 'full report']
    if any(k in query_lower for k in summary_keywords):
        return "SUMMARY"

    test_names = [
        'hemoglobin', 'rbc', 'wbc', 'platelet', 'glucose',
        'cholesterol', 'hba1c', 'esr', 'creatinine',
        'thyroid', 'tsh', 'vitamin', 'iron'
    ]

    if any(word in query_lower for word in ['my', 'what is my', 'show my']):
        for t in test_names:
            if t in query_lower:
                return t
    
    return None

# NATURAL conversational explanation
def generate_personalized_test_response(test_name, test_data, query):
    try:
        retriever = knowledge_db.as_retriever(search_kwargs={"k": 4})
        results = retriever.invoke(f"{test_name} significance meaning")
        context = "\n\n".join([d.page_content for d in results]) if results else ""
    except:
        context = ""
    
    # Determine status
    status = "normal"
    if test_data['reference_low'] and test_data['reference_high']:
        if test_data['value'] < test_data['reference_low']:
            status = "below normal"
        elif test_data['value'] > test_data['reference_high']:
            status = "above normal"
    
    patient_info = f"""
Value: {test_data['value']} {test_data['unit']}
Range: {test_data['reference_low']}–{test_data['reference_high']} {test_data['unit']}
Status: {status}
"""
    
    prompt = f"""
You are a warm, conversational medical chatbot.  
Explain information naturally like a real doctor, without repeating a fixed structure.

Rules:
- Do NOT create a heading with the test name.
- Do NOT repeat the same pattern every time.
- Use bold text or bullet points only when it genuinely improves clarity.
- Speak naturally and empathetically.

Patient Info:
{patient_info}

Extra Medical Info:
{context if context else "No extra context available."}

User Question: "{query}"

Now respond naturally, in a clear and friendly tone:
"""
    
    response = llm.invoke(prompt)
    return format_response_for_web(response.strip()) + "\n\n*Please consult your doctor for personalized advice.*"

# Report Summary
def generate_report_summary():
    if not report_parser.parsed_data:
        return "No medical report loaded."
    
    normal_tests = []
    abnormal_tests = []
    
    for test_name, data in report_parser.parsed_data.items():
        if data['reference_low'] and data['reference_high']:
            if data['value'] < data['reference_low'] or data['value'] > data['reference_high']:
                abnormal_tests.append((test_name, data))
            else:
                normal_tests.append((test_name, data))
    
    summary = "**Your Medical Report Summary**\n\n"
    summary += f"- Total tests: {len(normal_tests) + len(abnormal_tests)}\n"
    summary += f"- Normal: {len(normal_tests)}\n"
    summary += f"- Abnormal: {len(abnormal_tests)}\n\n"
    
    if abnormal_tests:
        summary += "**Important findings:**\n"
        for t, d in abnormal_tests:
            summary += f"- **{t.title()}**: {d['value']}\n"
    
    return summary

# Main chatbot
def medical_chatbot(query):
    try:
        test_name = detect_test_value_query(query)
        
        if test_name == "SUMMARY":
            return generate_report_summary()
        
        if test_name and test_name != "SUMMARY" and report_parser.parsed_data:
            return generate_personalized_test_response(test_name, report_parser.get_test_value(test_name), query)
        
        try:
            retriever = knowledge_db.as_retriever(search_kwargs={"k": 4})
            results = retriever.invoke(query)
            context = "\n\n".join([d.page_content for d in results]) if results else ""
        except:
            context = ""

        prompt = f"""
You are a natural conversational medical chatbot. 
Explain things clearly and warmly, like a real doctor.

User Question:
"{query}"

Relevant Info:
{context if context else "No context available."}

Respond naturally:
"""
        
        response = llm.invoke(prompt)
        return format_response_for_web(response.strip())
    
    except Exception as e:
        return f"Error: {str(e)}"

def main():
    print("="*70)
    print("MEDICAL CHATBOT READY")
    print("="*70)

    load_knowledge_base("database.txt")

    while True:
        query = input("You: ").strip()
        if query.lower() in ["exit", "quit"]:
            print("Goodbye!")
            break
        
        print("\nAssistant:\n")
        print(medical_chatbot(query))
        print("\n" + "-"*70 + "\n")

if __name__ == "__main__":
    main()
