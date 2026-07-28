from __future__ import annotations

import os
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
NODE_TESTS = (
    "tests/forecast-engine.test.js",
    "tests/forecast-sample-data.test.js",
)


class ForecastEngineNodeTests(unittest.TestCase):
    def run_node_test(self, relative_path: str, *, timezone: str | None = None) -> None:
        env = os.environ.copy()
        if timezone is not None:
            env["TZ"] = timezone

        result = subprocess.run(
            ["node", relative_path],
            cwd=ROOT,
            env=env,
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(
            0,
            result.returncode,
            msg=f"{relative_path} failed:\n{result.stdout}\n{result.stderr}",
        )

    def test_node_forecast_contracts(self) -> None:
        for relative_path in NODE_TESTS:
            with self.subTest(relative_path=relative_path):
                self.run_node_test(relative_path)

    def test_forecast_months_are_timezone_invariant(self) -> None:
        self.run_node_test(
            "tests/forecast-engine.test.js",
            timezone="Pacific/Auckland",
        )


if __name__ == "__main__":
    unittest.main()
