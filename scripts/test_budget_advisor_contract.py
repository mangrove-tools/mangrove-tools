import re
import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FINGERPRINTED_LOCAL_SCRIPT = re.compile(
    r"(?P<stem>/.*)\.[0-9a-f]{12}\.js"
)
FINGERPRINTED_LOCAL_STYLESHEET = re.compile(
    r"(?P<stem>/.*)\.[0-9a-f]{12}\.css"
)
REQUIRED_IDS = (
    "decision-canvas",
    "history-file",
    "paste-history-toggle",
    "paste-history-panel",
    "history-paste",
    "parse-pasted-history",
    "use-sample-data",
    "import-status",
    "correction-panel",
    "column-mapping",
    "financial-treatment",
    "replacement-warning",
    "confirm-replacement",
    "cancel-replacement",
    "download-correction-guide",
    "readiness-panel",
    "readiness-summary",
    "readiness-channels",
    "plan-form",
    "total-budget",
    "plan-days",
    "objective",
    "advanced-constraints",
    "constraints-list",
    "results",
    "model-inspector",
    "cleaned-history-table",
    "download-cleaned-data",
    "download-allocation",
)


class BudgetPageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.elements: dict[str, dict[str, object]] = {}
        self.labels_for: set[str] = set()
        self.controls: list[dict[str, object]] = []
        self.scripts: list[str] = []
        self.stylesheets: list[str] = []
        self.order: list[str] = []
        self._button_stack: list[dict[str, object]] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        attributes = dict(attrs)
        element_id = attributes.get("id")
        if element_id:
            self.elements[element_id] = {"tag": tag, "attrs": attributes}
            self.order.append(element_id)
        if tag == "label" and attributes.get("for"):
            self.labels_for.add(attributes["for"] or "")
        if tag in {"input", "select", "textarea", "button"}:
            control = {"tag": tag, "attrs": attributes, "text": ""}
            self.controls.append(control)
            if tag == "button":
                self._button_stack.append(control)
        if tag == "script" and attributes.get("src"):
            self.scripts.append(attributes["src"] or "")
        if (
            tag == "link"
            and attributes.get("rel") == "stylesheet"
            and attributes.get("href")
        ):
            self.stylesheets.append(attributes["href"] or "")

    def handle_data(self, data: str) -> None:
        if self._button_stack:
            self._button_stack[-1]["text"] = (
                str(self._button_stack[-1]["text"]) + data
            )

    def handle_endtag(self, tag: str) -> None:
        if tag == "button" and self._button_stack:
            self._button_stack.pop()


def parse_budget_page() -> BudgetPageParser:
    parser = BudgetPageParser()
    parser.feed(
        (ROOT / "analytics/budget/index.html").read_text(encoding="utf-8")
    )
    return parser


class BudgetAdvisorContractTests(unittest.TestCase):
    def test_progressive_decision_canvas_has_required_regions_and_controls(
        self,
    ) -> None:
        parser = parse_budget_page()

        for element_id in REQUIRED_IDS:
            with self.subTest(element_id=element_id):
                self.assertIn(element_id, parser.elements)

        self.assertEqual(parser.elements["readiness-channels"]["tag"], "table")
        self.assertEqual(parser.elements["plan-form"]["tag"], "form")
        self.assertEqual(parser.elements["advanced-constraints"]["tag"], "details")

        for region_id in (
            "paste-history-panel",
            "correction-panel",
            "financial-treatment",
            "replacement-warning",
            "readiness-panel",
            "plan-form",
            "results",
            "model-inspector",
        ):
            with self.subTest(hidden_region=region_id):
                self.assertIn(
                    "hidden",
                    parser.elements[region_id]["attrs"],
                )

    def test_import_controls_are_accessible_and_sample_precedes_planning(
        self,
    ) -> None:
        parser = parse_budget_page()
        history_file = parser.elements["history-file"]["attrs"]

        self.assertEqual(history_file.get("type"), "file")
        self.assertEqual(
            history_file.get("accept"),
            ".csv,.tsv,text/csv,text/tab-separated-values",
        )
        self.assertLess(
            parser.order.index("use-sample-data"),
            parser.order.index("plan-form"),
        )

        for control in parser.controls:
            attributes = control["attrs"]
            control_id = attributes.get("id")
            if attributes.get("type") == "hidden":
                continue
            has_name = (
                bool(attributes.get("aria-label"))
                or bool(attributes.get("aria-labelledby"))
                or bool(control_id and control_id in parser.labels_for)
                or (
                    control["tag"] == "button"
                    and bool(str(control["text"]).strip())
                )
            )
            with self.subTest(control_id=control_id, tag=control["tag"]):
                self.assertTrue(has_name)

        for status_id in ("import-status", "results"):
            attributes = parser.elements[status_id]["attrs"]
            self.assertEqual(attributes.get("role"), "status")
            self.assertEqual(attributes.get("aria-live"), "polite")

    def test_hidden_financial_treatment_overrides_its_authored_grid_layout(
        self,
    ) -> None:
        styles = (
            ROOT / "analytics/budget/styles.css"
        ).read_text(encoding="utf-8")

        self.assertRegex(
            styles,
            re.compile(
                r"\.budget-workspace\s+"
                r"\.financial-treatment\[hidden\]\s*\{\s*"
                r"display:\s*none(?:\s*!important)?\s*;"
            ),
        )

    def test_page_loads_decision_canvas_dependencies_in_contract_order(
        self,
    ) -> None:
        parser = parse_budget_page()
        local_scripts = [
            script for script in parser.scripts if script.startswith("/")
        ]
        canonical_scripts = []
        for script in local_scripts:
            match = FINGERPRINTED_LOCAL_SCRIPT.fullmatch(script)
            with self.subTest(script=script):
                self.assertIsNotNone(match)
            if match:
                canonical_scripts.append(f"{match.group('stem')}.js")

        self.assertEqual(
            canonical_scripts,
            [
                "/shared/history-data.js",
                "/shared/marginality-engine.js",
                "/shared/budget-allocator.js",
                "/shared/charts.js",
                "/shared/tool-extras.js",
                "/shared/budget-sample-data.js",
                "/shared/motion.js",
                "/analytics/budget/app.js",
            ],
        )
        canonical_stylesheets = []
        for stylesheet in parser.stylesheets:
            match = FINGERPRINTED_LOCAL_STYLESHEET.fullmatch(stylesheet)
            with self.subTest(stylesheet=stylesheet):
                self.assertIsNotNone(match)
            if match:
                canonical_stylesheets.append(f"{match.group('stem')}.css")
        self.assertIn(
            "/analytics/budget/styles.css",
            canonical_stylesheets,
        )

    def test_app_does_not_restore_manual_assumption_curves(self) -> None:
        app_js = (ROOT / "analytics/budget/app.js").read_text(encoding="utf-8")

        self.assertNotIn("MangroveResponseCurve", app_js)
        self.assertNotIn("Assumption-driven", app_js)
        self.assertNotIn("spend * 0.6", app_js)
        self.assertNotIn("minimum three-point shape", app_js)

    def test_app_has_no_direct_network_storage_or_console_sinks(self) -> None:
        app_js = (ROOT / "analytics/budget/app.js").read_text(encoding="utf-8")

        for forbidden in (
            "fetch(",
            "XMLHttpRequest",
            "sendBeacon",
            "localStorage",
            "sessionStorage",
            "console.log",
            "console.error",
        ):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, app_js)

if __name__ == "__main__":
    unittest.main()
