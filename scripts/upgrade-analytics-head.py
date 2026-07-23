#!/usr/bin/env python3
"""
Upgrade the <head> of the two analytics tool pages:
- Add Google Analytics tag (was missing!)
- Add JSON-LD WebApplication schema
- Add OG image with width/height/alt
- Add theme-color
- Add Twitter image

Run from repo root: python3 scripts/upgrade-analytics-head.py
"""
import re
from pathlib import Path

REPO = Path("/Users/kylelawlor/.minimax/workspace/mangrove-tools")

# (file_relpath, name, url_path, description, og_alt, jsonld_desc)
TOOLS = [
    (
        "analytics/budget/index.html",
        "Budget Advisor",
        "analytics/budget/",
        "Free marketing budget optimizer. Estimate marginal ROI per channel and get recommended budget allocation.",
        "Budget Advisor — marketing budget optimizer with marginality analysis",
        "Free marketing budget optimizer with marginal ROI and recommended allocation across channels.",
    ),
    (
        "analytics/forecast/index.html",
        "Revenue Forecaster",
        "analytics/forecast/",
        "Free revenue forecaster. Detect trends and seasonal patterns, project future outcomes with uncertainty ranges, and test scenarios before committing to a plan.",
        "Revenue Forecaster — trend, seasonality, and scenario projections",
        "Free revenue forecaster. Detects trends and seasonal patterns and projects future outcomes with confidence bands.",
    ),
]

GA_TAG = """    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-E20401V5WB"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-E20401V5WB');
    </script>
"""

OG_OG_URL = "https://mangrovetools.com/og-analytics.png"

def jsonld(name, url, desc):
    return f"""    <script type="application/ld+json">
      {{
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "{name}",
        "url": "https://mangrovetools.com/{url}",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Any",
        "browserRequirements": "Requires JavaScript",
        "isAccessibleForFree": true,
        "offers": {{
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        }},
        "description": "{desc}",
        "isPartOf": {{
          "@type": "WebSite",
          "name": "Mangrove Tools",
          "url": "https://mangrovetools.com/"
        }}
      }}
    </script>
"""

def build_new_head(name, url, desc, og_alt, jsonld_desc):
    """Build the replacement <head>...</head> block."""
    return f"""  <head>
{GA_TAG}    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{name} | Mangrove Tools</title>
    <meta name="description" content="{desc}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="theme-color" content="#0c0c0c" />
    <link rel="canonical" href="https://mangrovetools.com/{url}" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/favicon.svg" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Mangrove Tools" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:title" content="{name} | Mangrove Tools" />
    <meta property="og:description" content="{desc}" />
    <meta property="og:url" content="https://mangrovetools.com/{url}" />
    <meta property="og:image" content="{OG_OG_URL}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="{og_alt}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{name} | Mangrove Tools" />
    <meta name="twitter:description" content="{desc}" />
    <meta name="twitter:image" content="{OG_OG_URL}" />
    <link rel="stylesheet" href="/fonts.css" />
    <link rel="stylesheet" href="/site.css" />
    <link rel="stylesheet" href="/tool-shell.css" />
{jsonld(name, url, jsonld_desc)}  </head>"""

HEAD_RE = re.compile(r"<head>.*?</head>", re.DOTALL)

def patch(rel, name, url, desc, og_alt, jsonld_desc):
    p = REPO / rel
    text = p.read_text(encoding="utf-8")
    new_head = build_new_head(name, url, desc, og_alt, jsonld_desc)
    new_text, n = HEAD_RE.subn(new_head, text, count=1)
    if n != 1:
        print(f"  ! {rel}: head not matched — SKIPPED")
        return False
    if new_text == text:
        return False
    p.write_text(new_text, encoding="utf-8")
    print(f"  ✓ {rel}: head upgraded (GA, JSON-LD, OG image, theme-color)")
    return True

def main():
    print("Upgrading analytics tool page <head>s...")
    changed = 0
    for rel, name, url, desc, og_alt, jsonld_desc in TOOLS:
        if patch(rel, name, url, desc, og_alt, jsonld_desc):
            changed += 1
    print(f"\n{changed} files updated.")

if __name__ == "__main__":
    main()
