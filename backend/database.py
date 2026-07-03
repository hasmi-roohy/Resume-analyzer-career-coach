import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.types import UserDefinedType
from datetime import datetime

load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./resumeai.db")

# Railway/Render give postgres:// — SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=300,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Vector(UserDefinedType):
    cache_ok = True

    def __init__(self, dimensions):
        self.dimensions = dimensions

    def get_col_spec(self, **kw):
        return f"vector({self.dimensions})"

    def bind_processor(self, dialect):
        def process(value):
            if value is None:
                return None
            if isinstance(value, str):
                return value
            return "[" + ",".join(str(float(v)) for v in value) + "]"
        return process


class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    full_name       = Column(String(200), nullable=False)
    email           = Column(String(200), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow)
    resumes         = relationship("ResumeSession", back_populates="owner", cascade="all, delete-orphan")
    perfect_fits    = relationship("PerfectFitSession", back_populates="owner", cascade="all, delete-orphan")


class ResumeSession(Base):
    __tablename__ = "resume_sessions"
    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename      = Column(String(300))
    raw_text      = Column(Text)
    jd_text       = Column(Text, nullable=True)
    analysis_json = Column(Text, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    owner         = relationship("User", back_populates="resumes")
    messages      = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("resume_sessions.id"), nullable=False)
    role       = Column(String(20))
    content    = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    session    = relationship("ResumeSession", back_populates="messages")


class PerfectFitSession(Base):
    __tablename__ = "perfect_fit_sessions"
    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename      = Column(String(300))
    raw_text      = Column(Text)
    skills_json   = Column(Text, nullable=True)
    filters_json  = Column(Text, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    owner         = relationship("User", back_populates="perfect_fits")
    recommendations = relationship("JobRecommendation", back_populates="session", cascade="all, delete-orphan")


class JobPosting(Base):
    __tablename__ = "job_postings"
    id             = Column(Integer, primary_key=True, index=True)
    source         = Column(String(80), index=True)
    external_id    = Column(String(300), index=True)
    title          = Column(String(300))
    company        = Column(String(300))
    location       = Column(String(300))
    url            = Column(Text)
    description    = Column(Text)
    skills_json    = Column(Text, nullable=True)
    content_hash   = Column(String(80), index=True)
    dedupe_key     = Column(String(80), index=True)
    embedding      = Column(Vector(384), nullable=True)
    embedding_json = Column(Text, nullable=True)
    posted_at      = Column(DateTime, nullable=True)
    fetched_at     = Column(DateTime, default=datetime.utcnow)
    expires_at     = Column(DateTime, nullable=True, index=True)
    is_active      = Column(Integer, default=1, index=True)


class JobRecommendation(Base):
    __tablename__ = "job_recommendations"
    id                  = Column(Integer, primary_key=True, index=True)
    session_id          = Column(Integer, ForeignKey("perfect_fit_sessions.id"), nullable=False)
    title               = Column(String(300))
    company             = Column(String(300))
    source              = Column(String(80))
    location            = Column(String(300))
    url                 = Column(Text)
    description         = Column(Text)
    fit_score           = Column(Integer, default=0)
    matched_skills_json = Column(Text, nullable=True)
    missing_skills_json = Column(Text, nullable=True)
    explanation         = Column(Text, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    session             = relationship("PerfectFitSession", back_populates="recommendations")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    if "postgres" in DATABASE_URL:
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(bind=engine)
    if "postgres" in DATABASE_URL:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS embedding vector(384)"))
            conn.execute(text("ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS dedupe_key VARCHAR(80)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_job_postings_dedupe_key ON job_postings (dedupe_key)"))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_job_postings_embedding_hnsw "
                "ON job_postings USING hnsw (embedding vector_cosine_ops)"
            ))
