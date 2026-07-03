import os
import unittest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

os.environ["PERFECT_FIT_DISABLE_SENTENCE_TRANSFORMERS"] = "1"

from core import perfect_fit


class PerfectFitTests(unittest.TestCase):
    def test_embedding_has_pgvector_dimension(self):
        vector = perfect_fit.embed_text("Python FastAPI PostgreSQL backend developer")

        self.assertEqual(len(vector), 384)
        self.assertAlmostEqual(sum(v * v for v in vector), 1.0, places=4)

    def test_dedupes_same_job_across_sources(self):
        jobs = [
            {
                "title": "Backend Developer",
                "company": "Acme",
                "location": "Remote",
                "url": "https://jobs.example.com/backend?ref=a",
            },
            {
                "title": "Backend Developer",
                "company": "Acme",
                "location": "Remote",
                "url": "https://other.example.com/backend",
            },
            {
                "title": "Frontend Developer",
                "company": "Acme",
                "location": "Remote",
                "url": "https://jobs.example.com/frontend",
            },
        ]

        deduped = perfect_fit.dedupe_jobs(jobs)

        self.assertEqual(len(deduped), 2)
        self.assertTrue(all(job.get("dedupe_key") for job in deduped))

    def test_explanation_includes_match_and_improvement(self):
        job = {
            "title": "Backend Developer",
            "source": "Remotive",
            "location": "Remote",
        }

        explanation = perfect_fit._explain_fit(
            job,
            matched=["python", "fastapi"],
            missing=["docker"],
            resume_text="Python FastAPI resume",
        )

        self.assertIn("python", explanation)
        self.assertIn("Remote", explanation)
        self.assertIn("docker", explanation)

    def test_pgvector_ranking_uses_cosine_distance_operator(self):
        db = MagicMock()
        db.execute.return_value.mappings.return_value.all.return_value = []

        perfect_fit._rank_cached_postings(db, [0.0] * 384)

        sql = str(db.execute.call_args.args[0])
        self.assertIn("<=>", sql)
        self.assertIn("CAST(:resume_embedding AS vector)", sql)

    @patch("core.perfect_fit.datetime")
    def test_cleanup_marks_expired_and_deletes_stale(self, mocked_datetime):
        mocked_datetime.utcnow.return_value = datetime(2026, 7, 2)
        db = MagicMock()
        active_query = MagicMock()
        stale_query = MagicMock()
        db.query.side_effect = [active_query, stale_query]
        active_query.filter.return_value = active_query
        stale_query.filter.return_value = stale_query

        perfect_fit.cleanup_expired_jobs(db)

        active_query.update.assert_called_once_with({"is_active": 0})
        stale_query.delete.assert_called_once_with(synchronize_session=False)


if __name__ == "__main__":
    unittest.main()
