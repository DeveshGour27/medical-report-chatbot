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
        
        for i, line in enumerate(lines):
            if not line.strip():
                continue
            
            # Pattern for table format
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
            
            # Alternative pattern
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
        
        if test_name_lower in self.parsed_data:
            return self.parsed_data[test_name_lower]
        
        for key in self.parsed_data:
            if test_name_lower in key or key in test_name_lower:
                return self.parsed_data[key]
        
        return None

report_parser = MedicalReportParser()

# Load Knowledge Base
def load_knowledge_base(file_path="database.txt"):
    """Load medical knowledge from text file"""
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
        else:
            print("No valid chunks created")
            return False
            
    except Exception as e:
        print(f"Error loading knowledge base: {e}")
        return False

# Initialize LLM with Groq
def initialize_llm():
    """Initialize LLM using Groq API"""
    print("\nInitializing Groq AI...")
    
    if not GROQ_API_KEY:
        print("No Groq API key provided.")
        return None
    
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
                print(f"Testing {model_name}...")
                test_response = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": "Hello"}],
                    max_tokens=20,
                    temperature=0.7,
                )
                
                if test_response and test_response.choices:
                    print(f"✓ Successfully loaded {model_name}")
                    
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
                                            "content": "You are an expert medical doctor with deep knowledge of medicine, health, and diagnostics. You provide clear, accurate, evidence-based medical information. You explain complex medical concepts in simple, accessible language while maintaining medical accuracy. You are empathetic, supportive, and always prioritize patient understanding and safety."
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
                print(f"{model_name} failed: {str(e)[:100]}")
                continue
        
        print("\nAll models failed.")
        return None
        
    except Exception as e:
        print(f"Groq initialization failed: {str(e)[:150]}")
        return None

llm = initialize_llm()

# IMPROVED PROMPT ENGINEERING
def create_intelligent_prompt(query, context_info, user_test_data=None):
    """Create a prompt that encourages AI to think and synthesize information"""
    
    prompt = f"""You are an expert medical doctor with comprehensive knowledge of medicine, diagnostics, and patient care.

PATIENT'S QUESTION: "{query}"
"""
    
    if user_test_data:
        prompt += f"""
PATIENT'S TEST RESULTS:
{user_test_data}
"""
    
    if context_info:
        prompt += f"""
RELEVANT MEDICAL INFORMATION (from knowledge base):
{context_info}

"""
    
    prompt += """INSTRUCTIONS FOR YOUR RESPONSE:
1. Use your comprehensive medical expertise to answer the question
2. Integrate relevant information from the medical knowledge base naturally
3. Synthesize and explain concepts in your own words - do not just copy text
4. Apply medical reasoning and clinical thinking
5. Structure your response clearly:
   - Direct answer to the question
   - Explanation with medical reasoning
   - Clinical significance or practical implications
   - Supportive advice when appropriate
6. Use accessible language while maintaining medical accuracy
7. Be empathetic, supportive, and conversational
8. Keep response comprehensive but focused (aim for 200-300 words)

Provide a thoughtful, medically sound response that demonstrates your expertise:"""
    
    return prompt

# Enhanced query detection
def detect_test_value_query(query):
    """Detect if user is asking for specific test value or summary"""
    query_lower = query.lower()
    
    summary_keywords = ['summary', 'summarize', 'overview', 'report summary', 
                        'all results', 'complete report', 'full report']
    if any(keyword in query_lower for keyword in summary_keywords):
        return "SUMMARY"
    
    if any(term in query_lower for term in ['cbc', 'complete blood count']):
        return "CBC"
    
    value_keywords = ['my', 'what is my', 'what are my', 'show my', 'tell me my']
    
    if any(keyword in query_lower for keyword in value_keywords):
        test_names = ['hemoglobin', 'haemoglobin', 'rbc', 'wbc', 'platelet', 
                     'glucose', 'cholesterol', 'hba1c', 'esr', 'creatinine',
                     'blood sugar', 'thyroid', 'tsh', 'vitamin', 'iron']
        
        for test_name in test_names:
            if test_name in query_lower:
                return test_name
    
    return None

def format_response_for_web(text):
    """Format response with proper HTML-like structure for web display"""
    
    # Split into paragraphs
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    
    formatted = []
    
    for para in paragraphs:
        # Check if it's a header (short line with colon or all caps)
        if len(para) < 60 and (':' in para or para.isupper()):
            formatted.append(f"**{para}**\n")
        # Check if it's a list item
        elif para.startswith(('- ', '• ', '* ', '1.', '2.', '3.')):
            formatted.append(para + '\n')
        else:
            formatted.append(para + '\n\n')
    
    return ''.join(formatted).strip()

def generate_personalized_test_response(test_name, test_data, query):
    """Generate AI-powered response about specific test"""
    
    # Get comprehensive context from knowledge base
    try:
        retriever = knowledge_db.as_retriever(search_kwargs={"k": 4})
        results = retriever.invoke(f"{test_name} levels meaning clinical significance")
        
        # Use full context from relevant documents
        if results:
            context_parts = []
            for doc in results[:3]:
                context_parts.append(doc.page_content)
            context = "\n\n".join(context_parts)
        else:
            context = ""
    except:
        context = ""
    
    # Determine status
    status = "normal"
    if test_data['reference_low'] and test_data['reference_high']:
        if test_data['value'] < test_data['reference_low']:
            status = "below normal (LOW)"
        elif test_data['value'] > test_data['reference_high']:
            status = "above normal (HIGH)"
    
    patient_info = f"""Test: {test_name.title()}
Your Value: {test_data['value']} {test_data['unit']}
Reference Range: {test_data['reference_low']}-{test_data['reference_high']} {test_data['unit']}
Status: {status}"""
    
    if llm is None:
        return f"{patient_info}\n\n{context[:600] if context else 'Please consult your doctor for interpretation.'}"
    
    # AI-powered explanation with full context
    prompt = f"""You are a caring and knowledgeable doctor explaining test results to your patient.

PATIENT'S TEST RESULT:
{patient_info}

MEDICAL KNOWLEDGE BASE INFORMATION:
{context if context else "No specific reference information available in the knowledge base."}

PATIENT'S QUESTION: "{query}"

As their doctor, provide a comprehensive explanation that:
1. Explains what this test measures and why it matters
2. Interprets their specific result in clinical context
3. If abnormal, discusses possible causes and implications
4. Provides practical guidance and next steps
5. Reassures appropriately while being honest

Use the medical information from the knowledge base to inform your response, but explain everything in your own words with clinical reasoning. Be thorough yet accessible."""
    
    try:
        response = llm.invoke(prompt)
        formatted = format_response_for_web(response.strip())
        
        final = f"**Your {test_name.title()} Results:**\n\n{patient_info}\n\n**Doctor's Explanation:**\n\n{formatted}\n\n*Note: Please consult your healthcare provider for personalized advice.*"
        return final
        
    except Exception as e:
        print(f"AI Error: {e}")
        return f"{patient_info}\n\nPlease consult your doctor for interpretation."

def generate_report_summary():
    """Generate comprehensive report summary"""
    if not report_parser.parsed_data:
        return "No medical report loaded."
    
    normal_tests = []
    abnormal_tests = []
    
    # Exclude metadata fields
    exclude = ['by', 'lab id', 'registration on', 'collected on', 
               'sample id', 'injection number', 'run number', 
               'rack id', 'tube number', 'report generated', 'total area']
    
    for test_name, data in report_parser.parsed_data.items():
        if test_name.lower() in exclude:
            continue
        
        if data['reference_low'] and data['reference_high']:
            if data['value'] < data['reference_low']:
                abnormal_tests.append((test_name, data, "LOW"))
            elif data['value'] > data['reference_high']:
                abnormal_tests.append((test_name, data, "HIGH"))
            else:
                normal_tests.append((test_name, data))
    
    total = len(normal_tests) + len(abnormal_tests)
    
    summary = f"""**MEDICAL REPORT SUMMARY**

**Overall Status:**
- Total Tests: {total}
- Normal: {len(normal_tests)}
- Abnormal: {len(abnormal_tests)}

"""
    
    if abnormal_tests:
        summary += "**ABNORMAL FINDINGS (Need Attention):**\n\n"
        for test_name, data, status in abnormal_tests:
            summary += f"• **{test_name.title()}**: {data['value']} {data['unit']} [{status}]\n"
            summary += f"  Reference: {data['reference_low']}-{data['reference_high']} {data['unit']}\n\n"
    else:
        summary += "**All tests are within normal range!**\n\n"
    
    if normal_tests[:5]:
        summary += "**NORMAL FINDINGS (Sample):**\n\n"
        for test_name, data in normal_tests[:5]:
            summary += f"• {test_name.title()}: {data['value']} {data['unit']}\n"
    
    summary += "\n*For detailed explanation of any test, ask: 'What is my [test name]?'*"
    
    return summary

def medical_chatbot(query):
    """Enhanced medical chatbot with intelligent AI responses"""
    try:
        # Check for specific queries
        test_name = detect_test_value_query(query)
        
        if test_name == "SUMMARY":
            return generate_report_summary()
        
        if test_name and test_name != "SUMMARY" and report_parser.parsed_data:
            test_data = report_parser.get_test_value(test_name)
            if test_data:
                return generate_personalized_test_response(test_name, test_data, query)
        
        # For general questions - retrieve comprehensive context
        print("🔍 Searching knowledge base...")
        
        try:
            # Adjust k based on query complexity
            query_words = len(query.split())
            k_docs = 3 if query_words < 10 else 5  # More docs for complex queries
            
            retriever = knowledge_db.as_retriever(search_kwargs={"k": k_docs})
            results = retriever.invoke(query)
            
            # Use full context from retrieved documents
            if results:
                context_parts = []
                for doc in results:
                    # Use complete document content
                    context_parts.append(doc.page_content)
                
                context_info = "\n\n---\n\n".join(context_parts)
                print(f"✓ Retrieved {len(results)} relevant documents (total: {len(context_info)} chars)")
            else:
                context_info = ""
                print("No relevant documents found")
                
        except Exception as e:
            print(f"Search error: {e}")
            context_info = ""
        
        if llm is None:
            if context_info:
                # Provide comprehensive context even without LLM
                return f"Based on medical knowledge:\n\n{context_info[:1000]}...\n\nPlease consult a healthcare provider for personalized advice."
            return "I don't have specific information. Please consult a healthcare provider."
        
        # Include patient test data if available
        user_data = None
        if report_parser.parsed_data:
            tests = list(report_parser.parsed_data.items())[:3]
            user_data = "\n".join([f"{k.title()}: {v['value']} {v['unit']}" for k, v in tests])
        
        # Create intelligent prompt with full context
        prompt = create_intelligent_prompt(query, context_info, user_data)
        
        try:
            print("🤖 Generating AI response with full context...")
            response = llm.invoke(prompt)
            
            if len(response.strip()) < 30:
                return "I'm having trouble generating a proper response. Please try rephrasing your question."
            
            formatted = format_response_for_web(response.strip())
            
            # Only add disclaimer if not already present
            if "consult" not in formatted.lower():
                formatted += "\n\n*For personalized medical advice, please consult your healthcare provider.*"
            
            return formatted
            
        except Exception as e:
            print(f"AI Error: {e}")
            if context_info:
                # Fallback with full context
                return f"Based on available medical information:\n\n{context_info[:800]}...\n\nPlease consult your healthcare provider for personalized guidance."
            return "Error processing your question. Please try again."
            
    except Exception as e:
        return f"An error occurred: {str(e)}\nPlease try rephrasing your question."

def main():
    """Main execution"""
    print("=" * 70)
    print("MEDICAL CHATBOT - AI-Powered Health Assistant")
    print("=" * 70)
    
    # Load knowledge base
    print("\n📚 Loading knowledge base...")
    if not load_knowledge_base("database.txt"):
        print("❌ Failed to load database.txt")
        return
    
    print("\n" + "=" * 70)
    print("✓ CHATBOT READY!")
    print("=" * 70)
    print("\nWhat I can do:")
    print("  • 'summarize my report' - Get report overview")
    print("  • 'What is my hemoglobin?' - Specific test info")
    print("  • 'What causes high cholesterol?' - Health questions")
    print("  • 'Tell me about diabetes' - Medical information")
    print(f"\nAI Status: {'✓ ENABLED' if llm else '✗ DISABLED'}")
    print("\nType 'exit' to quit\n")
    
    while True:
        try:
            query = input("You: ").strip()
            if not query:
                continue
            if query.lower() in ['exit', 'quit']:
                print("\nStay healthy! 👋")
                break
            
            print()
            answer = medical_chatbot(query)
            print(f"Assistant:\n{answer}\n")
            print("-" * 70 + "\n")
            
        except KeyboardInterrupt:
            print("\n\nStay healthy! 👋")
            break
        except Exception as e:
            print(f"Error: {e}")
            continue

if __name__ == "__main__":
    main()