from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from validate_site import (
    check_json_files,
    check_secret_content,
    check_secret_paths,
    detect_protected_changes,
)


class ValidateSiteTests(unittest.TestCase):
    def test_invalid_json_reports_relative_path(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "good.json").write_text(json.dumps({"ok": True}), encoding="utf-8")
            (root / "bad.json").write_text("{", encoding="utf-8")

            errors = check_json_files(root, [Path("good.json"), Path("bad.json")])

            self.assertEqual(1, len(errors))
            self.assertIn("bad.json", errors[0])

    def test_secret_paths_reject_env_and_private_keys(self) -> None:
        files = [
            Path(".env"),
            Path(".env.local"),
            Path(".env.example"),
            Path("certs/signing.pem"),
            Path("site.css"),
        ]

        errors = check_secret_paths(files)

        self.assertEqual(3, len(errors))
        self.assertTrue(any(".env" in error for error in errors))
        self.assertTrue(any(".env.local" in error for error in errors))
        self.assertTrue(any("signing.pem" in error for error in errors))
        self.assertFalse(any(".env.example" in error for error in errors))

    def test_secret_content_detects_supported_token_shapes(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            token = "vck_" + "abcdefghijklmnopqrstuvwxyz123456"
            (root / "config.js").write_text(
                f'const token = "{token}";',
                encoding="utf-8",
            )

            errors = check_secret_content(root, [Path("config.js")])

            self.assertEqual(1, len(errors))
            self.assertIn("Vercel token", errors[0])

    def test_protected_change_requires_approval(self) -> None:
        errors = detect_protected_changes(
            changed_files=[Path("vercel.json"), Path("site.css")],
            diff_text="",
            allow_protected=False,
        )

        self.assertEqual(1, len(errors))
        self.assertIn("vercel.json", errors[0])

    def test_approved_protected_change_passes_gate(self) -> None:
        errors = detect_protected_changes(
            changed_files=[Path("vercel.json")],
            diff_text='+ "Content-Security-Policy": "default-src self"',
            allow_protected=True,
        )

        self.assertEqual([], errors)

    def test_protected_value_requires_approval(self) -> None:
        errors = detect_protected_changes(
            changed_files=[Path("index.html")],
            diff_text='+ gtag("config", "G-EXAMPLE123")',
            allow_protected=False,
        )

        self.assertEqual(1, len(errors))
        self.assertIn("Google Analytics", errors[0])


if __name__ == "__main__":
    unittest.main()
