import os
import re
import PyPDF2
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document

from dotenv import load_dotenv
load_dotenv()

# ---------------------
# Environment setup
# ---------------------
# Get Groq API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("=" * 70)
    print("GROQ API KEY REQUIRED")
    print("=" * 70)
    print("\nTo use this chatbot with AI explanations, you need a Groq API key.")
    print("\nHow to get your key:")
    print("1. Go to https://console.groq.com/")
    print("2. Sign up or login (it's free!)")
    print("3. Go to API Keys section")
    print("4. Create a new API key")
    print("5. Either:")
    print("   - Create a .env file with: GROQ_API_KEY=your_key")
    print("   - Or enter it when prompted\n")
    
    token_input = input("Enter your Groq API key now (or press Enter to continue without AI): ").strip()
    
    if token_input:
        GROQ_API_KEY = token_input
        print("Token received!\n")
    else:
        print("\nContinuing without AI features...")
        print("You can still view test results and access database.txt\n")

# Get HuggingFace token for embeddings (not critical)
HF_TOKEN = os.getenv("HUGGINGFACEHUB_API_TOKEN")
if not HF_TOKEN:
    HF_TOKEN = "hf_placeholder"

# ---------------------
# Embedding and Vector DB
# ---------------------
from langchain_huggingface import HuggingFaceEmbeddings
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

from langchain_chroma import Chroma
DB_PATH = "./medical_db"
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
knowledge_db = Chroma(persist_directory=DB_PATH, embedding_function=embeddings)

# ---------------------
# Structured Report Parser
# ---------------------
class MedicalReportParser:
    """Parse medical reports and extract structured data"""
    
    def __init__(self):
        self.parsed_data = {}
        self.raw_text = ""
    
    def parse_test_values(self, text):
        """Extract test values from medical report text"""
        results = {}
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            if not line.strip():
                continue
            
            # Pattern for table format: "Test Name unit ref_low - ref_high method value"
            pattern_table = r'^([A-Za-z\s]+?)\s+([a-zA-Z/%]+)\s+([0-9.]+)\s*[-]\s*([0-9.]+).*?\s+([0-9.]+)\s*$'
            match = re.search(pattern_table, line.strip())
            
            if match:
                test_name = match.group(1).strip()
                unit = match.group(2)
                ref_low = match.group(3)
                ref_high = match.group(4)
                value = match.group(5)
                
                results[test_name.lower()] = {
                    'value': float(value),
                    'unit': unit,
                    'reference_low': float(ref_low),
                    'reference_high': float(ref_high),
                    'original_line': line.strip()
                }
                continue
            
            # Alternative pattern: "Test Name: Value unit (Ref: X-Y)"
            pattern_colon = r'([A-Za-z\s]+?)[:]\s*([0-9.]+)\s*([a-zA-Z/%]*)\s*(?:\(.*?([0-9.]+)\s*[-]\s*([0-9.]+))?'
            match = re.search(pattern_colon, line, re.IGNORECASE)
            
            if match:
                test_name = match.group(1).strip()
                value = match.group(2)
                unit = match.group(3) if match.group(3) else ""
                ref_low = match.group(4) if match.group(4) else None
                ref_high = match.group(5) if match.group(5) else None
                
                results[test_name.lower()] = {
                    'value': float(value),
                    'unit': unit,
                    'reference_low': float(ref_low) if ref_low else None,
                    'reference_high': float(ref_high) if ref_high else None,
                    'original_line': line.strip()
                }
        
        return results
    
    def extract_from_pdf(self, pdf_path):
        """Extract and parse PDF content"""
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
        """Get specific test value by name"""
        test_name_lower = test_name.lower()
        
        # Try exact match first
        if test_name_lower in self.parsed_data:
            return self.parsed_data[test_name_lower]
        
        # Try partial match
        for key in self.parsed_data:
            if test_name_lower in key or key in test_name_lower:
                return self.parsed_data[key]
        
        return None

# Global parser instance
report_parser = MedicalReportParser()

# ---------------------
# Load Knowledge Base from Text File
# ---------------------
def load_knowledge_base(file_path="database.txt"):
    """Load medical knowledge from text file and add to vector DB"""
    if not os.path.exists(file_path):
        print(f"Knowledge base file '{file_path}' not found.")
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        
        if not text.strip():
            print("Knowledge base file is empty")
            return False
        
        # Split the text into chunks for better retrieval
        doc = Document(page_content=text, metadata={"source": "Knowledge Base"})
        chunks = splitter.split_documents([doc])
        
        if chunks:
            knowledge_db.add_documents(chunks)
            print(f"Loaded {len(chunks)} chunks from knowledge base (database.txt)")
            return True
        else:
            print("No valid chunks created from knowledge base")
            return False
            
    except Exception as e:
        print(f"Error loading knowledge base: {e}")
        return False

# ---------------------
# Upload & Add Report PDF
# ---------------------
def add_medical_report(pdf_path):
    """Extract text from PDF and add to DB with structured parsing"""
    global report_parser
    
    print("\n" + "=" * 70)
    print("PARSING MEDICAL REPORT")
    print("=" * 70)
    
    # Parse the report
    parsed_data = report_parser.extract_from_pdf(pdf_path)
    
    if parsed_data and len(parsed_data) > 0:
        print(f"\nSuccessfully parsed {len(parsed_data)} test values:\n")
        for test_name, data in parsed_data.items():
            status = ""
            if data['reference_low'] and data['reference_high']:
                if data['value'] < data['reference_low']:
                    status = " LOW"
                elif data['value'] > data['reference_high']:
                    status = " HIGH"
                else:
                    status = " NORMAL"
                print(f"  {test_name.title()}: {data['value']} {data['unit']} (Ref: {data['reference_low']}-{data['reference_high']}){status}")
            else:
                print(f"  {test_name.title()}: {data['value']} {data['unit']}")
        
        print(f"\nAsk me: 'What is my [test name]?' to get detailed explanations")
    else:
        print("\nNo test values found in PDF")
        print("The PDF might have a different format")
        print("You can still ask general health questions from database.txt")
    
    print("=" * 70)

# ---------------------
# LLM Setup with Groq (Strongest Model - Llama 3.1 70B)
# ---------------------
def initialize_llm():
    """Initialize LLM using Groq API with strongest available model"""
    print("\nInitializing AI with Groq (trying strongest available models)...")
    
    if not GROQ_API_KEY:
        print("No Groq API key provided. Continuing without AI features.")
        return None
    
    try:
        from groq import Groq
        
        # Initialize Groq client
        client = Groq(api_key=GROQ_API_KEY)
        
        # Try multiple models in order of preference (strongest first)
        models_to_try = [
            "openai/gpt-oss-120b"  # Latest and strongest
            # "llama-3.1-70b-versatile",  # Previous version
            # "llama3-70b-8192",          # Alternative naming
            # "mixtral-8x7b-32768",       # Backup option
            # "llama-3.1-8b-instant",     # Fastest fallback
        ]
        
        for model_name in models_to_try:
            try:
                print(f"Testing {model_name}...")
                
                # Test the model
                test_response = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": "Hello"}],
                    max_tokens=20,
                    temperature=0.7,
                )
                
                if test_response and test_response.choices:
                    print(f"Successfully loaded {model_name}")
                    
                    class GroqWrapper:
                        def __init__(self, client, model):
                            self.client = client
                            self.model = model
                        
                        def invoke(self, prompt):
                            try:
                                response = self.client.chat.completions.create(
                                    model=self.model,
                                    messages=[
                                        {
                                            "role": "system",
                                            "content": "You are a knowledgeable and empathetic medical assistant. Provide clear, accurate information based on the medical context given. Explain complex concepts in simple terms. Be supportive and reassuring while remaining truthful."
                                        },
                                        {
                                            "role": "user",
                                            "content": prompt
                                        }
                                    ],
                                    max_tokens=600,
                                    temperature=0.7,
                                )
                                return response.choices[0].message.content
                            except Exception as e:
                                print(f"Generation error: {str(e)[:100]}")
                                return ""
                    
                    return GroqWrapper(client, model_name)
                    
            except Exception as e:
                error_msg = str(e)
                if "decommissioned" in error_msg or "not supported" in error_msg:
                    print(f"{model_name} is no longer available, trying next...")
                else:
                    print(f"{model_name} failed: {error_msg[:100]}")
                continue
        
        print("\nAll models failed. Continuing without AI features.")
        return None
        
    except ImportError:
        print("Groq package not installed. Run: pip install groq")
        return None
    except Exception as e:
        print(f"Groq initialization failed: {str(e)[:150]}")
        return None

def post_process_llm_response(answer, query):
    """Clean up LLM response to be more natural and conversational"""
    if not answer:
        return answer
    
    # Remove common LLM artifacts
    answer = answer.replace("Based on the context,", "")
    answer = answer.replace("According to the information provided,", "")
    answer = answer.replace("The medical knowledge states that", "")
    answer = answer.replace("Based on the medical knowledge,", "")
    
    # Remove repetitive phrases at start
    if answer.startswith("Answer:") or answer.startswith("Response:"):
        answer = answer.split(":", 1)[1].strip()
    
    # Ensure first letter is capitalized
    if answer:
        answer = answer[0].upper() + answer[1:]
    
    return answer.strip()

llm = initialize_llm()

# ---------------------
# Enhanced Query Handler
# ---------------------
def detect_test_value_query(query):
    """Detect if user is asking for a specific test value or report summary"""
    query_lower = query.lower()
    
    # Check for report summary request
    summary_keywords = ['summary', 'summarize', 'summarise', 'overview', 'report summary', 
                        'overall', 'all results', 'complete report', 'full report']
    if any(keyword in query_lower for keyword in summary_keywords):
        return "SUMMARY"
    
    # Check for CBC/complete blood count
    if any(term in query_lower for term in ['cbc', 'complete blood count', 'blood count']):
        return "CBC"
    
    # Keywords that indicate user wants their specific value
    value_keywords = ['my', 'what is my', 'what are my', 'show my', 'tell me my']
    
    if any(keyword in query_lower for keyword in value_keywords):
        test_names = ['hemoglobin', 'haemoglobin', 'rbc', 'wbc', 'platelet', 
                     'glucose', 'cholesterol', 'hba1c', 'esr', 'creatinine',
                     'blood sugar', 'thyroid', 'tsh', 'vitamin', 'iron', 
                     'calcium', 'hematocrit', 'mcv', 'mch', 'mchc']
        
        for test_name in test_names:
            if test_name in query_lower:
                return test_name
    
    return None

def generate_report_summary():
    """Generate a comprehensive summary of the medical report with AI insights"""
    if not report_parser.parsed_data:
        return "No medical report has been loaded yet. Please upload a PDF report first."
    
    # Categorize tests
    normal_tests = []
    abnormal_tests = []
    
    for test_name, data in report_parser.parsed_data.items():
        # Skip metadata fields
        if test_name.lower() in ['by', 'lab id', 'registration on', 'collected on', 
                                  'sample id', 'injection number', 'run number', 
                                  'rack id', 'tube number', 'report generated', 'total area']:
            continue
        
        if data['reference_low'] and data['reference_high']:
            if data['value'] < data['reference_low']:
                abnormal_tests.append((test_name, data, "LOW"))
            elif data['value'] > data['reference_high']:
                abnormal_tests.append((test_name, data, "HIGH"))
            else:
                normal_tests.append((test_name, data))
    
    # Build summary
    summary = "=" * 70 + "\n"
    summary += "MEDICAL REPORT SUMMARY\n"
    summary += "=" * 70 + "\n\n"
    
    # Overall status
    total_tests = len(normal_tests) + len(abnormal_tests)
    summary += f"Overall Status:\n"
    summary += f"  Total Tests: {total_tests}\n"
    summary += f"  Normal: {len(normal_tests)}\n"
    summary += f"  Abnormal: {len(abnormal_tests)}\n\n"
    
    # Abnormal findings (most important)
    if abnormal_tests:
        summary += "ABNORMAL FINDINGS (Require Attention):\n\n"
        for test_name, data, status in abnormal_tests:
            summary += f"  {test_name.title()}: {data['value']} {data['unit']} "
            summary += f"[{status}]\n"
            summary += f"     Reference Range: {data['reference_low']}-{data['reference_high']} {data['unit']}\n"
            
            # Get AI to explain the significance
            try:
                retriever = knowledge_db.as_retriever(search_kwargs={"k": 2})
                results = retriever.invoke(f"{test_name} {status.lower()} causes risks health")
                
                if results and llm:
                    context = " ".join([r.page_content for r in results[:2]])[:400]
                    
                    # Use AI to generate natural explanation
                    explain_prompt = f"""Based on this medical information:
{context}

Explain in ONE clear sentence what it means when {test_name} is {status.lower()} ({data['value']} {data['unit']}):"""
                    
                    try:
                        explanation = llm.invoke(explain_prompt)
                        exp_text = post_process_llm_response(explanation.strip(), "")
                        
                        if exp_text and len(exp_text) > 20 and len(exp_text) < 300:
                            summary += f"     {exp_text}\n"
                        elif results:
                            # Fallback to first 150 chars of context
                            summary += f"     {results[0].page_content[:150]}...\n"
                    except Exception as e:
                        print(f"LLM explanation error for {test_name}: {str(e)[:80]}")
                        if results:
                            summary += f"     {results[0].page_content[:150]}...\n"
                            
                elif results:
                    # No LLM - use database directly
                    summary += f"     {results[0].page_content[:200]}...\n"
            except Exception as e:
                print(f"Error retrieving info for {test_name}: {str(e)[:80]}")
                pass
            summary += "\n"
    else:
        summary += "All measured tests are within normal range!\n\n"
    
    # Normal findings (brief)
    if normal_tests:
        summary += "NORMAL FINDINGS:\n\n"
        for test_name, data in normal_tests[:10]:  # Show first 10
            summary += f"  {test_name.title()}: {data['value']} {data['unit']} "
            summary += f"(Ref: {data['reference_low']}-{data['reference_high']})\n"
        
        if len(normal_tests) > 10:
            summary += f"\n  ... and {len(normal_tests) - 10} more tests in normal range\n"
    
    # Add AI-generated overall interpretation if available
    if abnormal_tests and llm:
        summary += "\n" + "-" * 70 + "\n"
        summary += "Overall Health Interpretation:\n\n"
        
        try:
            abnormal_list = ", ".join([f"{name} is {status}" for name, _, status in abnormal_tests[:3]])
            overall_prompt = f"""You are a caring doctor. A patient's blood test shows:
- {len(normal_tests)} tests are normal
- Abnormal findings: {abnormal_list}

In 2-3 friendly sentences, briefly explain what this means for the patient's health and what they should know. Be reassuring but honest.

Your response:"""
            
            print("Generating overall health interpretation...")
            overall_response = llm.invoke(overall_prompt)
            overall_text = post_process_llm_response(overall_response.strip(), "")
            
            if overall_text and len(overall_text) > 30:
                summary += f"{overall_text}\n"
            else:
                # Fallback if AI response is too short
                summary += f"Your report shows mostly normal results with {len(abnormal_tests)} findings that need attention. "
                summary += f"The abnormal values ({', '.join([name for name, _, _ in abnormal_tests[:2]])}) should be discussed with your doctor to determine if any action is needed.\n"
        except Exception as e:
            print(f"Could not generate overall interpretation: {str(e)[:100]}")
            # Provide fallback interpretation
            summary += f"Your report shows mostly normal results with {len(abnormal_tests)} findings that need attention. "
            summary += f"Please consult your doctor about the abnormal values to determine the next steps.\n"
    
    summary += "\n" + "=" * 70 + "\n"
    summary += "Recommendations:\n"
    if abnormal_tests:
        summary += "  Consult your doctor about the abnormal findings\n"
        summary += "  Ask me for details: 'What is my [test name]?'\n"
    else:
        summary += "  Great! All tests are normal\n"
        summary += "  Continue maintaining a healthy lifestyle\n"
    
    summary += "\nThis is an automated summary. Please consult your healthcare provider for proper interpretation and advice.\n"
    summary += "=" * 70
    
    return summary

def generate_cbc_summary():
    """Generate CBC (Complete Blood Count) specific summary"""
    cbc_tests = ['hemoglobin', 'rbc', 'wbc', 'platelet', 'hematocrit', 'mcv', 'mch', 'mchc', 'rdw']
    
    summary = "=" * 70 + "\n"
    summary += "COMPLETE BLOOD COUNT (CBC) SUMMARY\n"
    summary += "=" * 70 + "\n\n"
    
    found_tests = []
    abnormal_cbc = []
    
    for cbc_test in cbc_tests:
        for test_name, data in report_parser.parsed_data.items():
            if cbc_test in test_name.lower():
                found_tests.append((test_name, data))
                
                if data['reference_low'] and data['reference_high']:
                    if data['value'] < data['reference_low'] or data['value'] > data['reference_high']:
                        status = "LOW" if data['value'] < data['reference_low'] else "HIGH"
                        abnormal_cbc.append((test_name, data, status))
    
    if not found_tests:
        return "No CBC tests found in your report."
    
    # Show all CBC results
    for test_name, data in found_tests:
        status_text = "NORMAL"
        if data['reference_low'] and data['reference_high']:
            if data['value'] < data['reference_low']:
                status_text = "LOW"
            elif data['value'] > data['reference_high']:
                status_text = "HIGH"
        
        summary += f"{status_text} {test_name.title()}: {data['value']} {data['unit']}"
        if data['reference_low'] and data['reference_high']:
            summary += f" (Ref: {data['reference_low']}-{data['reference_high']})\n"
        else:
            summary += "\n"
    
    summary += "\n" + "-" * 70 + "\n"
    summary += "Clinical Interpretation:\n\n"
    
    if abnormal_cbc:
        for test_name, data, status in abnormal_cbc:
            summary += f"{test_name.title()} is {status}\n"
            
            # Get context from database
            try:
                retriever = knowledge_db.as_retriever(search_kwargs={"k": 2})
                results = retriever.invoke(f"{test_name} {status.lower()} causes")
                if results:
                    context = results[0].page_content[:250]
                    summary += f"   {context}...\n\n"
            except:
                summary += "\n"
    else:
        summary += "All CBC parameters are within normal range.\n"
        summary += "This indicates healthy blood cell production and function.\n"
    
    summary += "\nPlease consult your doctor for detailed interpretation.\n"
    summary += "=" * 70
    
    return summary

def create_enhanced_prompt(query, context, user_test_data=None):
    """Create a prompt that allows LLM to use its knowledge with database as reference"""
    
    base_prompt = f"""You are a knowledgeable medical assistant with expertise in health and medicine.

A user has asked you a health-related question. You have access to a medical knowledge database that may contain relevant information.

Medical Reference Context (from database.txt):
{context}

"""
    
    if user_test_data:
        base_prompt += f"""Patient's Test Results:
{user_test_data}

"""
    
    base_prompt += f"""User's Question: {query}

Instructions:
1. Use your medical knowledge to provide a comprehensive, accurate answer
2. Reference the database context above when it contains relevant information
3. If the database has useful facts, incorporate them naturally into your explanation
4. If the database lacks information but you know the answer, provide it using your own knowledge
5. Explain concepts clearly in simple, conversational language
6. Be helpful, empathetic, and supportive
7. If you're uncertain about medical facts, say so and recommend consulting a healthcare provider

Remember: You're a medical assistant having a natural conversation. Use the database as a reference source, but don't limit yourself to only what's in it. Think, reason, and provide helpful medical guidance.

Your response:"""
    
    return base_prompt

def generate_personalized_response_for_test(test_name, test_data, query):
    """Generate a personalized response using AI for test value queries"""
    
    # Get relevant context about this test from knowledge base
    try:
        retriever = knowledge_db.as_retriever(search_kwargs={"k": 3})
        search_query = f"{test_name} levels normal range clinical significance"
        results = retriever.invoke(search_query)
        kb_results = [doc for doc in results if doc.metadata.get('source') == 'Knowledge Base']
        context = "\n\n".join([doc.page_content for doc in kb_results]) if kb_results else ""
    except Exception as e:
        print(f"Error retrieving context: {e}")
        context = ""
    
    # Build patient-specific data
    patient_info = f"""Test: {test_name.title()}
Your Value: {test_data['value']} {test_data['unit']}
Reference Range: {test_data['reference_low']}-{test_data['reference_high']} {test_data['unit']}
"""
    
    # Determine status
    if test_data['value'] < test_data['reference_low']:
        status = "below the normal range (Low)"
        status_label = "LOW"
    elif test_data['value'] > test_data['reference_high']:
        status = "above the normal range (High)"
        status_label = "HIGH"
    else:
        status = "within the normal range (Normal)"
        status_label = "NORMAL"
    
    patient_info += f"Status: {status}\n"
    
    if llm is None:
        # Fallback response without AI
        response = f"Your {test_name.title()} Results:\n\n"
        response += patient_info
        if context:
            response += f"\nFrom Medical Database:\n{context[:400]}..."
        else:
            response += f"\nI don't have specific information about {test_name} in the database."
        response += "\n\nPlease consult your doctor for interpretation."
        return response
    
    # Create personalized prompt - allowing LLM to use its knowledge
    prompt = f"""You are a caring doctor explaining test results to your patient.

Patient's Test Result:
{patient_info}

Reference Information from Medical Database:
{context if context else "No specific reference information available in database."}

Patient asks: "{query}"

As a knowledgeable doctor:
1. Explain what this test measures in simple terms
2. Tell them what their specific result means for their health
3. If it's abnormal, explain possible causes (use your medical knowledge)
4. Provide practical advice or what they should know
5. Be warm, reassuring, and supportive

Use the database reference if helpful, but also draw on your medical expertise. Keep it conversational and under 200 words.

Your explanation:"""
    
    try:
        response = llm.invoke(prompt)
        answer = response.strip()
        answer = post_process_llm_response(answer, query)
        
        # Add header
        final_response = f"Your {test_name.title()} Results:\n\n{patient_info}\n"
        final_response += f"Doctor's Explanation:\n{answer}\n"
        final_response += "\nNote: Please consult your healthcare provider for personalized medical advice."
        
        return final_response
        
    except Exception as e:
        print(f"AI Error: {str(e)[:100]}")
        # Fallback
        return f"""Your {test_name.title()} Results:

{patient_info}

From Medical Database:

{context[:500] if context else 'No specific information available.'}

Please consult your doctor for interpretation."""

def medical_chatbot(query):
    """Enhanced medical chatbot - LLM uses its knowledge with database as reference"""
    try:
        # Check if user is asking for a specific test value or summary
        test_name = detect_test_value_query(query)
        
        # Handle report summary request
        if test_name == "SUMMARY":
            return generate_report_summary()
        
        # Handle CBC summary request
        if test_name == "CBC":
            return generate_cbc_summary()
        
        # Handle specific test value queries
        if test_name and test_name not in ["SUMMARY", "CBC"] and report_parser.parsed_data:
            test_data = report_parser.get_test_value(test_name)
            
            if test_data:
                return generate_personalized_response_for_test(test_name, test_data, query)
            else:
                available_tests = ', '.join([k.title() for k in list(report_parser.parsed_data.keys())[:8]])
                return f"I couldn't find '{test_name}' in your medical report.\n\nAvailable tests include: {available_tests}...\n\nTry: 'summarize my report' for an overview\nOr ask about one of the tests listed above."
        
        # For general questions: Search database.txt as reference, but let LLM use its knowledge
        print("Searching database.txt for reference information...")
        
        try:
            # Retrieve relevant information
            retriever = knowledge_db.as_retriever(search_kwargs={"k": 4})
            results = retriever.invoke(query)
            kb_results = [doc for doc in results if doc.metadata.get('source') == 'Knowledge Base']
            
            if kb_results:
                context = "\n\n".join([doc.page_content for doc in kb_results])
                print(f"Found {len(kb_results)} relevant passages from database.txt")
            else:
                context = ""
                print("No relevant information found in database.txt")
            
        except Exception as e:
            print(f"Error retrieving from knowledge base: {e}")
            context = ""
        
        # Generate response using LLM (with or without database context)
        if llm is None:
            # Fallback without AI
            if context:
                return f"""Based on medical database (database.txt):

{context[:700]}...

This information is from the medical knowledge base.

For personalized medical advice, please consult your healthcare provider."""
            else:
                return f"""I don't have specific information about "{query}" in my database.

However, I recommend consulting your healthcare provider who can give you personalized medical advice based on your specific situation."""
        
        # Include patient test summary if available
        user_test_summary = None
        if report_parser.parsed_data:
            test_list = [f"{k.title()}: {v['value']} {v['unit']}" 
                        for k, v in list(report_parser.parsed_data.items())[:3]]
            user_test_summary = "Available patient data:\n" + "\n".join(test_list)
        
        # Create prompt that allows LLM to use its knowledge
        prompt = create_enhanced_prompt(query, context if context else "No specific reference found in database.", user_test_summary)
        
        try:
            response = llm.invoke(prompt)
            answer = response.strip()
            answer = post_process_llm_response(answer, query)
            
            # If response is very short, it might have failed
            if len(answer) < 20:
                return f"""I can provide some general information about your question.

{context[:500] if context else "I don't have specific information in my database about this topic, but I recommend consulting a healthcare provider who can give you personalized guidance."}

For personalized medical advice, please consult your healthcare provider."""
            
            # Add appropriate disclaimer
            if "consult" not in answer.lower() and "doctor" not in answer.lower() and "healthcare" not in answer.lower():
                answer += "\n\nFor personalized medical advice, please consult your healthcare provider."
            
            return answer
            
        except Exception as e:
            print(f"Error getting AI response: {e}")
            if context:
                return f"""Based on available medical information:

{context[:600]}

For personalized medical advice, please consult your healthcare provider."""
            else:
                return "I encountered an error processing your question. Please try rephrasing or consult a healthcare provider."
            
    except Exception as e:
        return f"Sorry, I encountered an error: {e}\n\nPlease try rephrasing your question."

# ---------------------
# Main execution
# ---------------------
def main():
    """Main function with error handling"""
    print("=" * 70)
    print("MEDICAL CHATBOT - Powered by Groq AI")
    print("=" * 70)
    print()
    
    # Load medical report PDF
    print("LOAD MEDICAL REPORT PDF")
    print("=" * 70)
    
    # Show available PDFs in current directory
    available_pdfs = [f for f in os.listdir('.') if f.endswith('.pdf')]
    if available_pdfs:
        print("\nAvailable PDFs in current directory:")
        for i, file in enumerate(available_pdfs, 1):
            print(f"  {i}. {file}")
        print()
    
    # Ask user for PDF path
    pdf_input = input("Enter PDF filename (or press Enter to skip): ").strip()
    
    if pdf_input:
        pdf_path = pdf_input
        if os.path.exists(pdf_path):
            print(f"Loading PDF: {pdf_path}")
            add_medical_report(pdf_path)
        else:
            print(f"PDF file '{pdf_path}' not found. Continuing without PDF.")
    else:
        print("No PDF loaded. You can still ask general health questions.")
    
    print()
    
    # Load knowledge base from database.txt ONLY
    print("\nLoading knowledge base from database.txt...")
    kb_loaded = load_knowledge_base("database.txt")
    
    if not kb_loaded:
        print("ERROR: Knowledge base (database.txt) not loaded!")
        print("The chatbot requires database.txt to function.")
        return
    
    print()
    print("=" * 70)
    print("MEDICAL CHATBOT READY!")
    print("=" * 70)
    print()
    print("What I can do:")
    print("   Get report summary: 'summarize my report' or 'report overview'")
    print("   Get CBC summary: 'my CBC' or 'complete blood count'")
    print("   Specific test: 'What is my hemoglobin level?'")
    print("   Health questions: 'What causes high cholesterol?'")
    print("   Medical info: 'Tell me about diabetes'")
    print()
    if llm:
        print("AI Status: ENABLED - Groq AI with Medical Reasoning")
        print("  Uses database.txt as reference")
        print("  Applies medical knowledge and reasoning")
        print("  Provides natural, comprehensive answers")
    else:
        print("AI Status: DISABLED - Basic mode (Direct database access)")
        print("  Responses from database.txt only")
        print("  No AI-enhanced explanations")
    print()
    print("Database.txt is used as reference, not the only source")
    print("AI can use its medical knowledge to provide comprehensive answers")
    print()
    print("Type 'exit' to quit")
    print("-" * 70)
    print()
    
    while True:
        try:
            query = input("You: ").strip()
            if not query:
                continue
            if query.lower() in ['exit', 'quit', 'bye']:
                print("\nThank you for using the Medical Chatbot. Stay healthy!")
                break
            
            print()
            answer = medical_chatbot(query)
            print(f"Assistant:\n{answer}\n")
            print("-" * 70)
            print()
            
        except KeyboardInterrupt:
            print("\n\nThank you for using the Medical Chatbot. Stay healthy!")
            break
        except Exception as e:
            print(f"An error occurred: {e}")
            continue

if __name__ == "__main__":
    main()