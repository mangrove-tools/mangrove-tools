from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class ResultStateLinkParser(HTMLParser):
    def __init__(self, result_id: str) -> None:
        super().__init__()
        self.result_id = result_id
        self.depth = 0
        self.in_result = False
        self.current_link: dict[str, str] | None = None
        self.links: list[dict[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {name: value or "" for name, value in attrs}
        if tag == "div" and attr_map.get("id") == self.result_id:
            self.in_result = True
            self.depth = 1
            return
        if self.in_result:
            if tag == "div":
                self.depth += 1
            if tag == "a":
                self.current_link = {
                    "href": attr_map.get("href", ""),
                    "class": attr_map.get("class", ""),
                    "text": "",
                }

    def handle_data(self, data: str) -> None:
        if self.current_link is not None:
            self.current_link["text"] += data

    def handle_endtag(self, tag: str) -> None:
        if self.in_result and tag == "a" and self.current_link is not None:
            self.links.append(self.current_link)
            self.current_link = None
        if self.in_result and tag == "div":
            self.depth -= 1
            if self.depth == 0:
                self.in_result = False


def result_links(route: str, result_id: str) -> list[dict[str, str]]:
    parser = ResultStateLinkParser(result_id)
    parser.feed((ROOT / route / "index.html").read_text(encoding="utf-8"))
    return parser.links


class NewsletterAnalyticsCtaTests(unittest.TestCase):
    EXPECTED = {
        "letterroi": ("results", "/analytics/forecast/"),
        "sponsorquote": ("results", "/analytics/budget/"),
        "subtarget": ("results", "/analytics/forecast/"),
        "mediakit": ("kit-out", "/analytics/budget/"),
        "inventory": ("inventory-result", "/analytics/forecast/"),
    }

    def test_each_newsletter_result_state_has_one_contextual_analytics_cta(self) -> None:
        for route, (result_id, href) in self.EXPECTED.items():
            with self.subTest(route=route):
                analytics_links = [
                    link
                    for link in result_links(route, result_id)
                    if "analytics-cta" in link["class"].split()
                ]

                self.assertEqual(1, len(analytics_links))
                self.assertEqual(href, analytics_links[0]["href"])
                self.assertGreaterEqual(len(analytics_links[0]["text"].strip()), 18)


if __name__ == "__main__":
    unittest.main()
