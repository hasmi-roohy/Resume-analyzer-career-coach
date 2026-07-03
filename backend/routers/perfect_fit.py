import json
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from core.perfect_fit import build_recommendations
from core.resume_parser import extract_text
from core.security import get_current_user
from database import get_db, JobRecommendation, PerfectFitSession, User

router = APIRouter(prefix="/perfect-fit", tags=["perfect-fit"])

ALLOWED_TYPES = {".pdf", ".docx", ".txt"}
MAX_SIZE = 5 * 1024 * 1024


def _recommendation_payload(row: JobRecommendation):
    return {
        "id": row.id,
        "title": row.title,
        "company": row.company,
        "source": row.source,
        "location": row.location,
        "url": row.url,
        "description": row.description,
        "fit_score": row.fit_score,
        "matched_skills": json.loads(row.matched_skills_json or "[]"),
        "missing_skills": json.loads(row.missing_skills_json or "[]"),
        "explanation": row.explanation,
    }


@router.post("/upload")
async def upload_perfect_fit_resume(
    file: UploadFile = File(...),
    location: str = Form(default=""),
    remote: str = Form(default="Any"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    filename = file.filename or "resume.pdf"
    extension = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type '{extension}'. Use PDF, DOCX, or TXT.")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(400, "File too large - maximum size is 5 MB")
    if not data:
        raise HTTPException(400, "File is empty")

    try:
        raw_text = extract_text(filename, data)
    except ValueError as exc:
        raise HTTPException(400, str(exc))

    if len(raw_text.strip()) < 50:
        raise HTTPException(400, "Could not extract enough text from this resume")

    filters = {
        "location": location.strip(),
        "remote": remote,
    }
    result = build_recommendations(raw_text, filters, db=db)

    session = PerfectFitSession(
        user_id=user.id,
        filename=filename,
        raw_text=raw_text,
        skills_json=json.dumps(result["skills"]),
        filters_json=json.dumps(filters),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    rows = []
    for item in result["recommendations"]:
        row = JobRecommendation(
            session_id=session.id,
            title=item.get("title"),
            company=item.get("company"),
            source=item.get("source"),
            location=item.get("location"),
            url=item.get("url"),
            description=(item.get("description") or "")[:2000],
            fit_score=item.get("fit_score", 0),
            matched_skills_json=json.dumps(item.get("matched_skills", [])),
            missing_skills_json=json.dumps(item.get("missing_skills", [])),
            explanation=item.get("explanation"),
        )
        db.add(row)
        rows.append(row)
    db.commit()
    for row in rows:
        db.refresh(row)

    return {
        "session_id": session.id,
        "filename": filename,
        "skills": result["skills"],
        "query": result["query"],
        "career_matches": result["career_matches"],
        "recommendations": [_recommendation_payload(row) for row in rows],
        "fetch_errors": result["fetch_errors"],
        "cache_enabled": result.get("cache_enabled", False),
    }


@router.get("/session/{sid}")
def get_perfect_fit_session(
    sid: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    session = db.query(PerfectFitSession).filter(
        PerfectFitSession.id == sid,
        PerfectFitSession.user_id == user.id,
    ).first()
    if not session:
        raise HTTPException(404, "Perfect Fit session not found")

    recommendations = (
        db.query(JobRecommendation)
        .filter(JobRecommendation.session_id == sid)
        .order_by(JobRecommendation.fit_score.desc())
        .all()
    )
    return {
        "session_id": session.id,
        "filename": session.filename,
        "skills": json.loads(session.skills_json or "[]"),
        "filters": json.loads(session.filters_json or "{}"),
        "recommendations": [_recommendation_payload(row) for row in recommendations],
    }
