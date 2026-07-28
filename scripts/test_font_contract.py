from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class FontContractTests(unittest.TestCase):
    def test_global_font_contract_uses_self_hosted_serif_and_sans(self) -> None:
        fonts_css = (ROOT / "fonts.css").read_text(encoding="utf-8")
        site_css = (ROOT / "site.css").read_text(encoding="utf-8")

        self.assertIn('font-family: "Source Serif 4";', fonts_css)
        self.assertIn('font-family: "IBM Plex Sans";', fonts_css)
        self.assertIn('url("/fonts/source-serif-4-', fonts_css)
        self.assertIn('url("/fonts/ibm-plex-sans-', fonts_css)
        self.assertIn('format("woff2")', fonts_css)

        self.assertIn(
            '--font-display: "Source Serif 4", Georgia, serif;',
            site_css,
        )
        self.assertIn(
            '--font-body: "IBM Plex Sans", "Segoe UI", sans-serif;',
            site_css,
        )
