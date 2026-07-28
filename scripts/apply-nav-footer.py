#!/usr/bin/env python3
"""
Apply analytics-first nav + footer to all HTML pages.
Run from repo root: python3 scripts/apply-nav-footer.py
"""
import re
import sys
from enum import Enum, auto
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


class PatchResult(Enum):
    CHANGED = auto()
    UNCHANGED = auto()
    FAILED = auto()


# Pages and their nav aria-current state
# (file_relpath, current_section)
PAGES = [
    ("index.html", "home"),
    ("analytics/index.html", "analytics"),
    ("analytics/budget/index.html", "analytics"),
    ("analytics/forecast/index.html", "analytics"),
    ("calculators/index.html", "calculators"),
    ("letterroi/index.html", "calculators"),
    ("sponsorquote/index.html", "calculators"),
    ("subtarget/index.html", "calculators"),
    ("mediakit/index.html", "calculators"),
    ("inventory/index.html", "calculators"),
    ("method/index.html", "method"),
    ("about/index.html", "about"),
    ("faq/index.html", "about"),
    ("privacy/index.html", "about"),
    ("contact/index.html", "about"),
    ("404.html", None),  # no aria-current
]

# Common nav block
def nav_block(current):
    links = [
        ("/", "Home", "home"),
        ("/analytics/", "Analytics", "analytics"),
        ("/calculators/", "Calculators", "calculators"),
        ("/method/", "Method", "method"),
        ("/about/", "About", "about"),
    ]
    rendered_links = []
    for href, label, section in links:
        aria_current = ' aria-current="page"' if current == section else ""
        rendered_links.append(
            f'        <a href="{href}"{aria_current}>{label}</a>'
        )
    return (
        '<nav class="site-nav" aria-label="Primary">\n'
        + "\n".join(rendered_links)
        + "\n"
        '      </nav>'
    )

# Common footer block (replacement)
def footer_block(class_attr='class="foot"'):
    return (
        f'<footer {class_attr}>\n'
        '      <div class="foot-grid">\n'
        '        <div>\n'
        '          <p class="foot-brand">Mangrove Tools</p>\n'
        '          <p class="foot-note">\n'
        '            Free client-side marketing analytics for small businesses,\n'
        '            with supporting newsletter calculators from Naples, Florida.\n'
        '          </p>\n'
        '        </div>\n'
        '        <div class="foot-col">\n'
        '          <h2>Analytics</h2>\n'
        '          <ul>\n'
        '            <li><a href="/analytics/budget/">Budget Advisor</a></li>\n'
        '            <li><a href="/analytics/forecast/">Revenue Forecaster</a></li>\n'
        '            <li><a href="/analytics/">All Analytics</a></li>\n'
        '          </ul>\n'
        '        </div>\n'
        '        <div class="foot-col">\n'
        '          <h2><a href="/calculators/">Calculators</a></h2>\n'
        '          <ul>\n'
        '            <li><a href="/letterroi/">LetterROI</a></li>\n'
        '            <li><a href="/sponsorquote/">SponsorQuote</a></li>\n'
        '            <li><a href="/subtarget/">SubTarget</a></li>\n'
        '            <li><a href="/mediakit/">Media Kit</a></li>\n'
        '            <li><a href="/inventory/">Inventory Planner</a></li>\n'
        '          </ul>\n'
        '        </div>\n'
        '        <div class="foot-col">\n'
        '          <h2>Site</h2>\n'
        '          <ul>\n'
        '            <li><a href="/method/">Method</a></li>\n'
        '            <li><a href="/about/">About</a></li>\n'
        '            <li><a href="/faq/">FAQ</a></li>\n'
        '            <li><a href="/privacy/">Privacy</a></li>\n'
        '            <li><a href="/contact/">Contact</a></li>\n'
        '            <li><a href="/llms.txt">llms.txt</a></li>\n'
        '          </ul>\n'
        '        </div>\n'
        '      </div>\n'
        '    </footer>'
    )

# Match the existing nav block. Permissive on current.
NAV_RE = re.compile(
    r'<nav class="site-nav" aria-label="Primary">\s*'
    r'(?:<a href="[^"]*"(?: aria-current="page")?>[^<]+</a>\s*)+'
    r'</nav>',
    re.MULTILINE,
)

# Match the existing footer block (from <footer class="foot"> to </footer>)
# Permissive on inner content.
FOOTER_RE = re.compile(
    r'<footer (?P<class>class="foot(?: [^"]+)?")>.*?^    </footer>',
    re.DOTALL | re.MULTILINE,
)

def patch(rel, current):
    p = REPO / rel
    if not p.is_file():
        print(f"  ! {rel}: file not found — SKIPPED")
        return PatchResult.FAILED
    text = p.read_text(encoding="utf-8")
    original = text
    new_nav = nav_block(current)
    text, n1 = NAV_RE.subn(new_nav, text, count=1)
    footer_match = FOOTER_RE.search(text)
    if footer_match:
        new_footer = footer_block(footer_match.group("class"))
        text, n2 = FOOTER_RE.subn(new_footer, text, count=1)
    else:
        n2 = 0
    if n1 != 1 or n2 != 1:
        print(f"  ! {rel}: nav={n1} footer={n2} (expected 1 each) — SKIPPED")
        return PatchResult.FAILED
    if text == original:
        return PatchResult.UNCHANGED
    p.write_text(text, encoding="utf-8")
    print(f"  ✓ {rel}: nav + footer updated")
    return PatchResult.CHANGED

def main():
    print("Applying analytics-first nav + footer to all pages...")
    changed = 0
    failures = 0
    for rel, current in PAGES:
        result = patch(rel, current)
        if result is PatchResult.CHANGED:
            changed += 1
        elif result is PatchResult.FAILED:
            failures += 1
    print(f"\n{changed} files updated.")
    if failures:
        print(f"{failures} files failed.")
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
