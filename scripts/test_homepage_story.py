import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class HomepageStoryParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.story_depth: int | None = None
        self.stage_depth: int | None = None
        self.current_stage: str | None = None
        self.stages: list[str] = []
        self.stage_text: dict[str, list[str]] = {}
        self.story_tables = 0
        self.table_headers: list[str] = []
        self._header_depth: int | None = None
        self._collect_header = False
        self._header_text: list[str] = []
        self.hero_depth: int | None = None
        self._link_depth: int | None = None
        self._link_href = ""
        self._link_classes: set[str] = set()
        self._link_text: list[str] = []
        self.hero_links: list[tuple[str, set[str], str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.depth += 1
        attributes = dict(attrs)
        classes = set((attributes.get("class") or "").split())

        if tag == "section" and "decision-story" in classes:
            self.story_depth = self.depth

        if self.story_depth is not None:
            stage = attributes.get("data-story-stage")
            if tag == "li" and stage:
                self.current_stage = stage
                self.stage_depth = self.depth
                self.stages.append(stage)
                self.stage_text[stage] = []
            if tag == "table":
                self.story_tables += 1
            if tag == "th":
                self._header_depth = self.depth
                self._collect_header = attributes.get("scope") == "col"
                self._header_text = []

        if tag == "section" and "hero-feature" in classes:
            self.hero_depth = self.depth
        if self.hero_depth is not None and tag == "a":
            self._link_depth = self.depth
            self._link_href = attributes.get("href") or ""
            self._link_classes = classes
            self._link_text = []

    def handle_data(self, data: str) -> None:
        text = " ".join(data.split())
        if not text:
            return
        if self.current_stage is not None:
            self.stage_text[self.current_stage].append(text)
        if self._header_depth is not None:
            self._header_text.append(text)
        if self._link_depth is not None:
            self._link_text.append(text)

    def handle_endtag(self, tag: str) -> None:
        if tag == "th" and self._header_depth == self.depth:
            if self._collect_header:
                self.table_headers.append(" ".join(self._header_text))
            self._header_depth = None
            self._collect_header = False
            self._header_text = []

        if tag == "a" and self._link_depth == self.depth:
            self.hero_links.append(
                (
                    self._link_href,
                    self._link_classes,
                    " ".join(self._link_text),
                )
            )
            self._link_depth = None
            self._link_href = ""
            self._link_classes = set()
            self._link_text = []

        if tag == "li" and self.stage_depth == self.depth:
            self.current_stage = None
            self.stage_depth = None
        if tag == "section" and self.story_depth == self.depth:
            self.story_depth = None
        if tag == "section" and self.hero_depth == self.depth:
            self.hero_depth = None
        self.depth -= 1


def parse_homepage() -> HomepageStoryParser:
    parser = HomepageStoryParser()
    parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    return parser


class HomepageStoryTests(unittest.TestCase):
    def test_story_moves_from_evidence_to_checks_to_a_bounded_decision(self) -> None:
        parser = parse_homepage()

        self.assertEqual(["evidence", "checks", "boundary"], parser.stages)
        self.assertEqual(1, parser.story_tables)
        self.assertEqual(["Channel", "Spend", "Conversions"], parser.table_headers)

        evidence = " ".join(parser.stage_text["evidence"]).lower()
        checks = " ".join(parser.stage_text["checks"]).lower()
        boundary = " ".join(parser.stage_text["boundary"]).lower()

        self.assertIn("illustrative", evidence)
        self.assertIn("coverage", checks)
        self.assertIn("uncertainty", checks)
        self.assertIn("up to 10%", boundary)
        self.assertIn("30 days", boundary)
        self.assertIn("stop or revise", boundary)

    def test_hero_keeps_analytics_primary_and_calculators_secondary(self) -> None:
        links = parse_homepage().hero_links
        primary = [(href, text) for href, classes, text in links if "btn" in classes]
        secondary = [
            (href, text) for href, classes, text in links if "text-cta" in classes
        ]

        self.assertEqual([("/analytics/", "Explore Analytics")], primary)
        self.assertEqual([("/calculators/", "Browse Calculators")], secondary)


if __name__ == "__main__":
    unittest.main()
