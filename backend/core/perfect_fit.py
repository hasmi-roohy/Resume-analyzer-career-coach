import json
import hashlib
import math
import os
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, List

from sqlalchemy import text

from core.resume_parser import extract_skills_from_text

EMBED_DIM = 384
CACHE_TTL_HOURS = 6
JOB_EXPIRE_DAYS = 14
STALE_DELETE_DAYS = 45
_EMBEDDING_MODEL = None
_EMBEDDING_MODEL_FAILED = False


ROLE_PROFILES = [
    {
        "title": "Full Stack Developer",
        "skills": ["javascript", "typescript", "react", "node.js", "express", "python", "fastapi", "sql", "postgresql", "mongodb", "rest api", "docker"],
        "keywords": ["full stack", "frontend", "backend", "api", "dashboard", "mern", "pern"],
    },
    {
        "title": "Backend Developer",
        "skills": ["python", "java", "node.js", "fastapi", "django", "flask", "spring", "sql", "postgresql", "mongodb", "redis", "rest api", "jwt"],
        "keywords": ["backend", "api", "server", "database", "authentication", "microservices"],
    },
    {
        "title": "Frontend Developer",
        "skills": ["javascript", "typescript", "react", "next.js", "html", "css", "tailwind", "redux", "vite"],
        "keywords": ["frontend", "ui", "component", "responsive", "website", "dashboard"],
    },
    {
        "title": "Data Analyst",
        "skills": ["sql", "python", "excel", "tableau", "power bi", "pandas", "numpy", "matplotlib"],
        "keywords": ["analysis", "dashboard", "report", "metrics", "insight", "visualization"],
    },
    {
        "title": "Machine Learning Engineer",
        "skills": ["python", "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "docker", "aws", "fastapi"],
        "keywords": ["model", "training", "inference", "ml pipeline", "deployment", "automation"],
    },
    {
        "title": "DevOps Engineer",
        "skills": ["linux", "docker", "kubernetes", "aws", "gcp", "azure", "terraform", "jenkins", "github actions", "ci/cd"],
        "keywords": ["deployment", "pipeline", "cloud", "infrastructure", "monitoring", "automation"],
    },
    {
        "title": "Mobile App Developer",
        "skills": ["flutter", "dart", "react native", "android", "ios", "kotlin", "swift", "firebase"],
        "keywords": ["mobile", "android", "ios", "app", "play store"],
    },
]

def _ssl_context():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return ssl.create_default_context()


def _request_json(url: str, timeout: int = 7) -> Dict:
    req = urllib.request.Request(url, headers={"User-Agent": "ApplyWise/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=_ssl_context()) as resp:
            return json.loads(resp.read().decode("utf-8", errors="ignore"))
    except urllib.error.URLError as exc:
        if "CERTIFICATE_VERIFY_FAILED" not in str(exc):
            raise
        with urllib.request.urlopen(req, timeout=timeout, context=ssl._create_unverified_context()) as resp:
            return json.loads(resp.read().decode("utf-8", errors="ignore"))


def _clean_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", text).strip()


def _content_hash(*parts: str) -> str:
    text = "\n".join(p or "" for p in parts)
    return hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()


def _tokens(text: str) -> List[str]:
    return re.findall(r"[a-zA-Z][a-zA-Z0-9\+\#\.\-]{1,}", (text or "").lower())


def _normalize_vector(values: List[float]) -> List[float]:
    norm = math.sqrt(sum(v * v for v in values)) or 1.0
    return [round(float(v) / norm, 6) for v in values]


def _hash_embedding(text: str) -> List[float]:
    vec = [0.0] * EMBED_DIM
    for token in _tokens(text):
        digest = hashlib.md5(token.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:4], "big") % EMBED_DIM
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vec[idx] += sign
    return _normalize_vector(vec)


def _load_embedding_model():
    global _EMBEDDING_MODEL, _EMBEDDING_MODEL_FAILED
    if _EMBEDDING_MODEL or _EMBEDDING_MODEL_FAILED:
        return _EMBEDDING_MODEL
    if os.getenv("PERFECT_FIT_DISABLE_SENTENCE_TRANSFORMERS", "").lower() in {"1", "true", "yes"}:
        _EMBEDDING_MODEL_FAILED = True
        return None
    try:
        try:
            import certifi
            os.environ.setdefault("SSL_CERT_FILE", certifi.where())
            os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())
        except Exception:
            pass
        from sentence_transformers import SentenceTransformer
        model_name = os.getenv("PERFECT_FIT_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        allow_download = os.getenv("PERFECT_FIT_ALLOW_MODEL_DOWNLOAD", "").lower() in {"1", "true", "yes"}
        if not allow_download and not _model_is_cached(model_name):
            _EMBEDDING_MODEL_FAILED = True
            return None
        _EMBEDDING_MODEL = SentenceTransformer(model_name, local_files_only=not allow_download)
    except Exception:
        _EMBEDDING_MODEL_FAILED = True
    return _EMBEDDING_MODEL


def _model_is_cached(model_name: str) -> bool:
    model_path = Path(model_name)
    if model_path.exists():
        return True
    cache_root = Path(os.getenv("HF_HOME", Path.home() / ".cache" / "huggingface")) / "hub"
    cache_name = "models--" + model_name.replace("/", "--")
    return (cache_root / cache_name).exists()


def embed_text(text: str) -> List[float]:
    model = _load_embedding_model()
    if model is not None:
        try:
            vector = model.encode(text or "", normalize_embeddings=True).tolist()
            if len(vector) == EMBED_DIM:
                return [round(float(v), 6) for v in vector]
        except Exception:
            pass
    return _hash_embedding(text)


def cosine_similarity(a: List[float], b: List[float]) -> float:
    if not a or not b:
        return 0.0
    return sum(x * y for x, y in zip(a, b))


def vector_literal(values: List[float]) -> str:
    return "[" + ",".join(str(float(v)) for v in values) + "]"


def _compact_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def _dedupe_key(job: Dict) -> str:
    title = re.sub(r"[^a-z0-9]+", " ", (job.get("title") or "").lower()).strip()
    company = re.sub(r"[^a-z0-9]+", " ", (job.get("company") or "").lower()).strip()
    location = re.sub(r"[^a-z0-9]+", " ", (job.get("location") or "").lower()).strip()
    return _content_hash(title, company, location)


def _same_job(left: Dict, right: Dict) -> bool:
    if _dedupe_key(left) == _dedupe_key(right):
        return True
    title_score = SequenceMatcher(None, _compact_text(left.get("title")), _compact_text(right.get("title"))).ratio()
    company_score = SequenceMatcher(None, _compact_text(left.get("company")), _compact_text(right.get("company"))).ratio()
    return title_score >= 0.92 and company_score >= 0.9


def dedupe_jobs(jobs: List[Dict]) -> List[Dict]:
    unique: List[Dict] = []
    seen_urls = set()
    seen_keys = set()
    for job in jobs:
        url = (job.get("url") or "").split("?")[0].rstrip("/").lower()
        key = _dedupe_key(job)
        if url and url in seen_urls:
            continue
        if key in seen_keys or any(_same_job(job, existing) for existing in unique):
            continue
        if url:
            seen_urls.add(url)
        seen_keys.add(key)
        job["dedupe_key"] = key
        unique.append(job)
    return unique


def _infer_roles(skills: List[str], resume_text: str, limit: int = 3) -> List[Dict]:
    skill_set = {s.lower() for s in skills}
    lower = resume_text.lower()
    roles = []
    for role in ROLE_PROFILES:
        required = {s.lower() for s in role["skills"]}
        matched = sorted(skill_set & required)
        keyword_hits = [kw for kw in role["keywords"] if kw in lower]
        score = int(((len(matched) / len(required)) * 82 if required else 0) + min(len(keyword_hits) * 6, 18))
        if score:
            roles.append({**role, "score": min(score, 100), "matched": matched})
    roles.sort(key=lambda r: (r["score"], len(r["matched"])), reverse=True)
    return roles[:limit]


def _build_query(skills: List[str], resume_text: str) -> str:
    roles = _infer_roles(skills, resume_text, 1)
    title = roles[0]["title"] if roles else "software developer"
    top_skills = [s for s in skills[:5] if s not in {"html", "css", "git"}]
    return " ".join([title, *top_skills[:3]]).strip()


def _fetch_adzuna(query: str, location: str, limit: int = 10) -> List[Dict]:
    app_id = os.getenv("ADZUNA_APP_ID", "").strip()
    app_key = os.getenv("ADZUNA_APP_KEY", "").strip()
    if not app_id or not app_key:
        return []
    params = urllib.parse.urlencode({
        "app_id": app_id,
        "app_key": app_key,
        "what": query,
        "where": location or "India",
        "results_per_page": min(limit, 20),
        "content-type": "application/json",
    })
    url = f"https://api.adzuna.com/v1/api/jobs/in/search/1?{params}"
    data = _request_json(url)
    jobs = []
    for item in data.get("results", [])[:limit]:
        jobs.append({
            "external_id": str(item.get("id") or item.get("redirect_url") or ""),
            "title": item.get("title") or "Untitled role",
            "company": (item.get("company") or {}).get("display_name") or "Company not listed",
            "source": "Adzuna",
            "location": (item.get("location") or {}).get("display_name") or location or "India",
            "url": item.get("redirect_url") or "",
            "description": _clean_html(item.get("description", "")),
            "external_search": False,
        })
    return jobs


def _fetch_arbeitnow(query: str, location: str, remote: str, limit: int = 10) -> List[Dict]:
    # Public API without search params. We fetch a small page and rank locally.
    data = _request_json("https://www.arbeitnow.com/api/job-board-api")
    jobs = []
    q_words = [w.lower() for w in query.split() if len(w) > 2]
    loc = (location or "").lower()
    wants_remote = remote.lower() == "remote"
    for item in data.get("data", []):
        title = item.get("title") or "Untitled role"
        description = _clean_html(item.get("description", ""))
        haystack = f"{title} {description} {' '.join(item.get('tags') or [])}".lower()
        location_text = item.get("location") or "Not listed"
        if wants_remote and not item.get("remote"):
            continue
        if loc and loc not in location_text.lower() and loc not in haystack:
            continue
        if q_words and not any(w in haystack for w in q_words):
            continue
        jobs.append({
            "external_id": item.get("slug") or item.get("url") or "",
            "title": title,
            "company": item.get("company_name") or "Company not listed",
            "source": "Arbeitnow",
            "location": location_text,
            "url": item.get("url") or "",
            "description": description,
            "external_search": False,
        })
        if len(jobs) >= limit:
            break
    return jobs


def _fetch_remotive(query: str, limit: int = 10) -> List[Dict]:
    params = urllib.parse.urlencode({"search": query, "limit": limit})
    data = _request_json(f"https://remotive.com/api/remote-jobs?{params}")
    jobs = []
    for item in data.get("jobs", [])[:limit]:
        jobs.append({
            "external_id": str(item.get("id") or item.get("url") or ""),
            "title": item.get("title") or "Untitled role",
            "company": item.get("company_name") or "Company not listed",
            "source": "Remotive",
            "location": item.get("candidate_required_location") or "Remote",
            "url": item.get("url") or "",
            "description": _clean_html(item.get("description", "")),
            "external_search": False,
        })
    return jobs


def _fetch_remoteok(query: str, limit: int = 10) -> List[Dict]:
    data = _request_json("https://remoteok.com/api")
    jobs = []
    q_words = [w.lower() for w in query.split() if len(w) > 2]
    for item in data:
        if not isinstance(item, dict) or not item.get("position"):
            continue
        title = item.get("position") or "Untitled role"
        description = _clean_html(item.get("description", ""))
        tags = " ".join(item.get("tags") or [])
        haystack = f"{title} {description} {tags}".lower()
        if q_words and not any(w in haystack for w in q_words):
            continue
        jobs.append({
            "external_id": str(item.get("id") or item.get("slug") or item.get("url") or ""),
            "title": title,
            "company": item.get("company") or "Company not listed",
            "source": "Remote OK",
            "location": item.get("location") or "Remote",
            "url": item.get("url") or "",
            "description": description,
            "external_search": False,
        })
        if len(jobs) >= limit:
            break
    return jobs


def _score_job(job: Dict, skills: List[str], resume_text: str, filters: Dict) -> Dict:
    desc = f"{job.get('title', '')} {job.get('description', '')}".lower()
    skill_set = [s.lower() for s in skills]
    matched = [s for s in skill_set if s in desc]
    job_skills = extract_skills_from_text(desc)
    missing = [s for s in job_skills if s not in skill_set][:6]

    overlap = (len(matched) / max(len(job_skills), 5)) * 100 if job_skills else len(matched) * 12
    title_bonus = 12 if any(s in job.get("title", "").lower() for s in skill_set[:5]) else 0
    base = int(min(92, overlap + title_bonus + min(len(matched) * 4, 20)))

    if filters.get("remote", "").lower() == "remote" and "remote" in job.get("location", "").lower():
        base += 5

    explanation = _explain_fit(job, matched, missing, resume_text)
    return {
        **job,
        "fit_score": max(35, min(base, 96)),
        "matched_skills": matched[:8],
        "missing_skills": missing,
        "explanation": explanation,
    }


def _explain_fit(job: Dict, matched: List[str], missing: List[str], resume_text: str) -> str:
    title = job.get("title") or "This role"
    source = job.get("source") or "the job source"
    location = job.get("location") or "the listed location"
    if matched:
        reason = f"{title} is a strong match because the posting and your resume overlap on {', '.join(matched[:4])}."
    else:
        reason = f"{title} is a discovery match from {source} based on the overall resume profile and role similarity."
    reason += f" Location shown by the source is {location}."
    if missing:
        reason += f" To improve your fit, strengthen or mention {', '.join(missing[:3])} if you have that experience."
    return reason


def _job_to_search_text(job: Dict) -> str:
    return " ".join([
        job.get("title") or "",
        job.get("company") or "",
        job.get("location") or "",
        job.get("description") or "",
    ])


def fetch_live_jobs(query: str, location: str, remote: str) -> tuple[List[Dict], List[str]]:
    jobs = []
    fetch_errors = []

    try:
        jobs.extend(_fetch_arbeitnow(query, location, remote))
    except Exception as exc:
        fetch_errors.append(f"Arbeitnow unavailable: {exc}")

    try:
        jobs.extend(_fetch_remotive(query))
    except Exception as exc:
        fetch_errors.append(f"Remotive unavailable: {exc}")

    try:
        jobs.extend(_fetch_remoteok(query))
    except Exception as exc:
        fetch_errors.append(f"Remote OK unavailable: {exc}")

    if os.getenv("ADZUNA_APP_ID", "").strip() and os.getenv("ADZUNA_APP_KEY", "").strip():
        try:
            jobs.extend(_fetch_adzuna(query, location))
        except Exception as exc:
            fetch_errors.append(f"Adzuna unavailable: {exc}")

    return dedupe_jobs(jobs), fetch_errors


def cleanup_expired_jobs(db):
    from database import JobPosting

    now = datetime.utcnow()
    db.query(JobPosting).filter(
        JobPosting.expires_at.isnot(None),
        JobPosting.expires_at < now,
    ).update({"is_active": 0})

    delete_before = now - timedelta(days=STALE_DELETE_DAYS)
    db.query(JobPosting).filter(
        JobPosting.is_active == 0,
        JobPosting.expires_at.isnot(None),
        JobPosting.expires_at < delete_before,
    ).delete(synchronize_session=False)


def refresh_job_cache(db, query: str, location: str, remote: str):
    from database import JobPosting

    now = datetime.utcnow()
    live_jobs, fetch_errors = fetch_live_jobs(query, location, remote)
    seen_keys = set()

    for job in live_jobs:
        source = job.get("source") or "Unknown"
        external_id = job.get("external_id") or job.get("url") or _content_hash(source, job.get("title"), job.get("company"))
        dedupe_key = job.get("dedupe_key") or _dedupe_key(job)
        if dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)
        text = _job_to_search_text(job)
        skills = extract_skills_from_text(text)
        new_hash = _content_hash(job.get("title"), job.get("company"), job.get("location"), job.get("description"))

        row = db.query(JobPosting).filter(
            JobPosting.source == source,
            JobPosting.external_id == external_id,
        ).first()
        if not row:
            row = db.query(JobPosting).filter(JobPosting.dedupe_key == dedupe_key).first()

        if not row:
            row = JobPosting(source=source, external_id=external_id)
            db.add(row)

        changed = row.content_hash != new_hash
        row.source = source
        row.external_id = external_id
        row.title = job.get("title")
        row.company = job.get("company")
        row.location = job.get("location")
        row.url = job.get("url")
        row.description = job.get("description")
        row.skills_json = json.dumps(skills)
        row.content_hash = new_hash
        row.dedupe_key = dedupe_key
        row.fetched_at = now
        row.expires_at = now + timedelta(days=JOB_EXPIRE_DAYS)
        row.is_active = 1
        if changed or not row.embedding:
            embedding = embed_text(text)
            row.embedding = embedding
            row.embedding_json = json.dumps(embedding)

    cleanup_expired_jobs(db)
    db.commit()
    return fetch_errors


def _row_value(row, key: str, default=None):
    if isinstance(row, dict):
        return row.get(key, default)
    return getattr(row, key, default)


def _posting_to_job(row, resume_embedding: List[float], skills: List[str], raw_text: str, filters: Dict) -> Dict:
    job = {
        "posting_id": _row_value(row, "id"),
        "external_id": _row_value(row, "external_id"),
        "title": _row_value(row, "title"),
        "company": _row_value(row, "company"),
        "source": _row_value(row, "source"),
        "location": _row_value(row, "location"),
        "url": _row_value(row, "url"),
        "description": _row_value(row, "description", "") or "",
        "external_search": False,
    }
    scored = _score_job(job, skills, raw_text, filters)
    vector_score = _row_value(row, "vector_score")
    if vector_score is None:
        job_embedding = json.loads(_row_value(row, "embedding_json", "[]") or "[]")
        vector_score = max(0.0, cosine_similarity(resume_embedding, job_embedding))
    else:
        vector_score = max(0.0, float(vector_score))
    scored["fit_score"] = min(98, int(scored["fit_score"] * 0.55 + vector_score * 100 * 0.45))
    scored["vector_score"] = round(vector_score, 4)
    return scored


def _rank_cached_postings(db, resume_embedding: List[float], limit: int = 80):
    now = datetime.utcnow()
    rows = db.execute(
        text(
            """
            SELECT
                id, source, external_id, title, company, location, url, description,
                skills_json, embedding_json, dedupe_key,
                1 - (embedding <=> CAST(:resume_embedding AS vector)) AS vector_score
            FROM job_postings
            WHERE is_active = 1
              AND expires_at >= :now
              AND embedding IS NOT NULL
            ORDER BY embedding <=> CAST(:resume_embedding AS vector)
            LIMIT :limit
            """
        ),
        {
            "resume_embedding": vector_literal(resume_embedding),
            "now": now,
            "limit": limit,
        },
    ).mappings().all()
    return [dict(row) for row in rows]


def build_recommendations(raw_text: str, filters: Dict, limit: int = 12, db=None) -> Dict:
    from database import JobPosting

    skills = extract_skills_from_text(raw_text)
    query = _build_query(skills, raw_text)
    location = filters.get("location", "")
    fetch_errors = []

    if db is not None:
        fetch_errors = refresh_job_cache(db, query, location, filters.get("remote", ""))
        resume_embedding = embed_text(raw_text)
        postings = _rank_cached_postings(db, resume_embedding)
        if not postings:
            now = datetime.utcnow()
            postings = db.query(JobPosting).filter(
                JobPosting.is_active == 1,
                JobPosting.expires_at >= now,
            ).all()
        ranked = [_posting_to_job(row, resume_embedding, skills, raw_text, filters) for row in postings]
    else:
        jobs, fetch_errors = fetch_live_jobs(query, location, filters.get("remote", ""))
        ranked = [_score_job(job, skills, raw_text, filters) for job in jobs]

    ranked.sort(key=lambda j: j["fit_score"], reverse=True)

    return {
        "skills": skills,
        "query": query,
        "career_matches": _infer_roles(skills, raw_text),
        "recommendations": ranked[:limit],
        "fetch_errors": fetch_errors,
        "cache_enabled": db is not None,
    }
