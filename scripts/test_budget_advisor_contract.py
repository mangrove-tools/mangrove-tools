import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class BudgetAdvisorContractTests(unittest.TestCase):
    def test_manual_input_does_not_fabricate_a_perfect_three_point_curve(self) -> None:
        app_js = (ROOT / "analytics/budget/app.js").read_text(encoding="utf-8")

        self.assertNotIn("spend * 0.6", app_js)
        self.assertNotIn("minimum three-point shape", app_js)
