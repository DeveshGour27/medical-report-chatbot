import os
import re
import PyPDF2
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.schema import Document
from dotenv import load_dotenv

load_dotenv()

# ---------------------
# Environment setup
# ---------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing. Please add it to your .env file.")

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
                    status = " ⬇️ LOW"
                elif data['value'] > data['reference_high']:
                    status = " ⬆️ HIGH"
                else:
                    status = " ✅ NORMAL"
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
# LLM Setup with Groq
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
        
        # Try multiple models in order of preference
        models_to_try = [
            "llama-3.3-70b-versatile",
            "llama-3.1-70b-versatile",
            "llama3-70b-8192",
            "mixtral-8x7b-32768",
            "llama-3.1-8b-instant",
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
                    print(f"✅ Successfully loaded {model_name}")
                    
                    class GroqWrapper:
                        def __init__(self, client, model):
                            self.client = client
                            self.model = model
                        
                        def invoke(self, prompt, use_structured_system=False):
                            try:
                                # Use appropriate system message
                                if use_structured_system:
                                    system_msg = """You are MedAI, a medical chatbot that ALWAYS provides structured, well-formatted responses.

CRITICAL RULES:
1. ALWAYS use emojis (🔬, 📌, 📊, 🧬, etc.) for section headers
2. ALWAYS use markdown formatting (**, ###, bullet points)
3. NEVER write plain paragraphs without structure
4. ALWAYS follow the exact format provided in the prompt
5. Be conversational but keep the structure intact

Your responses should look professional, organized, and easy to read."""
                                else:
                                    system_msg = "You are a knowledgeable and empathetic medical assistant who provides clear, accurate health information in a conversational tone."
                                
                                response = self.client.chat.completions.create(
                                    model=self.model,
                                    messages=[
                                        {
                                            "role": "system",
                                            "content": system_msg
                                        },
                                        {
                                            "role": "user",
                                            "content": prompt
                                        }
                                    ],
                                    max_tokens=800,
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
                    print(f"❌ {model_name} is no longer available, trying next...")
                else:
                    print(f"❌ {model_name} failed: {error_msg[:100]}")
                continue
        
        print("\n❌ All models failed. Continuing without AI features.")
        return None
        
    except ImportError:
        print("Groq package not installed. Run: pip install groq")
        return None
    except Exception as e:
        print(f"Groq initialization failed: {str(e)[:150]}")
        return None

def post_process_llm_response(answer, query, is_structured=False):
    """Clean up LLM response - MINIMAL processing for structured responses"""
    if not answer:
        return answer
    
    # If this is a structured response, do MINIMAL cleanup
    if is_structured:
        # Only remove very specific AI artifacts that don't belong
        answer = answer.replace("Based on the context,", "")
        answer = answer.replace("According to the information provided,", "")
        # Keep all emojis, markdown, and structure intact
        return answer.strip()
    
    # For general responses, do normal cleanup
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

def generate_personalized_response_for_test(test_name, test_data, query):
    """Generate a structured, friendly medical response for a specific test."""

    # Determine status
    if test_data['reference_low'] and test_data['reference_high']:
        if test_data['value'] < test_data['reference_low']:
            status = "Low ⬇️"
            status_emoji = "🔵"
        elif test_data['value'] > test_data['reference_high']:
            status = "High ⬆️"
            status_emoji = "🔴"
        else:
            status = "Normal ✅"
            status_emoji = "🟢"
    else:
        status = "Recorded"
        status_emoji = "📝"

    # Build the EXACT structured prompt
    prompt = f"""You are MedAI, a medical chatbot. The user asked about their {test_name} test result.

Their data:
- Test: {test_name.title()}
- Value: {test_data['value']} {test_data['unit']}
- Reference Range: {test_data['reference_low']} – {test_data['reference_high']} {test_data['unit']}
- Status: {status}

YOU MUST respond in this EXACT format with ALL sections:

🔬 **{test_name.title()}**
{status_emoji} **Your Value:** {test_data['value']} {test_data['unit']}
📊 **Normal Range:** {test_data['reference_low']} – {test_data['reference_high']} {test_data['unit']}
**Status:** {status}

---

### 🧬 What This Test Measures
[Write 2-3 bullet points explaining what {test_name} measures in simple terms]

### 📈 What Your Result Means
[Explain what THIS specific value ({test_data['value']} {test_data['unit']}) means for the patient - is it good, concerning, or needs attention?]

### ⚠️ Should You Be Concerned?
[Give clear guidance - if normal, reassure them. If abnormal, explain what they should do next]

### 💬 MedAI's Insight
[Write 1-2 warm, conversational sentences like you're a caring doctor talking to them]

### 📝 Quick Summary
[One short sentence summarizing everything]

---

⚠️ **Important:** This is automated analysis. Please consult your healthcare provider for personalized medical advice.

REMEMBER: Use ALL emojis, markdown formatting, and keep the exact structure. Make it look professional and organized!"""

    try:
        if llm:
            response = llm.invoke(prompt, use_structured_system=True)
            # MINIMAL post-processing to preserve structure
            return post_process_llm_response(response.strip(), query, is_structured=True)
        else:
            # Fallback if LLM is not available
            return f"""🔬 **{test_name.title()}**
{status_emoji} **Your Value:** {test_data['value']} {test_data['unit']}
📊 **Normal Range:** {test_data['reference_low']} – {test_data['reference_high']} {test_data['unit']}
**Status:** {status}

---

⚠️ AI is currently unavailable. Please consult your healthcare provider for interpretation of this result.

---

⚠️ **Important:** This is automated analysis. Please consult your healthcare provider for personalized medical advice."""

    except Exception as e:
        print(f"❌ AI Error: {str(e)[:100]}")
        return f"""🔬 **{test_name.title()}**
{status_emoji} **Your Value:** {test_data['value']} {test_data['unit']}
📊 **Normal Range:** {test_data['reference_low']} – {test_data['reference_high']} {test_data['unit']}
**Status:** {status}

---

⚠️ Unable to generate detailed analysis right now. Please consult your healthcare provider.

---

⚠️ **Important:** Please consult your healthcare provider for personalized medical advice."""

def generate_report_summary():
    """Generate a comprehensive summary of the medical report"""
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
                abnormal_tests.append((test_name, data, "LOW ⬇️"))
            elif data['value'] > data['reference_high']:
                abnormal_tests.append((test_name, data, "HIGH ⬆️"))
            else:
                normal_tests.append((test_name, data))
    
    # Build summary
    summary = "=" * 70 + "\n"
    summary += "📋 MEDICAL REPORT SUMMARY\n"
    summary += "=" * 70 + "\n\n"
    
    # Overall status
    total_tests = len(normal_tests) + len(abnormal_tests)
    summary += f"📊 **Overall Status:**\n"
    summary += f"  • Total Tests: {total_tests}\n"
    summary += f"  • ✅ Normal: {len(normal_tests)}\n"
    summary += f"  • ⚠️ Abnormal: {len(abnormal_tests)}\n\n"
    
    # Abnormal findings (most important)
    if abnormal_tests:
        summary += "🔴 **ABNORMAL FINDINGS** (Require Attention):\n\n"
        for test_name, data, status in abnormal_tests:
            summary += f"  • **{test_name.title()}**: {data['value']} {data['unit']} [{status}]\n"
            summary += f"     📊 Reference: {data['reference_low']}-{data['reference_high']} {data['unit']}\n"
            summary += "\n"
    else:
        summary += "✅ **All measured tests are within normal range!**\n\n"
    
    # Normal findings (brief)
    if normal_tests:
        summary += "🟢 **NORMAL FINDINGS:**\n\n"
        for test_name, data in normal_tests[:10]:
            summary += f"  • {test_name.title()}: {data['value']} {data['unit']}\n"
        
        if len(normal_tests) > 10:
            summary += f"\n  ... and {len(normal_tests) - 10} more tests in normal range\n"
    
    summary += "\n" + "=" * 70 + "\n"
    summary += "💡 **Recommendations:**\n"
    if abnormal_tests:
        summary += "  • Consult your doctor about the abnormal findings\n"
        summary += "  • Ask me: 'What is my [test name]?' for detailed explanations\n"
    else:
        summary += "  • Great! All tests are normal\n"
        summary += "  • Continue maintaining a healthy lifestyle\n"
    
    summary += "\n⚠️ This is an automated summary. Please consult your healthcare provider for proper interpretation.\n"
    summary += "=" * 70
    
    return summary

def generate_cbc_summary():
    """Generate CBC (Complete Blood Count) specific summary"""
    cbc_tests = ['hemoglobin', 'rbc', 'wbc', 'platelet', 'hematocrit', 'mcv', 'mch', 'mchc', 'rdw']
    
    summary = "=" * 70 + "\n"
    summary += "🩸 COMPLETE BLOOD COUNT (CBC) SUMMARY\n"
    summary += "=" * 70 + "\n\n"
    
    found_tests = []
    abnormal_cbc = []
    
    for cbc_test in cbc_tests:
        for test_name, data in report_parser.parsed_data.items():
            if cbc_test in test_name.lower():
                found_tests.append((test_name, data))
                
                if data['reference_low'] and data['reference_high']:
                    if data['value'] < data['reference_low'] or data['value'] > data['reference_high']:
                        status = "LOW ⬇️" if data['value'] < data['reference_low'] else "HIGH ⬆️"
                        abnormal_cbc.append((test_name, data, status))
    
    if not found_tests:
        return "No CBC tests found in your report."
    
    # Show all CBC results
    for test_name, data in found_tests:
        status_text = "✅ NORMAL"
        if data['reference_low'] and data['reference_high']:
            if data['value'] < data['reference_low']:
                status_text = "⬇️ LOW"
            elif data['value'] > data['reference_high']:
                status_text = "⬆️ HIGH"
        
        summary += f"{status_text} **{test_name.title()}**: {data['value']} {data['unit']}"
        if data['reference_low'] and data['reference_high']:
            summary += f" (Ref: {data['reference_low']}-{data['reference_high']})\n"
        else:
            summary += "\n"
    
    summary += "\n" + "-" * 70 + "\n"
    summary += "📋 **Clinical Interpretation:**\n\n"
    
    if abnormal_cbc:
        for test_name, data, status in abnormal_cbc:
            summary += f"• {test_name.title()} is {status}\n"
    else:
        summary += "✅ All CBC parameters are within normal range.\n"
        summary += "This indicates healthy blood cell production and function.\n"
    
    summary += "\n⚠️ Please consult your doctor for detailed interpretation.\n"
    summary += "=" * 70
    
    return summary

def create_enhanced_prompt(query, context, user_test_data=None):
    """Create a prompt for general medical questions"""
    
    base_prompt = f"""You are a knowledgeable medical assistant with expertise in health and medicine.

A user has asked you a health-related question. You have access to a medical knowledge database.

Medical Reference Context:
{context}

"""
    
    if user_test_data:
        base_prompt += f"""Patient's Test Results:
{user_test_data}

"""
    
    base_prompt += f"""User's Question: {query}

Instructions:
1. Provide a comprehensive, accurate answer
2. Use the database context when it contains relevant information
3. Explain concepts clearly in simple language
4. Be helpful, empathetic, and supportive
5. If uncertain, recommend consulting a healthcare provider

Your response:"""
    
    return base_prompt

def medical_chatbot(query):
    """Enhanced medical chatbot with structured responses"""
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
                return f"❌ I couldn't find '{test_name}' in your medical report.\n\n📋 **Available tests:** {available_tests}...\n\n💡 Try:\n  • 'summarize my report' for an overview\n  • Ask about one of the tests listed above"
        
        # For general questions
        print("🔍 Searching database.txt for reference information...")
        
        try:
            retriever = knowledge_db.as_retriever(search_kwargs={"k": 4})
            results = retriever.invoke(query)
            kb_results = [doc for doc in results if doc.metadata.get('source') == 'Knowledge Base']
            
            if kb_results:
                context = "\n\n".join([doc.page_content for doc in kb_results])
                print(f"✅ Found {len(kb_results)} relevant passages")
            else:
                context = ""
                print("⚠️ No relevant information found in database.txt")
            
        except Exception as e:
            print(f"❌ Error retrieving from knowledge base: {e}")
            context = ""
        
        # Generate response using LLM
        if llm is None:
            if context:
                return f"""📚 **Based on medical database:**

{context[:700]}...

⚠️ For personalized medical advice, please consult your healthcare provider."""
            else:
                return f"""❌ I don't have specific information about "{query}" in my database.

💡 I recommend consulting your healthcare provider for personalized medical advice."""
        
        # Include patient test summary if available
        user_test_summary = None
        if report_parser.parsed_data:
            test_list = [f"{k.title()}: {v['value']} {v['unit']}" 
                        for k, v in list(report_parser.parsed_data.items())[:3]]
            user_test_summary = "Available patient data:\n" + "\n".join(test_list)
        
        # Create prompt
        prompt = create_enhanced_prompt(query, context if context else "No specific reference found.", user_test_summary)
        
        try:
            response = llm.invoke(prompt, use_structured_system=False)
            answer = post_process_llm_response(response.strip(), query, is_structured=False)
            
            if len(answer) < 20:
                return f"""❌ Unable to generate a proper response.

{context[:500] if context else "I recommend consulting a healthcare provider for guidance on this topic."}

⚠️ For personalized medical advice, please consult your healthcare provider."""
            
            # Add disclaimer if needed
            if "consult" not in answer.lower() and "doctor" not in answer.lower() and "healthcare" not in answer.lower():
                answer += "\n\n⚠️ For personalized medical advice, please consult your healthcare provider."
            
            return answer
            
        except Exception as e:
            print(f"❌ Error getting AI response: {e}")
            if context:
                return f"""📚 **Based on available information:**

{context[:600]}

⚠️ For personalized medical advice, please consult your healthcare provider."""
            else:
                return "❌ I encountered an error processing your question. Please try rephrasing or consult a healthcare provider."
            
    except Exception as e:
        return f"❌ Sorry, I encountered an error: {e}\n\nPlease try rephrasing your question."

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
            print(f"PDF file '{pdf_path}' not found.  Continuing without PDF.")
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
    print("   Specific test:  'What is my hemoglobin level? '")
    print("   Health questions: 'What causes high cholesterol? '")
    print("   Medical info: 'Tell me about diabetes'")
    print()
    if llm: 
        print("AI Status:  ENABLED - Groq AI with Medical Reasoning")
        print("  Uses database.txt as reference")
        print("  Applies medical knowledge and reasoning")
        print("  Provides natural, comprehensive answers")
    else:
        print("AI Status: DISABLED - Basic mode (Direct database access)")
        print("  Responses from database.txt only")
        print("  No AI-enhanced explanations")
    print()
    print("Database. txt is used as reference, not the only source")
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
                print("\nThank you for using the Medical Chatbot.  Stay healthy!")
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