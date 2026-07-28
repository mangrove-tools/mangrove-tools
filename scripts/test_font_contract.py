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

    def test_font_assets_and_provenance_are_committed(self) -> None:
        expected_fonts = {
            "source-serif-4-500.woff2",
            "source-serif-4-600.woff2",
            "source-serif-4-700.woff2",
            "ibm-plex-sans-400.woff2",
            "ibm-plex-sans-500.woff2",
            "ibm-plex-sans-600.woff2",
            "ibm-plex-sans-700.woff2",
        }
        fonts_dir = ROOT / "fonts"

        self.assertEqual(
            expected_fonts,
            {path.name for path in fonts_dir.glob("*.woff2")},
        )
        for filename in expected_fonts:
            with self.subTest(filename=filename):
                self.assertEqual(b"wOF2", (fonts_dir / filename).read_bytes()[:4])

        provenance = (fonts_dir / "README.md").read_text(encoding="utf-8")
        license_text = (fonts_dir / "OFL.txt").read_text(encoding="utf-8")
        self.assertIn("https://github.com/adobe-fonts/source-serif", provenance)
        self.assertIn("https://github.com/IBM/plex", provenance)
        self.assertIn("SIL Open Font License, Version 1.1", license_text)

    def test_repository_contract_names_the_active_fonts(self) -> None:
        agent_contract = (ROOT / "AGENTS.md").read_text(encoding="utf-8")

        self.assertIn("Source Serif 4 + IBM Plex Sans", agent_contract)
