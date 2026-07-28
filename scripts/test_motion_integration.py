import unittest
import re
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class MotionPageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.scripts: list[str] = []
        self.has_decision_story_hook = False
        self.has_generic_reveal = False

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        attributes = dict(attrs)
        classes = set((attributes.get("class") or "").split())
        if tag == "script" and attributes.get("src"):
            self.scripts.append(attributes["src"] or "")
        if tag == "section" and "data-decision-story" in attributes:
            self.has_decision_story_hook = True
        if "reveal" in classes:
            self.has_generic_reveal = True


def parse_page(relative_path: str) -> MotionPageParser:
    parser = MotionPageParser()
    parser.feed((ROOT / relative_path).read_text(encoding="utf-8"))
    return parser


class MotionIntegrationTests(unittest.TestCase):
    def test_homepage_loads_motion_for_the_story_hook(self) -> None:
        homepage = parse_page("index.html")

        self.assertTrue(homepage.has_decision_story_hook)
        self.assertIn("/shared/motion.js", homepage.scripts)
        self.assertFalse(homepage.has_generic_reveal)

    def test_analytics_pages_load_motion_before_their_apps(self) -> None:
        for route in ("budget", "forecast"):
            with self.subTest(route=route):
                page = parse_page(f"analytics/{route}/index.html")
                motion_index = page.scripts.index("/shared/motion.js")
                app_index = page.scripts.index(f"/analytics/{route}/app.js")
                self.assertLess(motion_index, app_index)

    def test_analytics_apps_reveal_success_and_reset_invalid_results(self) -> None:
        for route in ("budget", "forecast"):
            with self.subTest(route=route):
                source = (ROOT / f"analytics/{route}/app.js").read_text(
                    encoding="utf-8"
                )
                self.assertIn(
                    "MOTION.revealResult(resultsPanel)",
                    source,
                )
                self.assertIn(
                    "MOTION.resetResult(resultsPanel)",
                    source,
                )

    def test_budget_invalid_total_clears_a_prior_ready_result(self) -> None:
        source = (ROOT / "analytics/budget/app.js").read_text(encoding="utf-8")
        invalid_total_branch = re.search(
            r"if \(totalBudget <= 0\) \{(?P<body>.*?)\n\s*\}",
            source,
            re.DOTALL,
        )

        self.assertIsNotNone(invalid_total_branch)
        self.assertIn(
            "MOTION.resetResult(resultsPanel)",
            invalid_total_branch.group("body"),
        )

    def test_styles_are_scoped_to_helper_controlled_states(self) -> None:
        site_css = (ROOT / "site.css").read_text(encoding="utf-8")
        tool_css = (ROOT / "tool-shell.css").read_text(encoding="utf-8")

        self.assertIn('.decision-story[data-motion="ready"]', site_css)
        self.assertIn('.decision-story[data-motion="active"]', site_css)
        self.assertIn('.results[data-result-state="updating"]', tool_css)
        self.assertIn('.results[data-result-state="ready"]', tool_css)


if __name__ == "__main__":
    unittest.main()
