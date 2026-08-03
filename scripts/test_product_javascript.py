from __future__ import annotations

import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
NODE_TESTS = (
    "tests/google-analytics-loader.test.js",
    "tests/response-curve.test.js",
    "tests/history-data.test.js",
    "tests/marginality-engine.test.js",
    "tests/budget-allocator.test.js",
    "tests/budget-app.test.js",
    "tests/charts.test.js",
    "tests/product-events.test.js",
    "tests/motion.test.js",
)


class ProductJavascriptTests(unittest.TestCase):
    def test_node_product_contracts(self) -> None:
        for relative_path in NODE_TESTS:
            with self.subTest(relative_path=relative_path):
                result = subprocess.run(
                    ["node", "--test", relative_path],
                    cwd=ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                self.assertEqual(
                    0,
                    result.returncode,
                    msg=f"{relative_path} failed:\n{result.stdout}\n{result.stderr}",
                )


if __name__ == "__main__":
    unittest.main()
