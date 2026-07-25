from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from validate_site import (
    check_json_files,
    check_secret_content,
    check_secret_paths,
    detect_protected_changes,
)


ROOT = Path(__file__).resolve().parents[1]


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
            diff_text='+++ b/index.html\n+ gtag("config", "G-EXAMPLE123")',
            allow_protected=False,
        )

        self.assertEqual(1, len(errors))
        self.assertIn("Google Analytics", errors[0])

    def test_protected_values_ignore_implementation_docs_and_tests(self) -> None:
        errors = detect_protected_changes(
            changed_files=[
                Path("scripts/validate_site.py"),
                Path("docs/ops/guide.md"),
                Path("tests/test_guardrails.py"),
            ],
            diff_text=(
                '+++ b/scripts/validate_site.py\n'
                '+ "Content-Security-Policy"\n'
                '+++ b/docs/ops/guide.md\n'
                '+ AFFILIATE_URL\n'
                '+++ b/tests/test_guardrails.py\n'
                '+ "G-EXAMPLE123"\n'
            ),
            allow_protected=False,
        )

        self.assertEqual([], errors)

    def test_cli_reports_named_passing_checks(self) -> None:
        result = subprocess.run(
            [sys.executable, "scripts/validate_site.py"],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )

        self.assertEqual(0, result.returncode)
        self.assertIn("PASS internal links", result.stdout)
        self.assertIn("PASS secret content", result.stdout)

    def test_cli_invalid_base_ref_uses_fail_output_and_exit_one(self) -> None:
        result = subprocess.run(
            [sys.executable, "scripts/validate_site.py", "--base-ref", "missing-ref"],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )

        self.assertEqual(1, result.returncode)
        self.assertIn("FAIL validator setup", result.stdout)

    def test_cli_invalid_usage_uses_fail_output_and_exit_one(self) -> None:
        result = subprocess.run(
            [sys.executable, "scripts/validate_site.py", "--unknown-option"],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )

        self.assertEqual(1, result.returncode)
        self.assertIn("FAIL validator usage", result.stdout)

    def test_cli_committed_product_diff_requires_protected_approval(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            scripts = root / "scripts"
            scripts.mkdir()
            shutil.copy2(ROOT / "scripts/validate_site.py", scripts)
            shutil.copy2(ROOT / "scripts/check-links.py", scripts)
            (root / "index.html").write_text("<main>Base</main>", encoding="utf-8")

            for command in (
                ["git", "init", "-b", "main"],
                ["git", "config", "user.email", "test@example.com"],
                ["git", "config", "user.name", "Test User"],
                ["git", "add", "."],
                ["git", "commit", "-m", "base"],
                ["git", "checkout", "-b", "feature"],
            ):
                subprocess.run(command, cwd=root, check=True, capture_output=True, text=True)

            (root / "index.html").write_text(
                '<script>gtag("config", "G-EXAMPLE123")</script>',
                encoding="utf-8",
            )
            subprocess.run(
                ["git", "add", "index.html"],
                cwd=root,
                check=True,
                capture_output=True,
                text=True,
            )
            subprocess.run(
                ["git", "commit", "-m", "add analytics identity"],
                cwd=root,
                check=True,
                capture_output=True,
                text=True,
            )

            result = subprocess.run(
                [sys.executable, "scripts/validate_site.py", "--base-ref", "main"],
                cwd=root,
                check=False,
                capture_output=True,
                text=True,
            )

            self.assertEqual(1, result.returncode)
            self.assertIn("FAIL protected changes", result.stdout)
            self.assertIn("Google Analytics identity", result.stdout)
            self.assertNotIn("affiliate identifier", result.stdout)


if __name__ == "__main__":
    unittest.main()
