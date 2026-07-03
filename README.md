# ApplyWise

ApplyWise is a resume analysis and job discovery app built with React, FastAPI, PostgreSQL, pgvector, and Groq.

It has two main workflows:

- **Resume Match**: upload a resume, optionally paste a job description, get ATS/JD analysis, and chat with an AI career coach.
- **Perfect Fit**: upload only a resume and get job recommendations from cached live job data using local embeddings and pgvector retrieval.

## Features

- PDF, DOCX, and TXT resume upload
- ATS scoring and section-level feedback
- Job description skill matching
- AI chat with resume and JD context
- Resume Match history
- Perfect Fit resume-only job recommendations
- Cached live jobs from free APIs
- PostgreSQL + pgvector similarity search
- Scheduled job cache refresh
- JWT authentication

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, React Router |
| Backend | FastAPI, SQLAlchemy |
| Database | PostgreSQL 18 |
| Vector Search | pgvector |
| AI Chat | Groq |
| Resume Parsing | pdfminer.six, python-docx, custom skill extraction |
| Job Sources | Arbeitnow, Remotive, Remote OK, optional Adzuna |

## Project Structure

```text
resume/
  backend/
    main.py                    FastAPI app entry
    database.py                SQLAlchemy models and pgvector setup
    routers/
      auth.py                  Signup, login, current user
      resume.py                Resume Match upload/history
      chat.py                  AI career coach
      perfect_fit.py           Perfect Fit upload endpoint
    core/
      resume_parser.py         Text extraction, skills, ATS/JD analysis
      ai_chat.py               Groq chat logic
      perfect_fit.py           Job fetch, cache, embeddings, ranking
      job_refresh.py           Scheduled job cache refresh
      security.py              JWT and password hashing
    tests/
      test_perfect_fit.py      Perfect Fit unit tests
  frontend/
    src/
      App.jsx                  Routes
      styles.css               Shared UI styles
      context/AuthContext.jsx  Auth state
      api/client.js            API client
      pages/
        Login.jsx
        Signup.jsx
        Dashboard.jsx
      components/
        UploadPanel.jsx
        AnalysisPanel.jsx
        ChatPanel.jsx
        PerfectFitPanel.jsx
```

## Environment

Create `backend/.env`:

```env
SECRET_KEY=change-this-to-a-long-random-string
GROQ_API_KEY=your_groq_key
DATABASE_URL=postgresql://resume:resume123@localhost:5432/resume
ALLOWED_ORIGINS=http://localhost:5173
```

Optional Adzuna keys:

```env
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
```

Optional Perfect Fit settings:

```env
PERFECT_FIT_REFRESH_HOURS=6
PERFECT_FIT_DISABLE_SCHEDULER=false
PERFECT_FIT_ALLOW_MODEL_DOWNLOAD=false
```

## PostgreSQL Requirements

PostgreSQL must have pgvector enabled in the `resume` database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Verify:

```sql
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'vector';
```

Expected:

```text
vector | 0.8.4
```

## Run Locally

Start backend:

```cmd
cd C:\Users\honey\Desktop\resume\backend
.\venv\Scripts\activate
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Start frontend in another terminal:

```cmd
cd C:\Users\honey\Desktop\resume\frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

Backend docs:

```text
http://localhost:8000/docs
```

## Perfect Fit RAG Flow

```text
Resume upload
  -> extract resume text and skills
  -> infer likely role
  -> refresh cached jobs from free APIs
  -> store jobs in PostgreSQL
  -> store job embeddings in pgvector
  -> compare resume embedding with job embeddings
  -> rank jobs by vector similarity and skill overlap
  -> show recommendations in the UI
```

Perfect Fit uses cached job data because job postings change often. The job cache has expiry fields and a scheduled refresh. Resume Match history is stored because resume/JD analysis is stable; Perfect Fit results should be treated as current recommendations, not permanent job truth.

## Useful Checks

Run backend tests:

```cmd
cd C:\Users\honey\Desktop\resume\backend
.\venv\Scripts\activate
python -m unittest discover -s tests -v
```

Check pgvector job embeddings:

```sql
SELECT
  COUNT(*) AS total_jobs,
  COUNT(embedding) AS jobs_with_embeddings,
  COUNT(dedupe_key) AS jobs_with_dedupe_key
FROM job_postings;
```

Check API health:

```text
http://localhost:8000/health
```

## API Overview

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/signup` | No | Create account |
| POST | `/auth/login` | No | Login |
| GET | `/auth/me` | Yes | Current user |
| POST | `/resume/upload` | Yes | Resume Match upload |
| GET | `/resume/sessions` | Yes | Resume Match history |
| GET | `/resume/session/{id}` | Yes | Load Resume Match session |
| DELETE | `/resume/session/{id}` | Yes | Delete Resume Match session |
| POST | `/chat/message` | Yes | Send AI chat message |
| POST | `/perfect-fit/upload` | Yes | Resume-only job recommendations |
| GET | `/health` | No | Health check |
| GET | `/debug` | No | Development config check |

## Notes

- `frontend/dist/` is generated by `npm run build` and is not needed in source control.
- `frontend/node_modules/` and `backend/venv/` are local dependency folders and are ignored by Git.
- `backend/.env` contains secrets and must not be committed.
