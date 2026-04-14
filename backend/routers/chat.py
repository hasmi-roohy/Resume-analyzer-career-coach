import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from database import get_db, User, ResumeSession, ChatMessage
from core.security import get_current_user
from core.ai_chat import chat

router = APIRouter(prefix="/chat", tags=["chat"])


class MessageIn(BaseModel):
    session_id: int
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Message cannot be empty")
        if len(v) > 2000:
            raise ValueError("Message too long — max 2000 characters")
        return v.strip()


@router.post("/message")
def send_message(
    body: MessageIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    session = db.query(ResumeSession).filter(
        ResumeSession.id == body.session_id,
        ResumeSession.user_id == user.id,
    ).first()
    if not session:
        raise HTTPException(404, "Session not found")

    analysis = {}
    if session.analysis_json:
        try:
            analysis = json.loads(session.analysis_json)
        except Exception:
            pass

    history = [
        {"role": m.role, "content": m.content}
        for m in db.query(ChatMessage)
            .filter(ChatMessage.session_id == body.session_id)
            .order_by(ChatMessage.created_at)
            .all()
    ]

    # Save user message first
    user_msg = ChatMessage(
        session_id=body.session_id,
        role="user",
        content=body.content,
    )
    db.add(user_msg)
    db.commit()

    # Get AI reply
    reply = chat(
        resume_text  = session.raw_text or "",
        jd_text      = session.jd_text or "",
        analysis     = analysis,
        history      = history,
        user_message = body.content,
    )

    # Save AI reply
    ai_msg = ChatMessage(
        session_id=body.session_id,
        role="assistant",
        content=reply,
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return {"role": "assistant", "content": reply, "id": ai_msg.id}


@router.get("/history/{session_id}")
def get_history(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    session = db.query(ResumeSession).filter(
        ResumeSession.id == session_id,
        ResumeSession.user_id == user.id,
    ).first()
    if not session:
        raise HTTPException(404, "Session not found")

    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    return [{"role": m.role, "content": m.content, "id": m.id} for m in msgs]
