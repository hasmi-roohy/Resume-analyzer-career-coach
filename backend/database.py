import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
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


class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    full_name       = Column(String(200), nullable=False)
    email           = Column(String(200), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow)
    resumes         = relationship("ResumeSession", back_populates="owner", cascade="all, delete-orphan")


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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
