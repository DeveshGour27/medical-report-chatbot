import os
import re
import pdfplumber
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from dotenv import load_dotenv

load_dotenv()

# Environment setup
print("GROQ KEY:", os.getenv("GROQ_API_KEY"))
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
        
        print(f"\n[RAG] Parsing {len(lines)} lines from PDF")
        
        for line in lines:
            if not line.strip() or len(line.strip()) < 5:
                continue
            
            # Debug: print lines that might contain data
            if any(char.isdigit() for char in line):
                print(f"[RAG] Processing line: {line[:80]}")
            
            # Pattern 1: Lab format - TEST VALUE STATUS REFERENCE UNIT
            # Matches: "HEMOGLOBIN 12.5 Low 13.0 - 17.0 g/dL"
            # or "RBC BLOOD COUNT 5.2 - 4.5 - 5.5 mill/cumm"
            pattern_lab = r'([A-Za-z\s]+?)\s+([0-9.]+)\s+(?:[A-Za-z]+)?\s*([0-9.]+)\s*[-]\s*([0-9.]+)\s+([a-zA-Z/%\-\.]+)\s*$'
            match = re.search(pattern_lab, line.strip())
            
            if match:
                test_name = match.group(1).strip()
                value = match.group(2)
                ref_low = match.group(3)
                ref_high = match.group(4)
                unit = match.group(5).strip()
                
                test_key = re.sub(r'\s+', ' ', test_name.lower())
                
                if test_key not in results:
                    print(f"[RAG] ✓ Matched (pattern 1): {test_name} = {value} {unit}")
                    results[test_key] = {
                        'value': str(value),
                        'unit': unit,
                        'reference_low': str(ref_low),
                        'reference_high': str(ref_high),
                    }
                continue
            
            # Pattern 2: Flexible format with tabs or multiple spaces
            # Try to match: VALUE REFERENCE_LOW-REFERENCE_HIGH UNIT on same line as TEST NAME
            pattern_tabular = r'([A-Za-z\s]+?)\s{2,}([0-9.]+)\s+([0-9.]+)\s*[-]\s*([0-9.]+)\s+([a-zA-Z/%\-\.]+)'
            match = re.search(pattern_tabular, line.strip())
            
            if match:
                test_name = match.group(1).strip()
                value = match.group(2)
                ref_low = match.group(3)
                ref_high = match.group(4)
                unit = match.group(5).strip()
                
                test_key = re.sub(r'\s+', ' ', test_name.lower())
                
                if test_key not in results:
                    print(f"[RAG] ✓ Matched (pattern 2): {test_name} = {value} {unit}")
                    results[test_key] = {
                        'value': str(value),
                        'unit': unit,
                        'reference_low': str(ref_low),
                        'reference_high': str(ref_high),
                    }
                continue
            
            # Pattern 3: Colon format with parentheses
            pattern_colon = r'([A-Za-z\s]+?)[:]\s*([0-9.]+)\s*([a-zA-Z/%]*)\s*\(\s*normal\s+([0-9.]+)\s*[-]\s*([0-9.]+)\s*\)'
            match = re.search(pattern_colon, line, re.IGNORECASE)
            
            if match:
                test_name = match.group(1).strip()
                value = match.group(2)
                unit = match.group(3).strip() or "units"
                ref_low = match.group(4)
                ref_high = match.group(5)
                
                test_key = re.sub(r'\s+', ' ', test_name.lower())
                
                if test_key not in results:
                    print(f"[RAG] ✓ Matched (pattern 3): {test_name} = {value} {unit}")
                    results[test_key] = {
                        'value': str(value),
                        'unit': unit,
                        'reference_low': str(ref_low),
                        'reference_high': str(ref_high),
                    }
                continue

            # Pattern 4: TEST_NAME [H/L]? VALUE UNIT REF_LOW - REF_HIGH (e.g. "Hemoglobin 14.5 g/dL 13.0 - 16.5")
            pattern_4 = r'^([A-Za-z0-9\s\(\)\.,\-_]+?)\s+([HLhl]?\s*[0-9.]+)\s+(?:([A-Za-z/%\-\.]+)\s+)?([0-9.]+)\s*[-]\s*([0-9.]+).*$'
            match = re.search(pattern_4, line.strip())
            
            if match:
                test_name = match.group(1).strip()
                raw_val = match.group(2).strip()
                
                # Strip out 'H' or 'L' flag from the value if present
                val_match = re.search(r'([0-9.]+)', raw_val)
                value = val_match.group(1) if val_match else raw_val
                
                unit = match.group(3).strip() if match.group(3) else ""
                ref_low = match.group(4)
                ref_high = match.group(5)
                
                test_key = re.sub(r'\s+', ' ', test_name.lower())
                
                # Exclude lines that are obviously just dates or IDs matching by accident
                if len(test_name) > 3 and not re.match(r'^[0-9\-\.]+$', test_name):
                    if test_key not in results:
                        print(f"[RAG] ✓ Matched (pattern 4): {test_name} = {value} {unit}")
                        results[test_key] = {
                            'value': str(value),
                            'unit': unit,
                            'reference_low': str(ref_low),
                            'reference_high': str(ref_high),
                        }
                continue
        
        print(f"[RAG] Final result: extracted {len(results)} tests")
        if len(results) > 0:
            print(f"[RAG] Tests found: {list(results.keys())}")
        return results
    
    def extract_from_pdf(self, pdf_path):
        if not os.path.exists(pdf_path):
            print(f"[RAG] File not found: {pdf_path}")
            return None
        
        results = {}
        full_text = ""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                print(f"[RAG] Opened PDF with {len(pdf.pages)} pages")
                
                for page_num, page in enumerate(pdf.pages):
                    print(f"[RAG] Processing page {page_num + 1}...")
                    
                    # Extract tables first (best for structured lab reports)
                    tables = page.extract_tables()
                    if tables:
                        print(f"[RAG] Found {len(tables)} table(s) on page {page_num + 1}")
                        for table in tables:
                            results.update(self._parse_table(table))
                    
                    # Always collect raw text for LLM fallback
                    page_text = page.extract_text() or ""
                    full_text += page_text + "\n"
                    
                    # Try regex parsing as fallback if tables gave nothing
                    if page_text and not results:
                        print(f"[RAG] Trying regex text parsing on page {page_num + 1}...")
                        text_results = self.parse_test_values(page_text)
                        results.update(text_results)
                
                # Always save raw text so API can use it as LLM context
                self.raw_text = full_text.strip()
                self.parsed_data = results
                print(f"[RAG] Total extracted: {len(results)} tests, raw_text length: {len(self.raw_text)} chars")
                return results
                
        except Exception as e:
            print(f"[RAG] Error reading PDF: {e}")
            self.raw_text = ""
            return {}
    
    def _parse_table(self, table):
        """Extract test values from a table structure"""
        results = {}
        
        # Headers typically in first row
        if not table or len(table) < 2:
            return results
        
        headers = [str(h).lower() if h else "" for h in table[0]]
        print(f"[RAG] Table headers: {headers}")
        
        # Find column indices for key fields
        test_col = None
        value_col = None
        ref_col = None
        unit_col = None
        
        for i, h in enumerate(headers):
            if 'investigation' in h or 'test' in h or 'name' in h:
                test_col = i
            elif 'result' in h or 'value' in h:
                value_col = i
            elif 'reference' in h or 'normal' in h or 'range' in h:
                ref_col = i
            elif 'unit' in h:
                unit_col = i
        
        print(f"[RAG] Columns - test:{test_col}, value:{value_col}, ref:{ref_col}, unit:{unit_col}")
        
        # Parse data rows
        for row in table[1:]:
            if not row or len(row) < 2:
                continue
            
            try:
                test_name = str(row[test_col]).strip() if test_col is not None and test_col < len(row) else None
                value = str(row[value_col]).strip() if value_col is not None and value_col < len(row) else None
                ref_range = str(row[ref_col]).strip() if ref_col is not None and ref_col < len(row) else None
                unit = str(row[unit_col]).strip() if unit_col is not None and unit_col < len(row) else ""
                
                if test_name and value and ref_range:
                    # Parse reference range
                    ref_match = re.search(r'([0-9.]+)\s*[-–]\s*([0-9.]+)', ref_range)
                    if ref_match:
                        ref_low = ref_match.group(1)
                        ref_high = ref_match.group(2)
                        
                        test_key = re.sub(r'\s+', ' ', test_name.lower())
                        results[test_key] = {
                            'value': value,
                            'unit': unit,
                            'reference_low': ref_low,
                            'reference_high': ref_high,
                        }
                        print(f"[RAG] ✓ Extracted from table: {test_name} = {value} {unit}")
            except Exception as e:
                print(f"[RAG] Error parsing row: {e}")
                continue
        
        return results
    
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

# Main chatbot
def medical_chatbot(full_prompt):
    import time
    start_time = time.time()
    try:
        # Extract the actual question from the prompt to query the vector database
        import re
        match = re.search(r'Patient Question: "(.*?)"', full_prompt)
        user_question = match.group(1) if match else full_prompt
        
        try:
            t0 = time.time()
            retriever = knowledge_db.as_retriever(search_kwargs={"k": 4})
            results = retriever.invoke(user_question)
            context = "\n\n".join([d.page_content for d in results]) if results else ""
            print(f"[RAG Perf] Retriever took {time.time() - t0:.2f}s")
        except:
            context = ""

        final_prompt = f"""
{full_prompt}

Relevant Medical Knowledge (use this to explain medical terms if helpful):
{context}
"""
        
        t1 = time.time()
        response = llm.invoke(final_prompt)
        print(f"[RAG Perf] LLM invoke took {time.time() - t1:.2f}s")
        
        total = time.time() - start_time
        print(f"[RAG Perf] Total chatbot time: {total:.2f}s")
        
        return format_response_for_web(response.strip()) + "\n\n*Please consult your doctor for personalized advice.*"
        
    except Exception as e:
        print(f"Chatbot error: {e}")
        return f"Error processing your request: {str(e)}"

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
