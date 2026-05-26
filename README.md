# Medical Report Chatbot

A comprehensive AI-powered medical report analysis system that extracts lab test data from PDF files and provides intelligent, knowledge-base-driven explanations using an LLM.

## 🎯 Project Overview

This project consists of three main components working together:

1. **Frontend Dashboard** (`medreport_dashboard/`) - React UI for uploading reports and chatting
2. **Backend API** (`Backend/`) - Node.js server handling user management and file uploads
3. **RAG Pipeline** (`rag_model/`) - Python FastAPI service for PDF extraction, KB search, and LLM responses

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
│          (Dashboard, Report Upload, Chat)                   │
└────────────────┬────────────────────────────────┬───────────┘
                 │ HTTP                           │ HTTP
                 ↓                                 ↓
        ┌─────────────────┐             ┌──────────────────┐
        │  Node.js API    │             │  Python FastAPI  │
        │    (Backend)    │             │   (RAG Pipeline) │
        │                 │             │                  │
        │ • User Auth     │             │ • PDF Extraction │
        │ • Reports CRUD  │             │ • KB Search      │
        │ • File Upload   │             │ • LLM Chat       │
        │ • MongoDB       │             │ • SQLite History │
        └─────────────────┘             └──────────────────┘
                 │                             │
                 └────────────┬────────────────┘
                              ↓
                    ┌──────────────────┐
                    │  Medical KB JSON │
                    │  (25 Blood Tests)│
                    └──────────────────┘
```

## 📋 Features

### Frontend (React Dashboard)
- ✅ User authentication & account management
- ✅ PDF report upload with drag-and-drop
- ✅ Real-time chat with extracted report data
- ✅ Dark mode theme support
- ✅ Personal info management (age, gender, etc.)
- ✅ Report history and tracking
- ✅ Date input with auto-formatting (DD-MM-YYYY)
- ✅ Responsive design with Tailwind CSS

### Backend (Node.js API)
- ✅ JWT-based user authentication
- ✅ MongoDB integration for user/report storage
- ✅ File upload handling to RAG service
- ✅ Report metadata management
- ✅ User profile management

### RAG Pipeline (Python FastAPI)
- ✅ **PDF Extraction**: pdfplumber + EasyOCR for text & scanned PDFs
- ✅ **Smart Table Parsing**: Extracts lab test values, units, reference ranges
- ✅ **Knowledge Base Integration**: 25 medical tests from trusted sources
- ✅ **Intent Detection**: Distinguishes report-specific vs. general knowledge questions
- ✅ **LLM Chat**: Groq API (Llama 3.1 8B) for intelligent responses
- ✅ **Context Injection**: Provides full report + KB context to LLM
- ✅ **Risk Classification**: Flags critical/abnormal values
- ✅ **Chat History**: SQLite database tracks conversations
- ✅ **Trend Detection**: Identifies value changes over time

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (for frontend & backend)
- Python 3.10+ (for RAG pipeline)
- MongoDB (for user data)
- Groq API key (for LLM)

### 1. Frontend Setup

```bash
cd medreport_dashboard
npm install
npm run dev
```

Access at `http://localhost:3000`

### 2. Backend Setup

```bash
cd Backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
node index.js
```

Runs on `http://localhost:5000`

### 3. RAG Pipeline Setup

```bash
cd rag_model
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your GROQ_API_KEY
uvicorn rag_api:app --reload
```

Runs on `http://localhost:8000`

## 📁 Project Structure

```
medical-report-chatbot/
├── medreport_dashboard/           # React frontend
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── pages/                 # Page components
│   │   ├── context/               # ThemeContext, AuthContext
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
├── Backend/                      # Node.js backend
│   ├── controllers/               # Route handlers
│   ├── models/                    # Mongoose schemas
│   ├── routes/                    # API endpoints
│   ├── middleware/                # Auth, error handling
│   ├── index.js                   # Main server
│   └── package.json
│
├── rag_model/                     # Python RAG pipeline
│   ├── rag_pipeline6.py           # Core extraction & LLM logic
│   ├── rag_pipeline6_wrapper.py   # KB adapter & initialization
│   ├── rag_api.py                 # FastAPI endpoints
│   ├── medical_knowledge.json     # Knowledge base (25 tests)
│   ├── medical_history.db         # SQLite chat history
│   └── requirements.txt
│
└── README.md
```

## 🔌 API Endpoints

### Frontend → Backend (Node.js)
```
POST   /auth/register              Register new user
POST   /auth/login                 User login
POST   /reports/upload             Upload PDF report
GET    /reports                    Get user's reports
DELETE /reports/:id                Delete a report
GET    /user/profile               Get user profile
PUT    /user/profile               Update user profile
```

### Backend → RAG Pipeline (Python)
```
POST   /extract_report             Extract data from PDF
POST   /chat_with_report           Chat about the report
POST   /save_report                Save report metadata
GET    /delete_report/{report_id}  Delete report
```

## 🧠 Knowledge Base Structure

**Medical Knowledge Base** (`medical_knowledge.json`)

Contains 25 common blood tests with:
- Test name & alternative names
- Description & purpose
- Normal reference ranges (by gender/age)
- Causes of low/high values
- Diet recommendations
- Emergency conditions
- Follow-up tests
- Sources (MedlinePlus, Mayo Clinic, NHS UK, etc.)

**Example Test Entry:**
```json
{
  "test_name": "Hemoglobin",
  "normal_ranges": {
    "Adult Male": "13.5–17.5 g/dL",
    "Adult Female": "12.0–15.5 g/dL"
  },
  "unit": "g/dL",
  "low_causes": ["Iron deficiency anemia", "Chronic bleeding"],
  "high_causes": ["Dehydration", "Polycythemia vera"],
  "follow_up_tests": ["CBC", "Serum Iron", "Ferritin", "B12", "Folate"],
  "source_names": ["MedlinePlus", "NHS UK", "Merck Manual"]
}
```

## 🤖 RAG Pipeline Flow

### PDF → Extracted Data
1. User uploads medical report PDF
2. `MedicalReportParser` extracts:
   - Text using pdfplumber
   - Tables with lab test data
   - OCR for scanned PDFs (easyocr)
3. `_parse_table_rows()` extracts:
   - Test name → Hemoglobin
   - Value → 6.5
   - Unit → g/dL
   - Reference range → 12.0-17.5

### Chat Processing
1. User asks: "What does my hemoglobin mean?"
2. `detect_intent()` identifies as **report-specific**
3. `search_kb_for_query()` finds hemoglobin in KB
4. `build_full_report_context()` creates:
   - Actual value vs reference range
   - Risk level (low/high/normal)
   - KB causes & advice
5. `build_smart_response()` sends to Groq LLM with:
   - Full report data
   - Abnormal flags
   - Relevant KB articles
   - System prompt enforcing KB-only responses
6. LLM returns personalized explanation

### General Knowledge Questions
1. User asks: "What is the normal hemoglobin range?"
2. `detect_intent()` identifies as **general knowledge**
3. Report data is EXCLUDED from context
4. Only KB + question sent to LLM
5. LLM responds from KB sources only

## 🔐 Environment Variables

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:5000
VITE_RAG_API_URL=http://localhost:8000
```

### Backend (`.env`)
```
MONGO_DB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
JWT_SECRET=your_jwt_secret_key
PORT=5000
```

### RAG Pipeline (`.env`)
```
GROQ_API_KEY=your_groq_api_key
KNOWLEDGE_PATH=./medical_knowledge.json
HISTORY_DB=./medical_history.db
```

## 📊 Database Schemas

### MongoDB (User & Reports)
```javascript
// User
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (hashed),
  profile: {
    age: Number,
    gender: String,
    medicalHistory: [String]
  },
  reports: [ObjectId]
}

// Report
{
  _id: ObjectId,
  userId: ObjectId,
  filename: String,
  uploadDate: Date,
  extractedData: Object,
  metadata: Object
}
```

### SQLite (RAG Pipeline)
```sql
-- Chat History
CREATE TABLE chat_history (
  id INTEGER PRIMARY KEY,
  session_id TEXT,
  role TEXT,
  content TEXT,
  created_at TEXT
);

-- Report History
CREATE TABLE reports (
  id INTEGER PRIMARY KEY,
  session_id TEXT,
  report_date TEXT,
  filename TEXT,
  test_name TEXT,
  value REAL,
  unit TEXT,
  reference_low REAL,
  reference_high REAL,
  risk_level TEXT
);
```

## 🧪 Testing

### Test KB Loading
```bash
cd rag_model
python test_init.py
```

### Test RAG API
```bash
python test_rag_api.py
```

### Test Chat Endpoint
```bash
python test_chat.py
```

## 🔧 Key Technologies

| Component | Tech Stack |
|-----------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Supabase Auth |
| Backend | Node.js, Express, MongoDB, JWT |
| RAG Pipeline | FastAPI, Groq LLM, pdfplumber, easyocr |
| PDF Parsing | pdfplumber, pytesseract, pymupdf |
| LLM | Groq API (Llama 3.1 8B Instant) |
| Database | MongoDB, SQLite |

## 📝 Key Features Explained

### Intent Detection
Determines if a question is about:
- **Report-specific**: "Is my hemoglobin low?" → Uses report data
- **General knowledge**: "What is hemoglobin?" → Uses KB only

### Context Injection
For each chat message, injects:
- Full report (all test values + reference ranges)
- Abnormal flags (critical/severe/moderate findings)
- Historical trends (previous results if available)
- KB articles (medical information from KB)
- Chat history (previous Q&A)

### Risk Classification
Classifies test results as:
- **Normal**: Within reference range
- **Mild**: 0-10% deviation
- **Moderate**: 10-25% deviation
- **Severe**: 25%+ deviation
- **Critical**: Emergency conditions (e.g., Hgb < 7)

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Error: querySrv ECONNREFUSED
```
- Check MongoDB connection string in `.env`
- Ensure IP whitelist includes your address
- Verify internet connectivity

### RAG API KB Not Loading
```
Loaded KB: 0 tests, 0 diseases
```
- Check `medical_knowledge.json` exists
- Verify JSON syntax: `python -m json.tool medical_knowledge.json`
- Ensure LegacyKBAdapter is handling old format

### PDF Extraction Issues
```
No structured data extracted. Returning raw text for LLM.
```
- Verify PDF is readable (not corrupted)
- Check if PDF is scanned (requires OCR)
- Ensure table structure is standard

## 📚 Knowledge Base Sources

All information in `medical_knowledge.json` sourced from:
- **MedlinePlus** - U.S. National Library of Medicine
- **Mayo Clinic** - Medical research & education
- **NHS UK** - British National Health Service
- **Merck Manual** - Medical reference
- **Mount Sinai** - Major medical institution
- **WebMD** - Health information
- **Cleveland Clinic** - Major healthcare system
- **Johns Hopkins** - Medical research

## 🎓 How It Works (Example)

**User**: "I uploaded my blood test. My hemoglobin is 6.5. What does that mean?"

**System Process**:
1. Extract: Hemoglobin = 6.5 g/dL
2. Detect intent: Report-specific → Use report data
3. Search KB: Find hemoglobin (normal: 12-17.5)
4. Build context:
   - Report: "Hemoglobin: 6.5 g/dL (ref: 12.0–17.5) → SEVERE [low]"
   - Causes: Iron deficiency, chronic bleeding, bone marrow failure
   - KB sources: MedlinePlus, NHS UK
5. LLM prompt:
   ```
   REPORT: Hemoglobin: 6.5 g/dL (ref: 12.0–17.5) → SEVERE [low]
   CAUSES: Iron deficiency anemia, chronic bleeding
   SOURCES: MedlinePlus, NHS UK
   
   Question: "What does my hemoglobin result mean?"
   ```
6. LLM responds:
   ```
   Your hemoglobin level of 6.5 g/dL is significantly low.
   Normal levels are 12.0-17.5 g/dL.
   
   Common causes include:
   - Iron deficiency anemia
   - Chronic bleeding
   - Bone marrow disorders
   
   This requires medical attention. Please consult your doctor immediately.
   According to MedlinePlus and NHS UK...
   ```

## 🚀 Future Enhancements

- [ ] Multi-language support
- [ ] Integration with EHR systems
- [ ] Advanced trending with graphs
- [ ] Medication interaction checking
- [ ] Risk stratification algorithms
- [ ] Specialist recommendations
- [ ] Insurance integration
- [ ] Mobile app (React Native)
- [ ] Video consultation integration
- [ ] Personalized health insights

## 📄 License

This project is proprietary and confidential.

## 👥 Contributors

- Vishal (Backend Lead)
- Frontend & Dashboard Team
- RAG Pipeline & LLM Integration Team

## 📧 Support

For issues, feature requests, or questions:
- Check troubleshooting section above
- Review API documentation
- Check RAG pipeline logs

---

**Last Updated**: May 22, 2026  
**Version**: 2.0 (RAG Pipeline6)
