from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class FontContractTests(unittest.TestCase):
    def test_global_font_contract_uses_sans_display_and_self_hosted_mono(self) -> None:
        fonts_css = (ROOT / "fonts.css").read_text(encoding="utf-8")
        site_css = (ROOT / "site.css").read_text(encoding="utf-8")

        self.assertIn('font-family: "IBM Plex Sans";', fonts_css)
        self.assertIn('font-family: "IBM Plex Mono";', fonts_css)
        self.assertIn('url("/fonts/ibm-plex-sans-', fonts_css)
        self.assertIn('url("/fonts/ibm-plex-mono-', fonts_css)
        self.assertIn('format("woff2")', fonts_css)

        self.assertIn(
            '--font-display: "IBM Plex Sans", "Segoe UI", sans-serif;',
            site_css,
        )
        self.assertIn(
            '--font-body: "IBM Plex Sans", "Segoe UI", sans-serif;',
            site_css,
        )
        self.assertIn(
            '--font-mono: "IBM Plex Mono", "SFMono-Regular", monospace;',
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
            "ibm-plex-mono-400.woff2",
            "ibm-plex-mono-500.woff2",
            "ibm-plex-mono-600.woff2",
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
        self.assertIn("IBM Plex Mono", provenance)
        self.assertIn("SIL Open Font License, Version 1.1", license_text)
