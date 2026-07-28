from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from validate_site import (
    check_javascript_files,
    check_json_files,
    check_secret_content,
    check_secret_paths,
    detect_protected_changes,
    tracked_files,
)


ROOT = Path(__file__).resolve().parents[1]


def run_git(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    )


def initialize_repository(root: Path) -> None:
    run_git(root, "init", "-b", "main")
    run_git(root, "config", "user.email", "test@example.com")
    run_git(root, "config", "user.name", "Test User")


def install_validator(root: Path) -> None:
    scripts = root / "scripts"
    scripts.mkdir(exist_ok=True)
    shutil.copy2(ROOT / "scripts/validate_site.py", scripts)
    shutil.copy2(ROOT / "scripts/check-links.py", scripts)
    (root / "index.html").write_text("<main>Test</main>", encoding="utf-8")


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

    def test_secret_content_scans_fine_grained_github_tokens(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            token = "github" + "_pat_" + ("a" * 82)
            (root / ".env.example").write_text(
                f"GITHUB_TOKEN={token}\n",
                encoding="utf-8",
            )

            errors = check_secret_content(root, [Path(".env.example")])

            self.assertEqual(1, len(errors))
            self.assertIn("GitHub fine-grained token", errors[0])

    def test_secret_content_scans_all_tracked_non_binary_files(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            initialize_repository(root)
            token = "vck_" + "abcdefghijklmnopqrstuvwxyz123456"
            text_paths = [
                Path("settings.toml"),
                Path("settings.ini"),
                Path("server.conf"),
                Path("deploy.sh"),
                Path("logo.svg"),
                Path(".npmrc"),
                Path("Dockerfile"),
                Path(".env.example"),
            ]
            for path in text_paths:
                (root / path).write_text(f"token={token}\n", encoding="utf-8")
            (root / "binary.dat").write_bytes(b"\0" + token.encode("ascii"))
            run_git(root, "add", ".")
            run_git(root, "commit", "-m", "add unusual text files")

            errors = check_secret_content(root, tracked_files(root))

            self.assertEqual(len(text_paths), len(errors))
            for path in text_paths:
                self.assertTrue(
                    any(str(path) in error for error in errors),
                    f"expected secret finding for {path}",
                )
            self.assertFalse(any("binary.dat" in error for error in errors))

    def test_secret_history_scans_token_added_then_removed(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            initialize_repository(root)
            install_validator(root)
            run_git(root, "add", ".")
            run_git(root, "commit", "-m", "base")
            run_git(root, "checkout", "-b", "feature")

            token = "github" + "_pat_" + ("b" * 82)
            (root / "transient.conf").write_text(
                f"token={token}\n",
                encoding="utf-8",
            )
            run_git(root, "add", "transient.conf")
            run_git(root, "commit", "-m", "add transient token")
            (root / "transient.conf").unlink()
            run_git(root, "add", "transient.conf")
            run_git(root, "commit", "-m", "remove transient token")

            result = subprocess.run(
                [
                    sys.executable,
                    "scripts/validate_site.py",
                    "--base-ref",
                    "main",
                    "--allow-protected",
                ],
                cwd=root,
                check=False,
                capture_output=True,
                text=True,
            )

            self.assertEqual(1, result.returncode)
            self.assertIn("FAIL secret history", result.stdout)
            self.assertIn("transient.conf", result.stdout)
            self.assertIn("GitHub fine-grained token", result.stdout)

    def test_invalid_commonjs_fails_javascript_validation(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "broken.cjs").write_text(
                "module.exports = {\n",
                encoding="utf-8",
            )

            errors = check_javascript_files(root, [Path("broken.cjs")])

            self.assertEqual(1, len(errors))
            self.assertIn("broken.cjs", errors[0])

    def test_protected_change_requires_approval(self) -> None:
        errors = detect_protected_changes(
            root=ROOT,
            base_ref="HEAD",
            changed_files=[Path("vercel.json"), Path("site.css")],
            allow_protected=False,
        )

        self.assertEqual(1, len(errors))
        self.assertIn("vercel.json", errors[0])

    def test_backend_and_runtime_dependency_changes_require_approval(self) -> None:
        paths = [
            Path("api/analytics/events.js"),
            Path("supabase/migrations/001.sql"),
            Path("package.json"),
            Path("package-lock.json"),
            Path("shared/tool-extras.js"),
        ]

        errors = detect_protected_changes(
            root=ROOT,
            base_ref="HEAD",
            changed_files=paths,
            allow_protected=False,
        )

        self.assertEqual(4, len(errors))
        for path in paths[:4]:
            self.assertTrue(any(str(path) in error for error in errors))
        self.assertFalse(any("shared/tool-extras.js" in error for error in errors))

    def test_validator_implementation_files_are_protected(self) -> None:
        paths = [
            Path("scripts/validate_site.py"),
            Path("scripts/test_validate_site.py"),
            Path("scripts/check-links.py"),
        ]

        errors = detect_protected_changes(
            root=ROOT,
            base_ref="HEAD",
            changed_files=paths,
            allow_protected=False,
        )

        self.assertEqual(3, len(errors))
        for path in paths:
            self.assertTrue(any(str(path) in error for error in errors))

    def test_approved_protected_change_passes_gate(self) -> None:
        errors = detect_protected_changes(
            root=ROOT,
            base_ref="HEAD",
            changed_files=[Path("vercel.json")],
            allow_protected=True,
        )

        self.assertEqual([], errors)

    def test_protected_value_requires_approval(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            initialize_repository(root)
            (root / "index.html").write_text("<main>Base</main>", encoding="utf-8")
            run_git(root, "add", ".")
            run_git(root, "commit", "-m", "base")
            run_git(root, "checkout", "-b", "feature")
            (root / "index.html").write_text(
                '<script>gtag("config", "G-EXAMPLE123")</script>',
                encoding="utf-8",
            )
            run_git(root, "add", "index.html")
            run_git(root, "commit", "-m", "change analytics identity")

            errors = detect_protected_changes(
                root=root,
                base_ref="main",
                changed_files=[Path("index.html")],
                allow_protected=False,
            )

            self.assertEqual(1, len(errors))
            self.assertIn("Google Analytics", errors[0])

    def test_protected_values_ignore_implementation_docs_and_tests(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            initialize_repository(root)
            paths = [
                Path("docs/ops/guide.md"),
                Path("tests/test_guardrails.py"),
            ]
            for path in paths:
                (root / path).parent.mkdir(parents=True, exist_ok=True)
                (root / path).write_text("base\n", encoding="utf-8")
            run_git(root, "add", ".")
            run_git(root, "commit", "-m", "base")
            run_git(root, "checkout", "-b", "feature")
            (root / paths[0]).write_text("AFFILIATE_URL\n", encoding="utf-8")
            (root / paths[1]).write_text('"G-EXAMPLE123"\n', encoding="utf-8")
            run_git(root, "add", ".")
            run_git(root, "commit", "-m", "update implementation docs")

            errors = detect_protected_changes(
                root=root,
                base_ref="main",
                changed_files=paths,
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

    def test_cli_protected_values_are_path_bound_for_unusual_names(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            initialize_repository(root)
            install_validator(root)
            run_git(root, "add", ".")
            run_git(root, "commit", "-m", "base")
            run_git(root, "checkout", "-b", "feature")

            unusual_path = Path("landing pages") / "tab\tcafé.html"
            (root / unusual_path).parent.mkdir()
            (root / unusual_path).write_text(
                "+++ content that resembles a diff header\n"
                '<script>gtag("config", "G-EXAMPLE123")</script>\n',
                encoding="utf-8",
            )
            run_git(root, "add", str(unusual_path))
            run_git(root, "commit", "-m", "add unusual protected file")

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

    def test_cli_protected_values_detect_deletion(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            initialize_repository(root)
            install_validator(root)
            protected_path = Path("landing pages") / "old\tcafé.html"
            (root / protected_path).parent.mkdir()
            (root / protected_path).write_text(
                '<script>gtag("config", "G-EXAMPLE123")</script>\n',
                encoding="utf-8",
            )
            run_git(root, "add", ".")
            run_git(root, "commit", "-m", "base")
            run_git(root, "checkout", "-b", "feature")
            (root / protected_path).unlink()
            run_git(root, "add", str(protected_path))
            run_git(root, "commit", "-m", "delete protected file")

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


if __name__ == "__main__":
    unittest.main()
