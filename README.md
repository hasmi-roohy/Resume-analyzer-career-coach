# ResumeAI — AI Resume Analyzer & Career Coach

NLP-powered resume analyzer with skill gap detection, ATS scoring, and context-aware AI chat.
Built with **React + FastAPI + PostgreSQL + Groq LLaMA 3**.


---

## Features

- 📄 Upload PDF, DOCX, or TXT resume
- 🧠 NLP skill extraction — 80+ tech skills, stack aliases (MERN, MEAN, PERN auto-expand)
- 📊 ATS score with section-by-section breakdown (contact, summary, skills, experience, format)
- 🎯 JD matching — matched vs missing skills with synonym normalization (NodeJS → Node.js)
- 💬 AI career coach powered by Groq LLaMA 3.3-70b — uses your full resume + JD as context
- 🗂️ Session history — every analysis saved, reloadable from sidebar
- 🖥️ Split panel — analysis and chat visible simultaneously
- 🐘 PostgreSQL in production, SQLite for local dev

---

## Project Structure

```
resume/
├── backend/
│   ├── core/
│   │   ├── resume_parser.py   ← NLP engine: skill extraction, ATS scoring, section parsing
│   │   ├── ai_chat.py         ← Groq LLaMA chat with resume context
│   │   └── security.py        ← JWT auth + bcrypt
│   ├── routers/
│   │   ├── auth.py            ← POST /auth/signup, POST /auth/login
│   │   ├── resume.py          ← Upload, analyze, list, delete sessions
│   │   └── chat.py            ← Send message, get history
│   ├── database.py            ← SQLAlchemy models (User, ResumeSession, ChatMessage)
│   ├── main.py                ← FastAPI app entry point
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── pages/
        │   ├── Login.jsx
        │   ├── Signup.jsx
        │   └── Dashboard.jsx   ← Sidebar + split panel layout
        └── components/
            ├── UploadPanel.jsx
            ├── AnalysisPanel.jsx
            ├── ChatPanel.jsx
            ├── ScoreRing.jsx
            ├── ScoreBar.jsx
            └── SkillPill.jsx
```

---

## Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Backend

**Windows:**
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**Mac / Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Create `.env` file:**
```powershell
# Windows
python -c "open('.env','w',encoding='utf-8').write('SECRET_KEY=change-this-to-any-long-random-string\nGROQ_API_KEY=gsk_your_key_here\nDATABASE_URL=sqlite:///./resumeai.db\nALLOWED_ORIGINS=http://localhost:5173\n')"
```
```bash
# Mac / Linux
cp .env.example .env
```

Open `.env` and replace `gsk_your_key_here` with your real key from [console.groq.com](https://console.groq.com).

**Start server:**
```bash
uvicorn main:app --reload
```

Terminal should show:
```
INFO  ResumeAI v2 started | DB=SQLite | GROQ=SET ✓
```

API docs available at: [http://localhost:8000/docs](http://localhost:8000/docs)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Verify everything works

Open [http://localhost:8000/debug](http://localhost:8000/debug) — you should see:
```json
{
  "groq_key_set": true,
  "database_type": "SQLite"
}
```



## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/signup | No | Register new user |
| POST | /auth/login | No | Login → returns JWT |
| GET | /auth/me | Yes | Get current user |
| POST | /resume/upload | Yes | Upload resume + analyze |
| GET | /resume/sessions | Yes | List all past sessions |
| GET | /resume/session/{id} | Yes | Load session + chat history |
| DELETE | /resume/session/{id} | Yes | Delete session |
| POST | /chat/message | Yes | Send message to AI |
| GET | /chat/history/{id} | Yes | Get full chat history |
| GET | /health | No | Health check |
| GET | /debug | No | Check config (dev only) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL (prod) / SQLite (dev) |
| AI | Groq LLaMA 3.3-70b-versatile |
| Auth | JWT (python-jose) + bcrypt |
| NLP | Custom regex + skill alias engine |
