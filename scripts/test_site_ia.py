from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import unittest
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXPECTED_NAV = [
    ("/", "Home"),
    ("/analytics/", "Analytics"),
    ("/calculators/", "Calculators"),
    ("/method/", "Method"),
    ("/about/", "About"),
]
LEGACY_CALCULATOR_ROUTES = [
    "/letterroi/",
    "/sponsorquote/",
    "/subtarget/",
    "/mediakit/",
    "/inventory/",
]
PUBLIC_HTML_PAGES = [
    "index.html",
    "analytics/index.html",
    "analytics/budget/index.html",
    "analytics/forecast/index.html",
    "calculators/index.html",
    "method/index.html",
    "letterroi/index.html",
    "sponsorquote/index.html",
    "subtarget/index.html",
    "mediakit/index.html",
    "inventory/index.html",
    "about/index.html",
    "faq/index.html",
    "privacy/index.html",
    "contact/index.html",
    "404.html",
]
EXPECTED_CURRENT_NAV = {
    "index.html": ("/", "page"),
    "analytics/index.html": ("/analytics/", "page"),
    "analytics/budget/index.html": ("/analytics/", "page"),
    "analytics/forecast/index.html": ("/analytics/", "page"),
    "calculators/index.html": ("/calculators/", "page"),
    "method/index.html": ("/method/", "page"),
    "letterroi/index.html": ("/calculators/", "page"),
    "sponsorquote/index.html": ("/calculators/", "page"),
    "subtarget/index.html": ("/calculators/", "page"),
    "mediakit/index.html": ("/calculators/", "page"),
    "inventory/index.html": ("/calculators/", "page"),
    "about/index.html": ("/about/", "page"),
    "faq/index.html": ("/about/", "page"),
    "privacy/index.html": ("/about/", "page"),
    "contact/index.html": ("/about/", "page"),
    "404.html": None,
}


@dataclass
class LinkContext:
    href: str
    in_nav: bool
    is_hero_button: bool
    aria_current: str
    text: list[str] = field(default_factory=list)


class SiteParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.nav_links: list[tuple[str, str]] = []
        self.current_nav_links: list[tuple[str, str]] = []
        self.links: list[tuple[str, str]] = []
        self.ids: set[str] = set()
        self.hero_buttons: list[tuple[str, str]] = []
        self._nav_depth: int | None = None
        self._hero_depth: int | None = None
        self._depth = 0
        self._link_context: list[LinkContext] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {key: value or "" for key, value in attrs}
        if attr_map.get("id"):
            self.ids.add(attr_map["id"])
        classes = set(attr_map.get("class", "").split())
        if tag == "nav" and "site-nav" in classes:
            self._nav_depth = self._depth
        if "hero-feature" in classes:
            self._hero_depth = self._depth
        if tag == "a":
            href = attr_map.get("href", "")
            in_nav = self._nav_depth is not None
            is_hero_button = self._hero_depth is not None and "btn" in classes
            aria_current = attr_map.get("aria-current", "")
            self._link_context.append(
                LinkContext(href, in_nav, is_hero_button, aria_current)
            )
        self._depth += 1

    def handle_data(self, data: str) -> None:
        if self._link_context:
            self._link_context[-1].text.append(data)

    def handle_endtag(self, tag: str) -> None:
        self._depth -= 1
        if tag == "a" and self._link_context:
            context = self._link_context.pop()
            text = "".join(context.text).strip()
            self.links.append((context.href, text))
            if context.in_nav:
                self.nav_links.append((context.href, text))
                if context.aria_current:
                    self.current_nav_links.append(
                        (context.href, context.aria_current)
                    )
            if context.is_hero_button:
                self.hero_buttons.append((context.href, text))
        if tag == "nav" and self._nav_depth == self._depth:
            self._nav_depth = None
        if self._hero_depth == self._depth:
            self._hero_depth = None


def parse_html(path: Path) -> SiteParser:
    parser = SiteParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


class SiteInformationArchitectureTests(unittest.TestCase):
    def _make_updater_fixture(self, temporary_directory: str) -> Path:
        fixture = Path(temporary_directory)
        (fixture / "scripts").mkdir()
        shutil.copy2(ROOT / "scripts/apply-nav-footer.py", fixture / "scripts")
        for relative_path in PUBLIC_HTML_PAGES:
            page = fixture / relative_path
            page.parent.mkdir(parents=True, exist_ok=True)
            page.write_text(
                '<nav class="site-nav" aria-label="Primary">\n'
                '  <a href="/analytics/">Analytics</a>\n'
                '  <a href="/#calculators">Calculators</a>\n'
                '  <a href="/about/">About</a>\n'
                '</nav>\n'
                '<footer class="foot">\n    </footer>\n',
                encoding="utf-8",
            )
        return fixture

    def _run_updater(self, fixture: Path) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, "scripts/apply-nav-footer.py"],
            cwd=fixture,
            check=False,
            capture_output=True,
            text=True,
        )

    def test_new_public_routes_exist(self) -> None:
        for route in ("calculators/index.html", "method/index.html"):
            with self.subTest(route=route):
                self.assertTrue((ROOT / route).is_file())

    def test_legacy_calculator_routes_remain(self) -> None:
        for route in LEGACY_CALCULATOR_ROUTES:
            with self.subTest(route=route):
                self.assertTrue((ROOT / route.strip("/") / "index.html").is_file())

    def test_every_public_page_uses_the_ordered_primary_navigation(self) -> None:
        for relative_path in PUBLIC_HTML_PAGES:
            with self.subTest(page=relative_path):
                path = ROOT / relative_path
                self.assertTrue(path.is_file(), f"Missing public page: {relative_path}")
                self.assertEqual(EXPECTED_NAV, parse_html(path).nav_links)

    def test_every_public_page_marks_exactly_one_route_family_current(self) -> None:
        for relative_path, expected_current in EXPECTED_CURRENT_NAV.items():
            with self.subTest(page=relative_path):
                actual_current = parse_html(
                    ROOT / relative_path
                ).current_nav_links
                expected_links = (
                    [] if expected_current is None else [expected_current]
                )
                self.assertEqual(expected_links, actual_current)

    def test_homepage_hero_has_only_the_analytics_primary_action(self) -> None:
        hero_buttons = parse_html(ROOT / "index.html").hero_buttons

        self.assertEqual([("/analytics/", "Explore Analytics")], hero_buttons)

    def test_homepage_keeps_the_calculators_section_anchor(self) -> None:
        self.assertIn("calculators", parse_html(ROOT / "index.html").ids)

    def test_calculators_page_links_to_every_legacy_calculator(self) -> None:
        path = ROOT / "calculators/index.html"
        self.assertTrue(path.is_file(), "Missing public page: calculators/index.html")
        links = {href for href, _ in parse_html(path).links}

        self.assertTrue(set(LEGACY_CALCULATOR_ROUTES).issubset(links))

    def test_method_page_links_to_the_core_trust_routes(self) -> None:
        path = ROOT / "method/index.html"
        self.assertTrue(path.is_file(), "Missing public page: method/index.html")
        links = {href for href, _ in parse_html(path).links}

        self.assertTrue({"/", "/analytics/", "/about/", "/privacy/"}.issubset(links))

    def test_navigation_script_generates_the_primary_navigation_contract(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            fixture = self._make_updater_fixture(temporary_directory)

            result = self._run_updater(fixture)

            self.assertEqual(0, result.returncode, result.stdout + result.stderr)
            for relative_path in PUBLIC_HTML_PAGES:
                with self.subTest(page=relative_path):
                    self.assertEqual(
                        EXPECTED_NAV,
                        parse_html(fixture / relative_path).nav_links,
                    )
                    expected_current = EXPECTED_CURRENT_NAV[relative_path]
                    expected_links = (
                        [] if expected_current is None else [expected_current]
                    )
                    self.assertEqual(
                        expected_links,
                        parse_html(fixture / relative_path).current_nav_links,
                    )

    def test_navigation_script_exits_nonzero_when_page_is_missing(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            fixture = self._make_updater_fixture(temporary_directory)
            (fixture / "method/index.html").unlink()

            result = self._run_updater(fixture)

            self.assertEqual(1, result.returncode)
            self.assertIn("method/index.html: file not found", result.stdout)

    def test_navigation_script_exits_nonzero_on_replacement_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            fixture = self._make_updater_fixture(temporary_directory)
            (fixture / "about/index.html").write_text(
                '<nav class="site-nav" aria-label="Primary">\n'
                '  <a href="/analytics/">Analytics</a>\n'
                '  <a href="/#calculators">Calculators</a>\n'
                '  <a href="/about/">About</a>\n'
                '</nav>\n',
                encoding="utf-8",
            )

            result = self._run_updater(fixture)

            self.assertEqual(1, result.returncode)
            self.assertIn(
                "about/index.html: nav=1 footer=0",
                result.stdout,
            )

    def test_navigation_script_reports_all_failures_before_exiting(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            fixture = self._make_updater_fixture(temporary_directory)
            (fixture / "method/index.html").unlink()
            (fixture / "about/index.html").write_text(
                '<footer class="foot">\n    </footer>\n',
                encoding="utf-8",
            )

            result = self._run_updater(fixture)

            self.assertEqual(1, result.returncode)
            self.assertIn("method/index.html: file not found", result.stdout)
            self.assertIn(
                "about/index.html: nav=0 footer=1",
                result.stdout,
            )


if __name__ == "__main__":
    unittest.main()
