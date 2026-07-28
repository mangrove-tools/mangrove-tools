from __future__ import annotations

import re
import unittest
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ROUTES = {
    "https://mangrovetools.com/",
    "https://mangrovetools.com/analytics/",
    "https://mangrovetools.com/analytics/budget/",
    "https://mangrovetools.com/analytics/forecast/",
    "https://mangrovetools.com/letterroi/",
    "https://mangrovetools.com/sponsorquote/",
    "https://mangrovetools.com/subtarget/",
    "https://mangrovetools.com/mediakit/",
    "https://mangrovetools.com/inventory/",
    "https://mangrovetools.com/about/",
    "https://mangrovetools.com/faq/",
    "https://mangrovetools.com/privacy/",
    "https://mangrovetools.com/contact/",
}


class HeadAndHeadingParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.meta: dict[str, str] = {}
        self.h1_text: list[str] = []
        self._in_h1 = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {key: value or "" for key, value in attrs}
        if tag == "meta":
            key = attr_map.get("property") or attr_map.get("name")
            if key:
                self.meta[key] = attr_map.get("content", "")
        if tag == "h1":
            self._in_h1 = True

    def handle_data(self, data: str) -> None:
        if self._in_h1:
            self.h1_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "h1":
            self._in_h1 = False

    @property
    def accessible_h1(self) -> str:
        return re.sub(r"\s+", " ", "".join(self.h1_text)).strip()


def parse_html(path: str) -> HeadAndHeadingParser:
    parser = HeadAndHeadingParser()
    parser.feed((ROOT / path).read_text(encoding="utf-8"))
    return parser


class PublicMetadataTests(unittest.TestCase):
    def test_faq_and_contact_have_social_preview_images(self) -> None:
        for path in ("faq/index.html", "contact/index.html"):
            with self.subTest(path=path):
                parser = parse_html(path)

                self.assertEqual(
                    "https://mangrovetools.com/og.webp",
                    parser.meta.get("og:image"),
                )
                self.assertEqual("1200", parser.meta.get("og:image:width"))
                self.assertEqual("630", parser.meta.get("og:image:height"))
                self.assertIn("Mangrove Tools", parser.meta.get("og:image:alt", ""))
                self.assertEqual(
                    "https://mangrovetools.com/og.webp",
                    parser.meta.get("twitter:image"),
                )
                self.assertIn(
                    "Mangrove Tools", parser.meta.get("twitter:image:alt", "")
                )

    def test_analytics_h1_accessible_text_preserves_word_spacing(self) -> None:
        parser = parse_html("analytics/index.html")

        self.assertEqual(
            "Marketing intelligence for small businesses",
            parser.accessible_h1,
        )

    def test_sitemap_contains_public_indexed_routes(self) -> None:
        sitemap = ET.parse(ROOT / "sitemap.xml")
        namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        urls = {
            loc.text
            for loc in sitemap.findall(".//sm:loc", namespace)
            if loc.text is not None
        }

        self.assertEqual(PUBLIC_ROUTES, urls)

    def test_llms_txt_contains_public_indexed_routes(self) -> None:
        llms_text = (ROOT / "llms.txt").read_text(encoding="utf-8")
        urls = set(re.findall(r"https://mangrovetools\.com/[^\]\s)]*", llms_text))

        self.assertEqual(PUBLIC_ROUTES - {"https://mangrovetools.com/"}, urls)


if __name__ == "__main__":
    unittest.main()
