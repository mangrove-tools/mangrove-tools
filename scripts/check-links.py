#!/usr/bin/env python3
"""Scan HTML files for broken internal hrefs. Optional --external HEAD checks."""

from __future__ import annotations

import argparse
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HREF_RE = re.compile(r"""href=["']([^"'#]+)""", re.I)
SKIP_PREFIXES = ("http://", "https://", "mailto:", "tel:", "//", "data:")
EXTERNAL_SKIP = (
    "buy.stripe.com",  # payment links; HEAD may vary
)


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
    if target.suffix == "" and (
        ROOT / (str(target.relative_to(ROOT)) + "/index.html")
    ).is_file():
        return ROOT / (str(target.relative_to(ROOT)) + "/index.html")
    return target


def check_internal() -> list[str]:
    html_files = sorted(ROOT.rglob("*.html"))
    html_files = [p for p in html_files if "node_modules" not in p.parts]
    broken: list[str] = []

    for page in html_files:
        text = page.read_text(encoding="utf-8")
        for href in HREF_RE.findall(text):
            if href.startswith(SKIP_PREFIXES) or href.startswith("#"):
                continue
            if href in ("#setup-required",):
                continue
            target = resolve_target(page, href)
            if target is None:
                continue
            if target.is_file() or (
                target.is_dir() and (target / "index.html").is_file()
            ):
                continue
            if target.suffix in (
                ".txt",
                ".xml",
                ".svg",
                ".jpg",
                ".jpeg",
                ".png",
                ".webp",
                ".css",
                ".js",
                ".zip",
            ):
                if target.is_file():
                    continue
            rel_page = page.relative_to(ROOT)
            broken.append(
                f"{rel_page}: missing {href} -> "
                f"{target.relative_to(ROOT) if target.is_relative_to(ROOT) else target}"
            )
    return broken


def collect_external() -> list[str]:
    urls: set[str] = set()
    for page in ROOT.rglob("*.html"):
        if "node_modules" in page.parts or "docs" in page.parts:
            continue
        for href in HREF_RE.findall(page.read_text(encoding="utf-8")):
            if href.startswith("https://") or href.startswith("http://"):
                if any(skip in href for skip in EXTERNAL_SKIP):
                    continue
                urls.add(href.split("#")[0])
    return sorted(urls)


def head_ok(url: str, timeout: float = 8.0) -> tuple[bool, str]:
    req = urllib.request.Request(
        url,
        method="HEAD",
        headers={"User-Agent": "mangrove-link-check/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            code = getattr(resp, "status", 200)
            if 200 <= code < 400:
                return True, str(code)
            return False, str(code)
    except urllib.error.HTTPError as exc:
        # Some hosts reject HEAD; retry GET lightly
        if exc.code in (405, 403):
            try:
                get_req = urllib.request.Request(
                    url,
                    method="GET",
                    headers={"User-Agent": "mangrove-link-check/1.0"},
                )
                with urllib.request.urlopen(get_req, timeout=timeout) as resp:
                    code = getattr(resp, "status", 200)
                    if 200 <= code < 400:
                        return True, f"GET {code}"
            except Exception as retry_exc:  # noqa: BLE001
                return False, f"HTTP {exc.code}; GET fail {retry_exc}"
        return False, f"HTTP {exc.code}"
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--external",
        action="store_true",
        help="Also HEAD-check unique external https links (slow; network)",
    )
    args = parser.parse_args()

    broken = check_internal()
    html_count = len(
        [p for p in ROOT.rglob("*.html") if "node_modules" not in p.parts]
    )

    if broken:
        print("Broken internal links:")
        for line in broken:
            print(" ", line)
        return 1

    print(f"OK — checked {html_count} HTML files, no broken internal links.")

    if args.external:
        urls = collect_external()
        print(f"Checking {len(urls)} external URLs…")
        fails: list[str] = []
        for url in urls:
            ok, detail = head_ok(url)
            if not ok:
                fails.append(f"{url} ({detail})")
        if fails:
            print("External failures:")
            for line in fails:
                print(" ", line)
            return 1
        print(f"OK — {len(urls)} external URLs responded.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
