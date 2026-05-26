# Deployment Guide — AI Long-Term Memory System

## Render Deployment Notes

> [!IMPORTANT]
> The memory system is fully designed for Render deployment. All libraries are pure Python and install via pip without system dependencies.

## Python RAG Service (Render Web Service)

### Environment Variables to set in Render:
```
GROQ_API_KEY=your_groq_api_key
KNOWLEDGE_PATH=./medical_knowledge.json
HISTORY_DB=./medical_history.db
```

### Build Command:
```
pip install -r requirements.txt
```

### Start Command:
```
uvicorn rag_api:app --host 0.0.0.0 --port 8000
```

> [!NOTE]
> **First Startup:** On the very first startup, `sentence-transformers` will download the `all-MiniLM-L6-v2` model (~90MB) from HuggingFace. This happens once and is then cached. Render's disk is ephemeral on free tier — consider using a paid tier or set `HF_HOME` env var to a mounted disk.

> [!TIP]
> **Render Free Tier Workaround:** If Render free tier doesn't support the HuggingFace model download size, set `SENTENCE_TRANSFORMERS_HOME=/tmp/hf` in env vars. The model will redownload on each cold start (~20s delay). For production, use Render's paid tier with persistent disk.

### ChromaDB Persistence:
- ChromaDB stores data in `rag_model/medical_db/chroma_store/`  
- On Render free tier (ephemeral disk), data resets on redeploy
- For production: mount a Render Disk at `/app/rag_model/medical_db/`

## Node.js Backend (Render Web Service)

### Environment Variables to set in Render:
```
MONGO_DB_URI=mongodb+srv://...
ACCESS_TOKEN_SECRET=your_secret
EMAIL_USER=your_email
EMAIL_PASSWORD=your_app_password
FRONTEND_URL=https://your-frontend.onrender.com
RAG_API_URL=https://your-rag-service.onrender.com
PORT=4000
```

> [!IMPORTANT]
> Set `RAG_API_URL` to your Render RAG service URL (e.g., `https://medreport-rag.onrender.com`). This is critical for the memory system to work in production.

## Frontend (Render Static Site)

### Build Command:
```
npm run build
```

### Environment Variables:
```
VITE_API_URL=https://your-backend.onrender.com
VITE_RAG_API_URL=https://your-rag-service.onrender.com
```

> [!NOTE]  
> Update `src/utils/apiConstants.js` to use `import.meta.env.VITE_API_URL` instead of hardcoded `localhost` for production builds.

## New Features Summary

| Feature | Where | Status |
|---------|-------|--------|
| Persistent Chat History (MongoDB) | Backend `chatModel.js` | ✅ |
| Semantic Memory (ChromaDB) | Python `memory_engine.py` | ✅ |
| Health Timeline | `/timeline` route | ✅ |
| Health Profile | `/health-profile` route | ✅ |
| PDF Medical Report | Backend `/download-pdf` → Python `/generate_pdf` | ✅ |
| Memory-Augmented Chat | Python `rag_api.py` `/chat_with_report` | ✅ |
| Auto Report Indexing | Report save → memory engine | ✅ |
| Sidebar Navigation | Updated `Sidebar.jsx` | ✅ |
