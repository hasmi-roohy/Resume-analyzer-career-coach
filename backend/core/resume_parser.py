import re
import io
from typing import Dict, List, Tuple


# ── Text extraction ──────────────────────────────────────────

def extract_text_pdf(data: bytes) -> str:
    try:
        from pdfminer.high_level import extract_text
        return extract_text(io.BytesIO(data)) or ""
    except Exception as e:
        raise ValueError(f"PDF extraction failed: {e}")


def extract_text_docx(data: bytes) -> str:
    try:
        from docx import Document
        doc = Document(io.BytesIO(data))
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception as e:
        raise ValueError(f"DOCX extraction failed: {e}")


def extract_text(filename: str, data: bytes) -> str:
    fn = filename.lower()
    if fn.endswith(".pdf"):
        return extract_text_pdf(data)
    elif fn.endswith(".docx"):
        return extract_text_docx(data)
    elif fn.endswith(".txt"):
        return data.decode("utf-8", errors="ignore")
    raise ValueError(f"Unsupported file type. Use PDF, DOCX, or TXT.")


# ── Personal info ────────────────────────────────────────────

def extract_personal_info(text: str) -> Dict:
    email    = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    phone    = re.search(r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
    linkedin = re.search(r'linkedin\.com/in/[\w\-]+', text, re.I)
    github   = re.search(r'github\.com/[\w\-]+', text, re.I)
    lines    = [l.strip() for l in text.splitlines() if l.strip()]
    name     = lines[0] if lines else ""
    return {
        "name":      name,
        "email":     email.group(0)    if email    else "",
        "phone":     phone.group(0)    if phone    else "",
        "linkedin":  linkedin.group(0) if linkedin else "",
        "github":    github.group(0)   if github   else "",
    }


# ── Section splitter ─────────────────────────────────────────

SECTION_MAP = {
    "summary":    ["summary", "professional summary", "career objective", "objective",
                   "about me", "profile", "overview", "about"],
    "experience": ["experience", "work experience", "employment", "work history",
                   "professional experience", "career history", "internship"],
    "education":  ["education", "academic", "qualification", "degree", "university",
                   "college", "school", "institute", "academics"],
    "skills":     ["skills", "technical skills", "competencies", "expertise",
                   "core competencies", "key skills", "proficiencies", "technologies",
                   "tools", "tech stack"],
    "projects":   ["projects", "personal projects", "academic projects", "key projects",
                   "featured projects", "project experience", "portfolio"],
    "certifications": ["certifications", "certification", "licenses", "awards",
                       "achievements", "accomplishments", "courses"],
}


def _detect_header(line: str):
    clean = line.strip().lower().rstrip(":").rstrip("-").strip()
    for key, kws in SECTION_MAP.items():
        if clean in kws:
            return key
        if any(kw in clean for kw in kws) and len(clean) < 40:
            return key
    return None


def split_sections(text: str) -> Dict[str, str]:
    sections = {k: [] for k in SECTION_MAP}
    sections["other"] = []
    current = "other"
    for line in text.splitlines():
        header = _detect_header(line)
        if header:
            current = header
        else:
            sections[current].append(line)
    return {k: "\n".join(v).strip() for k, v in sections.items()}


# ── Skill extraction ─────────────────────────────────────────

TECH_SKILLS = {
    # Languages
    "python", "java", "javascript", "typescript", "c", "c++", "c#",
    "go", "rust", "swift", "kotlin", "scala", "r", "matlab", "ruby",
    "php", "dart", "bash", "shell",
    # Frontend
    "react", "react.js", "reactjs", "vue", "vue.js", "angular", "svelte",
    "next.js", "nextjs", "nuxt", "html", "css", "tailwind", "bootstrap",
    "sass", "scss", "webpack", "vite", "redux",
    # Backend
    "node.js", "nodejs", "node", "express", "express.js", "fastapi",
    "django", "flask", "spring", "spring boot", "laravel", "rails",
    "asp.net", "fastify", "nestjs",
    # Databases
    "sql", "postgresql", "postgres", "mysql", "mongodb", "mongo", "redis",
    "sqlite", "firebase", "dynamodb", "cassandra", "elasticsearch",
    "oracle", "mssql", "supabase",
    # Cloud & DevOps
    "aws", "gcp", "azure", "docker", "kubernetes", "k8s", "terraform",
    "jenkins", "gitlab", "github actions", "ci/cd", "ansible", "nginx",
    "linux", "git",
    # AI / ML
    "machine learning", "deep learning", "nlp", "computer vision",
    "data science", "tensorflow", "pytorch", "keras", "scikit-learn",
    "pandas", "numpy", "matplotlib", "seaborn", "plotly", "huggingface",
    "langchain", "openai",
    # APIs & Architecture
    "rest api", "restful", "graphql", "grpc", "microservices", "kafka",
    "rabbitmq", "websockets", "oauth", "jwt", "soap",
    # Mobile
    "flutter", "react native", "android", "ios", "xcode",
    # Tools
    "excel", "tableau", "power bi", "figma", "jira", "confluence",
    "postman", "swagger", "selenium", "pytest", "jest", "cypress",
    "mocha", "eslint",
    # Practices
    "agile", "scrum", "devops", "tdd", "bdd", "oop", "solid",
    "microservices", "serverless",
}

# Stack aliases — if resume has the alias, expand to component skills
STACK_ALIASES = {
    "mern":  ["mongodb", "express", "react", "node.js"],
    "mean":  ["mongodb", "express", "angular", "node.js"],
    "mevn":  ["mongodb", "express", "vue", "node.js"],
    "lamp":  ["linux", "apache", "mysql", "php"],
    "lemp":  ["linux", "nginx", "mysql", "php"],
    "pern":  ["postgresql", "express", "react", "node.js"],
    "jamstack": ["javascript", "react", "git"],
    "t3":    ["typescript", "react", "next.js"],
    "django rest": ["django", "rest api", "python"],
    "full stack": ["javascript", "html", "css"],
    "fullstack":  ["javascript", "html", "css"],
    "full-stack": ["javascript", "html", "css"],
    "devops":     ["docker", "kubernetes", "ci/cd", "linux"],
}

# Synonyms — treat these as the same skill during matching
SKILL_SYNONYMS = {
    "node":       "node.js",
    "nodejs":     "node.js",
    "node.js":    "node.js",
    "react":      "react",
    "reactjs":    "react",
    "react.js":   "react",
    "mongo":      "mongodb",
    "postgres":   "postgresql",
    "k8s":        "kubernetes",
    "restful":    "rest api",
    "rest":       "rest api",
    "ml":         "machine learning",
    "ai":         "machine learning",
    "dl":         "deep learning",
    "ts":         "typescript",
    "js":         "javascript",
    "py":         "python",
    "tf":         "tensorflow",
    "sklearn":    "scikit-learn",
    "scikit":     "scikit-learn",
    "express.js": "express",
    "expressjs":  "express",
    "next":       "next.js",
    "nextjs":     "next.js",
    "vue.js":     "vue",
    "spring boot":"spring",
    "gcp":        "gcp",
    "google cloud":"gcp",
    "amazon web services": "aws",
    "microsoft azure": "azure",
}


def _normalize(skill: str) -> str:
    """Normalize a skill to its canonical form."""
    s = skill.lower().strip()
    return SKILL_SYNONYMS.get(s, s)


def extract_skills_from_text(text: str) -> List[str]:
    found = set()
    lower = text.lower()

    # 1. Direct skill matching
    for skill in TECH_SKILLS:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, lower):
            found.add(_normalize(skill))

    # 2. Synonym matching
    for synonym, canonical in SKILL_SYNONYMS.items():
        pattern = r'\b' + re.escape(synonym) + r'\b'
        if re.search(pattern, lower):
            found.add(canonical)

    # 3. Stack alias expansion — if resume says "MERN" expand to components
    for alias, components in STACK_ALIASES.items():
        pattern = r'\b' + re.escape(alias) + r'\b'
        if re.search(pattern, lower):
            for c in components:
                found.add(_normalize(c))

    return sorted(found)


def match_skills(resume_skills: List[str], jd_skills: List[str]) -> Dict:
    # Normalize both sides before comparing
    rs = set(_normalize(s) for s in resume_skills)
    js = set(_normalize(s) for s in jd_skills)

    matched = sorted(rs & js)
    missing = sorted(js - rs)
    score   = round((len(matched) / len(js)) * 100) if js else 0
    return {"matched": matched, "missing": missing, "score": score}


# ── Formatting check ─────────────────────────────────────────

def check_formatting(text: str) -> Tuple[int, List[str]]:
    lines  = text.splitlines()
    score  = 100
    issues = []
    if len(text) < 300:
        score -= 30
        issues.append("Resume is too short — add more detail")
    if not any(l.strip().startswith(("•", "-", "*", "→", "▪")) for l in lines):
        score -= 15
        issues.append("No bullet points found — use them for experience/skills")
    if not re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', text):
        score -= 15
        issues.append("No email address found")
    if not re.findall(r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text):
        score -= 10
        issues.append("No phone number found")
    if len(text) > 6000:
        score -= 10
        issues.append("Resume may be too long — aim for 1-2 pages")
    return max(0, score), issues


# ── Section scoring ──────────────────────────────────────────

def score_sections(sections: Dict[str, str]) -> Dict[str, int]:
    def _s(key, min_words=30):
        txt = sections.get(key, "")
        wc  = len(txt.split())
        return min(100, int((wc / min_words) * 100)) if wc else 0
    return {
        "summary":    _s("summary", 40),
        "experience": _s("experience", 80),
        "education":  _s("education", 30),
        "skills":     _s("skills", 20),
        "projects":   _s("projects", 40),
    }


# ── Master analyze ───────────────────────────────────────────

def analyze_resume(text: str, jd_text: str = "") -> Dict:
    personal      = extract_personal_info(text)
    sections      = split_sections(text)
    resume_skills = extract_skills_from_text(text)
    jd_skills     = extract_skills_from_text(jd_text) if jd_text else []
    skill_match   = match_skills(resume_skills, jd_skills)
    fmt_score, fmt_issues = check_formatting(text)
    sec_scores    = score_sections(sections)

    # Contact score
    contact_score  = 100
    contact_issues = []
    if not personal["email"]:    contact_score -= 25; contact_issues.append("Add email address")
    if not personal["phone"]:    contact_score -= 25; contact_issues.append("Add phone number")
    if not personal["linkedin"]: contact_score -= 15; contact_issues.append("Add LinkedIn URL")
    if not personal["github"]:   contact_score -= 10; contact_issues.append("Add GitHub URL")

    # Summary score
    sum_words     = len(sections.get("summary", "").split())
    summary_score = 100
    summary_issues = []
    if sum_words < 20:    summary_score = 30;  summary_issues.append("Add a professional summary (50–80 words)")
    elif sum_words < 40:  summary_score = 65;  summary_issues.append("Expand your summary to 50–80 words")
    elif sum_words > 120: summary_score = 75;  summary_issues.append("Summary too long — keep under 100 words")

    # Experience score
    exp_text   = sections.get("experience", "")
    exp_issues = []
    if not exp_text:
        exp_issues.append("Add a work experience section")
    else:
        if not re.search(r'\b(19|20)\d{2}\b', exp_text):
            exp_issues.append("Add dates to your work experience")
        if not re.search(r'[•\-\*▪]', exp_text):
            exp_issues.append("Use bullet points for responsibilities")
        if not re.search(r'\b(developed|built|managed|led|designed|implemented|improved|created|delivered|reduced|increased|launched|automated|optimized)\b', exp_text, re.I):
            exp_issues.append("Start bullet points with strong action verbs")
    exp_score = max(0, 100 - len(exp_issues) * 20)

    # Skills score
    if jd_text and jd_skills:
        skills_score = skill_match["score"]
    else:
        skills_score = min(100, len(resume_skills) * 7)

    # ATS score weighted
    ats_score = int(
        contact_score  * 0.10 +
        summary_score  * 0.10 +
        skills_score   * 0.35 +
        exp_score      * 0.25 +
        fmt_score      * 0.20
    )

    all_suggestions = contact_issues + summary_issues + exp_issues + fmt_issues
    if jd_text and skill_match["missing"]:
        all_suggestions.append(f"Add missing JD skills: {', '.join(skill_match['missing'][:8])}")
    if not all_suggestions:
        all_suggestions.append("Great resume! Add quantifiable achievements (numbers, %) to stand out.")

    return {
        "personal":         personal,
        "sections":         {k: v[:600] for k, v in sections.items()},
        "resume_skills":    resume_skills,
        "jd_skills":        jd_skills,
        "skill_match":      skill_match,
        "ats_score":        ats_score,
        "section_scores":   sec_scores,
        "contact_score":    contact_score,
        "summary_score":    summary_score,
        "skills_score":     skills_score,
        "experience_score": exp_score,
        "format_score":     fmt_score,
        "format_issues":    fmt_issues,
        "suggestions":      all_suggestions,
        "word_count":       len(text.split()),
    }
