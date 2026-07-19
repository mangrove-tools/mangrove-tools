#!/usr/bin/env python3
"""Scan HTML files for broken internal hrefs. No network required."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HREF_RE = re.compile(r"""href=["']([^"'#]+)""", re.I)
SKIP_PREFIXES = ("http://", "https://", "mailto:", "tel:", "//", "data:")


def resolve_target(page: Path, href: str) -> Path | None:
    if href.startswith(SKIP_PREFIXES):
        return None
    if href.startswith("/"):
        target = ROOT / href.lstrip("/")
    else:
        target = (page.parent / href).resolve()
        try:
            target.relative_to(ROOT)
        except ValueError:
            return None
    if target.is_dir():
        index = target / "index.html"
        return index if index.is_file() else target
    if target.suffix == "" and (ROOT / (str(target.relative_to(ROOT)) + "/index.html")).is_file():
        return ROOT / (str(target.relative_to(ROOT)) + "/index.html")
    return target


def main() -> int:
    html_files = sorted(ROOT.rglob("*.html"))
    html_files = [p for p in html_files if "node_modules" not in p.parts]
    broken: list[str] = []

    for page in html_files:
        text = page.read_text(encoding="utf-8")
        for href in HREF_RE.findall(text):
            if href.startswith(SKIP_PREFIXES) or href.startswith("#"):
                continue
            # Skip Netlify-only / setup anchors used as disabled CTAs
            if href in ("#setup-required",):
                continue
            target = resolve_target(page, href)
            if target is None:
                continue
            if target.is_file() or (target.is_dir() and (target / "index.html").is_file()):
                continue
            # Allow extensionless public text assets
            if target.suffix in (".txt", ".xml", ".svg", ".jpg", ".jpeg", ".png", ".webp", ".css", ".js"):
                if target.is_file():
                    continue
            rel_page = page.relative_to(ROOT)
            broken.append(f"{rel_page}: missing {href} -> {target.relative_to(ROOT) if target.is_relative_to(ROOT) else target}")

    if broken:
        print("Broken internal links:")
        for line in broken:
            print(" ", line)
        return 1

    print(f"OK — checked {len(html_files)} HTML files, no broken internal links.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
