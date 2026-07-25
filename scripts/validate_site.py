#!/usr/bin/env python3
"""Run deterministic validation for the Mangrove Tools static site."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable, Sequence

ROOT = Path(__file__).resolve().parents[1]
TEXT_SUFFIXES = {
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".txt",
    ".xml",
    ".yaml",
    ".yml",
}
SECRET_SUFFIXES = {
    ".crt",
    ".key",
    ".mobileprovision",
    ".p12",
    ".p8",
    ".pem",
}
SECRET_PATTERNS = {
    "private key": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    "OpenAI-style token": re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b"),
    "Vercel token": re.compile(r"\bvck_[A-Za-z0-9_-]{20,}\b"),
    "GitHub token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"),
}
PROTECTED_FILES = {
    Path(".github/CODEOWNERS"),
    Path(".vercelignore"),
    Path("AGENTS.md"),
    Path("vercel.json"),
}
PROTECTED_VALUES = {
    "affiliate identifier": re.compile(r"AFFILIATE_URL|[?&]via="),
    "Google Analytics identity": re.compile(r"\bG-[A-Z0-9]{6,}\b"),
    "security policy": re.compile(r"Content-Security-Policy"),
}
PROTECTED_VALUE_SUFFIXES = {".css", ".html", ".js", ".json", ".mjs", ".yaml", ".yml"}
PROTECTED_VALUE_IGNORED_TOP_LEVEL = {".github", ".superpowers", "docs", "scripts", "tests"}


class ValidatorArgumentParser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        print("FAIL validator usage")
        print(f"  - {message}")
        self.exit(1)


def run(command: Sequence[str], *, cwd: Path = ROOT) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=cwd,
        check=False,
        capture_output=True,
        text=True,
    )


def tracked_files(root: Path) -> list[Path]:
    result = run(["git", "ls-files", "-z"], cwd=root)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "git ls-files failed")
    return [Path(item) for item in result.stdout.split("\0") if item]


def check_secret_paths(files: Iterable[Path]) -> list[str]:
    errors: list[str] = []
    for path in files:
        name = path.name
        is_env = name == ".env" or (name.startswith(".env.") and name != ".env.example")
        if is_env or path.suffix.lower() in SECRET_SUFFIXES:
            errors.append(f"tracked secret-like file: {path}")
    return errors


def check_secret_content(root: Path, files: Iterable[Path]) -> list[str]:
    errors: list[str] = []
    for path in files:
        if path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        full_path = root / path
        if not full_path.is_file():
            continue
        text = full_path.read_text(encoding="utf-8", errors="ignore")
        for label, pattern in SECRET_PATTERNS.items():
            if pattern.search(text):
                errors.append(f"{path}: possible {label}")
    return errors


def check_json_files(root: Path, files: Iterable[Path]) -> list[str]:
    errors: list[str] = []
    for path in files:
        if path.suffix.lower() != ".json":
            continue
        try:
            json.loads((root / path).read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            errors.append(f"{path}: invalid JSON: {exc}")
    return errors


def check_javascript_files(root: Path, files: Iterable[Path]) -> list[str]:
    errors: list[str] = []
    for path in files:
        if path.suffix.lower() not in {".js", ".mjs"}:
            continue
        result = run(["node", "--check", str(path)], cwd=root)
        if result.returncode != 0:
            detail = result.stderr.strip() or result.stdout.strip()
            errors.append(f"{path}: JavaScript syntax error: {detail}")
    return errors


def changed_files(root: Path, base_ref: str) -> list[Path]:
    result = run(["git", "diff", "--name-only", f"{base_ref}...HEAD"], cwd=root)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "git diff --name-only failed")
    return [Path(line) for line in result.stdout.splitlines() if line]


def changed_diff(root: Path, base_ref: str) -> str:
    result = run(["git", "diff", "--unified=0", f"{base_ref}...HEAD"], cwd=root)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "git diff failed")
    return result.stdout


def protected_value_path(path: Path) -> bool:
    return (
        bool(path.parts)
        and path.parts[0] not in PROTECTED_VALUE_IGNORED_TOP_LEVEL
        and path.suffix.lower() in PROTECTED_VALUE_SUFFIXES
    )


def diff_path(header: str) -> Path | None:
    raw_path = header[4:].split("\t", 1)[0]
    if raw_path == "/dev/null":
        return None
    if raw_path.startswith(("a/", "b/")):
        raw_path = raw_path[2:]
    return Path(raw_path)


def detect_protected_changes(
    changed_files: Iterable[Path],
    diff_text: str,
    allow_protected: bool,
) -> list[str]:
    if allow_protected:
        return []
    errors = [
        f"protected change requires owner approval label: {path}"
        for path in changed_files
        if path in PROTECTED_FILES or path.parts[:2] == (".github", "workflows")
    ]
    changed_lines: list[str] = []
    current_path: Path | None = None
    for line in diff_text.splitlines():
        if line.startswith("--- ") or line.startswith("+++ "):
            path = diff_path(line)
            if path is not None:
                current_path = path
            continue
        if line[:1] in {"+", "-"} and current_path and protected_value_path(current_path):
            changed_lines.append(line[1:])
    changed_text = "\n".join(changed_lines)
    for label, pattern in PROTECTED_VALUES.items():
        if pattern.search(changed_text):
            errors.append(f"protected {label} change requires owner approval label")
    return errors


def run_link_checker(root: Path) -> list[str]:
    result = run([sys.executable, "scripts/check-links.py"], cwd=root)
    if result.returncode == 0:
        return []
    detail = result.stdout.strip() or result.stderr.strip()
    return [f"internal link check failed: {detail}"]


def print_result(name: str, errors: Sequence[str]) -> None:
    if errors:
        print(f"FAIL {name}")
        for error in errors:
            print(f"  - {error}")
    else:
        print(f"PASS {name}")


def main() -> int:
    parser = ValidatorArgumentParser(description=__doc__)
    parser.add_argument("--base-ref", help="Git ref used to identify PR changes")
    parser.add_argument(
        "--allow-protected",
        action="store_true",
        help="Allow protected changes after named owner approval",
    )
    args = parser.parse_args()

    try:
        files = tracked_files(ROOT)
        checks: list[tuple[str, list[str]]] = [
            ("internal links", run_link_checker(ROOT)),
            ("JSON", check_json_files(ROOT, files)),
            ("JavaScript syntax", check_javascript_files(ROOT, files)),
            ("secret file paths", check_secret_paths(files)),
            ("secret content", check_secret_content(ROOT, files)),
        ]
        if args.base_ref:
            checks.append(
                (
                    "protected changes",
                    detect_protected_changes(
                        changed_files(ROOT, args.base_ref),
                        changed_diff(ROOT, args.base_ref),
                        args.allow_protected,
                    ),
                )
            )
    except (OSError, RuntimeError) as exc:
        print(f"FAIL validator setup\n  - {exc}")
        return 1

    for name, errors in checks:
        print_result(name, errors)
    return 1 if any(errors for _, errors in checks) else 0


if __name__ == "__main__":
    raise SystemExit(main())
