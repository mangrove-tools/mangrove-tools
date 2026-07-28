#!/usr/bin/env python3
"""Run deterministic validation for the Mangrove Tools static site."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable, Sequence

ROOT = Path(__file__).resolve().parents[1]
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
    "GitHub fine-grained token": re.compile(
        r"\bgithub_pat_[A-Za-z0-9_]{82}\b"
    ),
}
PROTECTED_FILES = {
    Path(".github/CODEOWNERS"),
    Path(".vercelignore"),
    Path("AGENTS.md"),
    Path("package-lock.json"),
    Path("package.json"),
    Path("scripts/check-links.py"),
    Path("scripts/test_validate_site.py"),
    Path("scripts/validate_site.py"),
    Path("vercel.json"),
}
PROTECTED_TOP_LEVEL_DIRECTORIES = {"api", "supabase"}
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


def run_bytes(
    command: Sequence[str], *, cwd: Path = ROOT
) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(
        command,
        cwd=cwd,
        check=False,
        capture_output=True,
    )


def nul_paths(data: bytes) -> list[Path]:
    return [Path(os.fsdecode(item)) for item in data.split(b"\0") if item]


def tracked_files(root: Path) -> list[Path]:
    result = run_bytes(["git", "ls-files", "-z"], cwd=root)
    if result.returncode != 0:
        detail = os.fsdecode(result.stderr).strip()
        raise RuntimeError(detail or "git ls-files failed")
    return nul_paths(result.stdout)


def check_secret_paths(files: Iterable[Path]) -> list[str]:
    errors: list[str] = []
    for path in files:
        name = path.name
        is_env = name == ".env" or (name.startswith(".env.") and name != ".env.example")
        if is_env or path.suffix.lower() in SECRET_SUFFIXES:
            errors.append(f"tracked secret-like file: {path}")
    return errors


def is_binary(data: bytes) -> bool:
    return b"\0" in data


def secret_findings(label: str, data: bytes) -> list[str]:
    if is_binary(data):
        return []
    text = data.decode("utf-8", errors="replace")
    return [
        f"{label}: possible {pattern_label}"
        for pattern_label, pattern in SECRET_PATTERNS.items()
        if pattern.search(text)
    ]


def check_secret_content(root: Path, files: Iterable[Path]) -> list[str]:
    errors: list[str] = []
    for path in files:
        full_path = root / path
        if not full_path.is_file():
            continue
        errors.extend(secret_findings(str(path), full_path.read_bytes()))
    return errors


def commits_in_range(root: Path, base_ref: str) -> list[str]:
    result = run(["git", "rev-list", "--reverse", f"{base_ref}..HEAD"], cwd=root)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "git rev-list failed")
    return result.stdout.splitlines()


def changed_paths_in_commit(root: Path, commit: str) -> list[Path]:
    result = run_bytes(
        [
            "git",
            "diff-tree",
            "--root",
            "--no-commit-id",
            "--name-only",
            "-r",
            "-z",
            "--no-renames",
            "-m",
            commit,
        ],
        cwd=root,
    )
    if result.returncode != 0:
        detail = os.fsdecode(result.stderr).strip()
        raise RuntimeError(detail or f"git diff-tree failed for {commit}")
    return nul_paths(result.stdout)


def blob_id_at_ref(root: Path, ref: str, path: Path) -> str | None:
    result = run(["git", "rev-parse", f"{ref}:{path}"], cwd=root)
    if result.returncode != 0:
        return None
    return result.stdout.strip()


def blob_bytes(root: Path, blob_id: str) -> bytes:
    result = run_bytes(["git", "cat-file", "blob", blob_id], cwd=root)
    if result.returncode != 0:
        detail = os.fsdecode(result.stderr).strip()
        raise RuntimeError(detail or f"git cat-file failed for {blob_id}")
    return result.stdout


def check_secret_history(root: Path, base_ref: str) -> list[str]:
    errors: list[str] = []
    scanned_blobs: set[str] = set()
    for commit in commits_in_range(root, base_ref):
        for path in changed_paths_in_commit(root, commit):
            blob_id = blob_id_at_ref(root, commit, path)
            if blob_id is None or blob_id in scanned_blobs:
                continue
            scanned_blobs.add(blob_id)
            errors.extend(
                secret_findings(
                    f"{path} at commit {commit[:12]}",
                    blob_bytes(root, blob_id),
                )
            )
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
        if path.suffix.lower() not in {".cjs", ".js", ".mjs"}:
            continue
        result = run(["node", "--check", str(path)], cwd=root)
        if result.returncode != 0:
            detail = result.stderr.strip() or result.stdout.strip()
            errors.append(f"{path}: JavaScript syntax error: {detail}")
    return errors


def changed_files(root: Path, base_ref: str) -> list[Path]:
    result = run_bytes(
        [
            "git",
            "diff",
            "--name-only",
            "-z",
            "--no-renames",
            f"{base_ref}...HEAD",
        ],
        cwd=root,
    )
    if result.returncode != 0:
        detail = os.fsdecode(result.stderr).strip()
        raise RuntimeError(detail or "git diff --name-only failed")
    return nul_paths(result.stdout)


def protected_value_path(path: Path) -> bool:
    return (
        bool(path.parts)
        and path.parts[0] not in PROTECTED_VALUE_IGNORED_TOP_LEVEL
        and path.suffix.lower() in PROTECTED_VALUE_SUFFIXES
    )


def protected_lines(data: bytes | None, pattern: re.Pattern[str]) -> tuple[str, ...]:
    if data is None or is_binary(data):
        return ()
    text = data.decode("utf-8", errors="replace")
    return tuple(line for line in text.splitlines() if pattern.search(line))


def blob_at_ref(root: Path, ref: str, path: Path) -> bytes | None:
    blob_id = blob_id_at_ref(root, ref, path)
    if blob_id is None:
        return None
    return blob_bytes(root, blob_id)


def detect_protected_changes(
    root: Path,
    base_ref: str,
    changed_files: Iterable[Path],
    allow_protected: bool,
) -> list[str]:
    if allow_protected:
        return []
    paths = list(changed_files)
    errors = [
        f"protected change requires owner approval label: {path}"
        for path in paths
        if (
            path in PROTECTED_FILES
            or path.parts[:2] == (".github", "workflows")
            or (path.parts and path.parts[0] in PROTECTED_TOP_LEVEL_DIRECTORIES)
        )
    ]
    for path in paths:
        if not protected_value_path(path):
            continue
        base_data = blob_at_ref(root, base_ref, path)
        head_data = blob_at_ref(root, "HEAD", path)
        for label, pattern in PROTECTED_VALUES.items():
            if protected_lines(base_data, pattern) != protected_lines(head_data, pattern):
                errors.append(
                    f"protected {label} change requires owner approval label: {path}"
                )
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
            changed = changed_files(ROOT, args.base_ref)
            checks.append(
                ("secret history", check_secret_history(ROOT, args.base_ref))
            )
            checks.append(
                (
                    "protected changes",
                    detect_protected_changes(
                        ROOT,
                        args.base_ref,
                        changed,
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
