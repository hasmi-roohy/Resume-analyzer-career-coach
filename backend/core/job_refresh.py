import os
import threading
import time

from loguru import logger

from core.perfect_fit import refresh_job_cache
from database import SessionLocal

_refresh_thread = None
_stop_event = threading.Event()

DEFAULT_QUERIES = [
    "Backend Developer Python FastAPI SQL",
    "Frontend Developer React JavaScript",
    "Full Stack Developer React Python PostgreSQL",
    "Data Analyst Python SQL",
    "Machine Learning Engineer Python",
]


def refresh_default_jobs():
    queries = [
        q.strip()
        for q in os.getenv("PERFECT_FIT_REFRESH_QUERIES", ",".join(DEFAULT_QUERIES)).split(",")
        if q.strip()
    ]
    location = os.getenv("PERFECT_FIT_REFRESH_LOCATION", "")
    remote = os.getenv("PERFECT_FIT_REFRESH_REMOTE", "Any")

    with SessionLocal() as db:
        for query in queries:
            errors = refresh_job_cache(db, query, location, remote)
            if errors:
                logger.warning(f"Perfect Fit refresh completed with source errors for '{query}': {errors}")


def _refresh_loop(interval_seconds: int):
    while not _stop_event.wait(interval_seconds):
        try:
            refresh_default_jobs()
        except Exception as exc:
            logger.warning(f"Perfect Fit scheduled refresh failed: {exc}")


def start_job_refresh_scheduler():
    global _refresh_thread
    if os.getenv("PERFECT_FIT_DISABLE_SCHEDULER", "").lower() in {"1", "true", "yes"}:
        return
    if _refresh_thread and _refresh_thread.is_alive():
        return

    hours = float(os.getenv("PERFECT_FIT_REFRESH_HOURS", "6"))
    interval_seconds = max(int(hours * 60 * 60), 900)
    _stop_event.clear()

    _refresh_thread = threading.Thread(
        target=_refresh_loop,
        args=(interval_seconds,),
        name="perfect-fit-job-refresh",
        daemon=True,
    )
    _refresh_thread.start()
    logger.info(f"Perfect Fit scheduled refresh enabled every {interval_seconds // 60} minutes")


def stop_job_refresh_scheduler():
    _stop_event.set()
