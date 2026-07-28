import unittest
from html.parser import HTMLParser
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


class IdParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.elements = {}

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        element_id = attrs_dict.get("id")
        if element_id:
            self.elements[element_id] = {"tag": tag, "attrs": attrs_dict}


class AnalyticsExplanationTests(unittest.TestCase):
    def assert_explanation_contract(self, route):
        parser = IdParser()
        parser.feed((REPO_ROOT / route / "index.html").read_text(encoding="utf-8"))

        panel = parser.elements.get("recommendation-explanation")
        self.assertIsNotNone(panel)
        self.assertEqual(panel["attrs"].get("role"), "note")
        self.assertEqual(panel["attrs"].get("aria-labelledby"), "explanation-title")
        self.assertIn("hidden", panel["attrs"])

        for field_id in (
            "explanation-confidence",
            "explanation-driver",
            "explanation-caveat",
        ):
            self.assertIn(field_id, parser.elements)

    def test_budget_results_include_explanation_panel(self):
        self.assert_explanation_contract("analytics/budget")

        script = (REPO_ROOT / "analytics/budget/app.js").read_text(encoding="utf-8")
        self.assertIn("renderExplanation", script)
        self.assertIn("explanationConfidence", script)
        self.assertIn("explanationDriver", script)
        self.assertIn("explanationCaveat", script)

    def test_budget_aggregate_inputs_synthesize_enough_points_for_results(self):
        script = (REPO_ROOT / "analytics/budget/app.js").read_text(encoding="utf-8")

        self.assertIn("scaledMidSpend", script)
        self.assertIn("scaledMidConversions", script)

    def test_forecast_results_include_explanation_panel(self):
        self.assert_explanation_contract("analytics/forecast")

        script = (REPO_ROOT / "analytics/forecast/app.js").read_text(encoding="utf-8")
        self.assertIn("renderExplanation", script)
        self.assertIn("explanationConfidence", script)
        self.assertIn("explanationDriver", script)
        self.assertIn("explanationCaveat", script)


if __name__ == "__main__":
    unittest.main()
