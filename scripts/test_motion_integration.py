import unittest
import re
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MOTION_SCRIPT_PATTERN = re.compile(r"/shared/motion\.[0-9a-f]{12}\.js")


class MotionPageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.scripts: list[str] = []
        self.has_decision_instrument_hook = False
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
        if tag == "figure" and "data-decision-instrument" in attributes:
            self.has_decision_instrument_hook = True
        if "reveal" in classes:
            self.has_generic_reveal = True


def parse_page(relative_path: str) -> MotionPageParser:
    parser = MotionPageParser()
    parser.feed((ROOT / relative_path).read_text(encoding="utf-8"))
    return parser


def motion_script_index(scripts: list[str]) -> int:
    return next(
        index
        for index, script in enumerate(scripts)
        if MOTION_SCRIPT_PATTERN.fullmatch(script)
    )


class MotionIntegrationTests(unittest.TestCase):
    def test_homepage_loads_motion_for_instrument_and_story_hooks(self) -> None:
        homepage = parse_page("index.html")

        self.assertTrue(homepage.has_decision_instrument_hook)
        self.assertTrue(homepage.has_decision_story_hook)
        self.assertTrue(
            any(MOTION_SCRIPT_PATTERN.fullmatch(script) for script in homepage.scripts)
        )
        self.assertFalse(homepage.has_generic_reveal)

    def test_analytics_pages_load_motion_before_their_apps(self) -> None:
        for route in ("budget", "forecast"):
            with self.subTest(route=route):
                page = parse_page(f"analytics/{route}/index.html")
                motion_index = motion_script_index(page.scripts)
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

    def test_budget_replacement_clears_prior_result_motion(self) -> None:
        source = (ROOT / "analytics/budget/app.js").read_text(encoding="utf-8")
        replacement_clear = re.search(
            r"function clearPriorDecision\(\) \{(?P<body>.*?)\n\s*\}",
            source,
            re.DOTALL,
        )

        self.assertIsNotNone(replacement_clear)
        self.assertIn(
            "MOTION.resetResult(resultsPanel)",
            replacement_clear.group("body"),
        )

    def test_styles_are_scoped_to_helper_controlled_states(self) -> None:
        site_css = (ROOT / "site.css").read_text(encoding="utf-8")
        tool_css = (ROOT / "tool-shell.css").read_text(encoding="utf-8")

        self.assertIn('.decision-instrument[data-motion="ready"]', site_css)
        self.assertIn('.decision-instrument[data-motion="active"]', site_css)
        for state in ("observation", "bound", "recheck"):
            self.assertIn(
                f'.decision-instrument[data-focus-state="{state}"]',
                site_css,
            )
        self.assertIn(
            '.decision-instrument[data-motion="reduced"] '
            ".instrument-readout > div",
            site_css,
        )
        self.assertIn('.decision-story[data-motion="ready"]', site_css)
        self.assertIn('.decision-story[data-motion="active"]', site_css)
        self.assertIn('.results[data-result-state="updating"]', tool_css)
        self.assertIn('.results[data-result-state="ready"]', tool_css)


if __name__ == "__main__":
    unittest.main()
