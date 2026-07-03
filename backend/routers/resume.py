import json
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from database import get_db, User, ResumeSession, ChatMessage
from core.security import get_current_user
from core.resume_parser import extract_text, analyze_resume
from core.ai_chat import quick_suggestions

router = APIRouter(prefix="/resume", tags=["resume"])

ALLOWED_TYPES = {".pdf", ".docx", ".txt"}
MAX_SIZE      = 5 * 1024 * 1024  # 5 MB


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    jd_text: str = Form(default=""),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Validate file extension
    filename  = file.filename or "upload.pdf"
    extension = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type '{extension}'. Use PDF, DOCX, or TXT.")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(400, "File too large — maximum size is 5 MB")
    if len(data) == 0:
        raise HTTPException(400, "File is empty")

    try:
        raw_text = extract_text(filename, data)
    except ValueError as e:
        raise HTTPException(400, str(e))

    if len(raw_text.strip()) < 50:
        raise HTTPException(400, "Could not extract enough text — check the file is not image-only or password protected")

    analysis = analyze_resume(raw_text, jd_text)
    ai_intro = quick_suggestions(raw_text, jd_text, analysis)

    session = ResumeSession(
        user_id=user.id,
        filename=filename,
        raw_text=raw_text,
        jd_text=jd_text.strip() or None,
        analysis_json=json.dumps(analysis),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    msg = ChatMessage(session_id=session.id, role="assistant", content=ai_intro)
    db.add(msg)
    db.commit()

    return {
        "session_id": session.id,
        "filename":   filename,
        "analysis":   analysis,
        "ai_intro":   ai_intro,
    }


@router.get("/sessions")
def list_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sessions = (
        db.query(ResumeSession)
        .filter(ResumeSession.user_id == user.id)
        .order_by(ResumeSession.created_at.desc())
        .limit(50)
        .all()
    )
    result = []
    for s in sessions:
        ats = 0
        if s.analysis_json:
            try:
                ats = json.loads(s.analysis_json).get("ats_score", 0)
            except Exception:
                pass
        result.append({
            "id":         s.id,
            "filename":   s.filename,
            "created_at": s.created_at.isoformat(),
            "ats_score":  ats,
            "has_jd":     bool(s.jd_text),
        })
    return result


@router.get("/session/{sid}")
def get_session(
    sid: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    s = db.query(ResumeSession).filter(
        ResumeSession.id == sid,
        ResumeSession.user_id == user.id,
    ).first()
    if not s:
        raise HTTPException(404, "Session not found")

    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == sid)
        .order_by(ChatMessage.created_at)
        .all()
    )
    return {
        "id":         s.id,
        "filename":   s.filename,
        "created_at": s.created_at.isoformat(),
        "jd_text":    s.jd_text or "",
        "analysis":   json.loads(s.analysis_json) if s.analysis_json else {},
        "messages":   [{"role": m.role, "content": m.content, "id": m.id} for m in msgs],
    }


@router.delete("/session/{sid}")
def delete_session(
    sid: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    s = db.query(ResumeSession).filter(
        ResumeSession.id == sid,
        ResumeSession.user_id == user.id,
    ).first()
    if not s:
        raise HTTPException(404, "Session not found")
    db.delete(s)
    db.commit()
    return {"ok": True}
