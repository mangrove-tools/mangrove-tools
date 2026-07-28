from __future__ import annotations

import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ANALYTICS_IMAGE = "https://mangrovetools.com/og-analytics.webp"
ANALYTICS_IMAGE_ALT = (
    "Mangrove Tools marketing analytics — know where your budget is working"
)


class MetaParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.meta: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "meta":
            return
        attr_map = {key: value or "" for key, value in attrs}
        key = attr_map.get("property") or attr_map.get("name")
        if key:
            self.meta[key] = attr_map.get("content", "")


class PositioningMetadataTests(unittest.TestCase):
    def test_about_social_metadata_describes_the_analytics_image(self) -> None:
        parser = MetaParser()
        parser.feed((ROOT / "about/index.html").read_text(encoding="utf-8"))

        self.assertEqual(ANALYTICS_IMAGE, parser.meta.get("og:image"))
        self.assertEqual(ANALYTICS_IMAGE_ALT, parser.meta.get("og:image:alt"))
        self.assertEqual(ANALYTICS_IMAGE, parser.meta.get("twitter:image"))
        self.assertEqual(ANALYTICS_IMAGE_ALT, parser.meta.get("twitter:image:alt"))

    def test_privacy_revision_date_matches_the_positioning_update(self) -> None:
        privacy_html = (ROOT / "privacy/index.html").read_text(encoding="utf-8")

        self.assertIn("Last updated: July 27, 2026", privacy_html)


if __name__ == "__main__":
    unittest.main()
