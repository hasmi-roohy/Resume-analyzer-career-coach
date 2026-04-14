import os
from pathlib import Path
from dotenv import load_dotenv

# Must be FIRST — before any other import reads env vars
load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from database import init_db
from routers import auth, resume, chat

app = FastAPI(
    title="ResumeAI",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler — never exposes stack traces to frontend
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(chat.router)


@app.on_event("startup")
def startup():
    init_db()
    key    = os.getenv("GROQ_API_KEY", "").strip()
    db_url = os.getenv("DATABASE_URL", "sqlite")
    db_type = "PostgreSQL" if "postgresql" in db_url or "postgres" in db_url else "SQLite"
    groq   = "SET ✓" if key and key != "gsk_your_groq_key_here" else "MISSING ✗"
    logger.info(f"ResumeAI v2 started | DB={db_type} | GROQ={groq}")
    if groq == "MISSING ✗":
        logger.warning("Set GROQ_API_KEY in .env — AI chat will not work without it")


@app.get("/")
def root():
    return {"status": "ok", "app": "ResumeAI", "version": "2.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/debug")
def debug():
    """Check your configuration — open http://localhost:8000/debug in browser"""
    key    = os.getenv("GROQ_API_KEY", "").strip()
    db_url = os.getenv("DATABASE_URL", "not set")
    env    = Path(__file__).parent / ".env"
    return {
        "env_file_exists":  env.exists(),
        "env_file_path":    str(env),
        "groq_key_set":     bool(key and key != "gsk_your_groq_key_here"),
        "groq_key_preview": (key[:8] + "...") if len(key) > 8 else "EMPTY",
        "database_type":    "PostgreSQL" if "postgres" in db_url else "SQLite",
        "allowed_origins":  os.getenv("ALLOWED_ORIGINS", "http://localhost:5173"),
    }
