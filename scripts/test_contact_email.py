import json
import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTACT_EMAIL = "mangrovetools@gmail.com"
OLD_CONTACT_EMAIL = "needlesearchapp@protonmail.com"


class ContactEmailParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.mailto_links = []
        self.json_ld_blocks = []
        self._current_mailto = None
        self._json_ld_parts = None

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "a" and attributes.get("href", "").startswith("mailto:"):
            self._current_mailto = {
                "email": attributes["href"].removeprefix("mailto:"),
                "text": [],
            }
        if tag == "script" and attributes.get("type") == "application/ld+json":
            self._json_ld_parts = []

    def handle_data(self, data):
        if self._current_mailto is not None:
            self._current_mailto["text"].append(data)
        if self._json_ld_parts is not None:
            self._json_ld_parts.append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self._current_mailto is not None:
            self._current_mailto["text"] = "".join(
                self._current_mailto["text"]
            ).strip()
            self.mailto_links.append(self._current_mailto)
            self._current_mailto = None
        if tag == "script" and self._json_ld_parts is not None:
            self.json_ld_blocks.append(json.loads("".join(self._json_ld_parts)))
            self._json_ld_parts = None


def structured_emails(value):
    if isinstance(value, dict):
        emails = [value["email"]] if "email" in value else []
        for child in value.values():
            emails.extend(structured_emails(child))
        return emails
    if isinstance(value, list):
        emails = []
        for child in value:
            emails.extend(structured_emails(child))
        return emails
    return []


class ContactEmailTests(unittest.TestCase):
    def parse_page(self, relative_path):
        source = (ROOT / relative_path).read_text(encoding="utf-8")
        parser = ContactEmailParser()
        parser.feed(source)
        emails = []
        for block in parser.json_ld_blocks:
            emails.extend(structured_emails(block))
        return source, parser.mailto_links, emails

    def test_public_contact_surfaces_use_the_mangrove_tools_email(self):
        expected = {
            "index.html": {"mailto": [], "structured": [CONTACT_EMAIL]},
            "about/index.html": {
                "mailto": [
                    {"email": CONTACT_EMAIL, "text": CONTACT_EMAIL},
                ],
                "structured": [CONTACT_EMAIL, CONTACT_EMAIL],
            },
            "contact/index.html": {
                "mailto": [
                    {"email": CONTACT_EMAIL, "text": CONTACT_EMAIL},
                ],
                "structured": [],
            },
        }

        for relative_path, page_expected in expected.items():
            with self.subTest(relative_path=relative_path):
                source, mailto_links, emails = self.parse_page(relative_path)
                self.assertEqual(page_expected["mailto"], mailto_links)
                self.assertEqual(page_expected["structured"], emails)
                self.assertNotIn(OLD_CONTACT_EMAIL, source)


if __name__ == "__main__":
    unittest.main()
