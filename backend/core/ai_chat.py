import os
from pathlib import Path
from typing import List, Dict
from dotenv import load_dotenv

# Absolute path — works no matter where uvicorn is launched from
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env", override=True)

MODEL = "llama-3.3-70b-versatile"

SYSTEM_TEMPLATE = """You are an expert career coach and resume consultant with 15 years of experience in tech hiring.

You are helping a candidate named {name} improve their resume and career prospects.

=== RESUME CONTENT ===
{resume_text}

=== JOB DESCRIPTION ===
{jd_text}

=== ANALYSIS ===
ATS Score: {ats_score}/100
Skills detected: {resume_skills}
JD required skills: {jd_skills}
Missing skills: {missing_skills}
Matched skills: {matched_skills}
Format issues: {format_issues}
Suggestions: {suggestions}

=== INSTRUCTIONS ===
- Answer questions about THIS specific resume using the content above
- Give concrete, actionable advice — never generic
- Reference actual skills, sections, and scores from the analysis
- Be encouraging but honest
- Keep answers clear and under 300 words unless asked for more
"""


def _get_groq():
    key = os.environ.get("GROQ_API_KEY", "").strip()

    if not key:
        return None, "GROQ_API_KEY missing in .env file"

    try:
        from groq import Groq
        client = Groq(api_key=key)
        return client, None

    except ModuleNotFoundError:
        return None, "Groq library missing. Run: pip install groq"

    except Exception as e:
        return None, f"Groq initialization failed: {str(e)}"

def build_system_prompt(resume_text: str, jd_text: str, analysis: dict) -> str:
    p = analysis.get("personal", {})
    return SYSTEM_TEMPLATE.format(
        name           = p.get("name", "the candidate"),
        resume_text    = resume_text[:4000],
        jd_text        = jd_text[:2000] if jd_text else "Not provided",
        ats_score      = analysis.get("ats_score", 0),
        resume_skills  = ", ".join(analysis.get("resume_skills", [])),
        jd_skills      = ", ".join(analysis.get("jd_skills", [])),
        missing_skills = ", ".join(analysis.get("skill_match", {}).get("missing", [])),
        matched_skills = ", ".join(analysis.get("skill_match", {}).get("matched", [])),
        format_issues  = "; ".join(analysis.get("format_issues", [])),
        suggestions    = "; ".join(analysis.get("suggestions", [])),
    )


def chat(
    resume_text: str,
    jd_text: str,
    analysis: dict,
    history: List[Dict[str, str]],
    user_message: str,
) -> str:
    groq, err = _get_groq()
    if not groq:
        return f"AI unavailable: {err}"

    system   = build_system_prompt(resume_text, jd_text, analysis)
    messages = [{"role": "system", "content": system}]
    for h in history[-10:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_message})

    try:
        resp = groq.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=800,
            temperature=0.7,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"AI error: {str(e)}"


def quick_suggestions(resume_text: str, jd_text: str, analysis: dict) -> str:
    ats     = analysis.get("ats_score", 0)
    missing = analysis.get("skill_match", {}).get("missing", [])[:5]
    skills  = analysis.get("resume_skills", [])[:8]
    sugs    = analysis.get("suggestions", [])[:3]

    prompt = f"""Resume just uploaded. Summary:
- ATS Score: {ats}/100
- Skills found: {', '.join(skills) if skills else 'none detected'}
- Missing from JD: {', '.join(missing) if missing else 'No JD provided'}
- Top issues: {'; '.join(sugs)}

Write 3 short paragraphs:
1. Strengths — mention specific skills you see
2. Top 2-3 improvements with clear reasons
3. Encouraging close — invite questions

Max 180 words. Be specific not generic."""

    return chat(resume_text, jd_text, analysis, [], prompt)
