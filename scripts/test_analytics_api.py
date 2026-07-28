from __future__ import annotations

import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class AnalyticsApiNodeTests(unittest.TestCase):
    def test_analytics_api_contracts(self) -> None:
        result = subprocess.run(
            ["node", "tests/analytics-api.test.js"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(
            0,
            result.returncode,
            msg=f"analytics API contracts failed:\n{result.stdout}\n{result.stderr}",
        )


if __name__ == "__main__":
    unittest.main()
