import re
import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def normalize(parts: list[str]) -> str:
    text = " ".join(" ".join(parts).split())
    return re.sub(r"\s+([.,;:!?])", r"\1", text)


class HomepageIdentityParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.instrument_depth: int | None = None
        self.group_stack: list[tuple[int, set[str]]] = []
        self.view_box = ""
        self.grid_paths: list[str] = []
        self.band_path = ""
        self.search_path = ""
        self.social_path = ""
        self.bound_rect: dict[str, str] = {}
        self.bound_paths: list[str] = []
        self.points: dict[str, dict[str, str]] = {}
        self.axis_labels: list[str] = []
        self.legend_labels: list[str] = []
        self.readout_text: list[str] = []
        self.readout_hooks: list[tuple[str, str]] = []
        self.header_signals: list[str] = []
        self.instrument_signals: list[str] = []
        self.locators = 0
        self.primary_cta_parts: list[str] = []
        self._header_rail_depth: int | None = None
        self._legend_depth: int | None = None
        self._readout_depth: int | None = None
        self._collect_axis_depth: int | None = None
        self._collect_axis: list[str] = []
        self._collect_legend_depth: int | None = None
        self._collect_legend: list[str] = []
        self._collect_readout_depth: int | None = None
        self._collect_readout: list[str] = []
        self._primary_cta_depth: int | None = None

    def current_group_classes(self) -> set[str]:
        if not self.group_stack:
            return set()
        return self.group_stack[-1][1]

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        self.depth += 1
        attributes = dict(attrs)
        classes = set((attributes.get("class") or "").split())

        if tag == "figure" and "data-decision-instrument" in attributes:
            self.instrument_depth = self.depth

        if "header-signal-rail" in classes:
            self._header_rail_depth = self.depth
            self.header_signals = []
        elif self._header_rail_depth is not None:
            signal = attributes.get("data-signal")
            if signal:
                self.header_signals.append(signal)

        if self.instrument_depth is not None:
            if "instrument-locator" in classes:
                self.locators += 1
            signal = attributes.get("data-signal")
            if signal:
                self.instrument_signals.append(signal)

            if tag == "svg":
                self.view_box = attributes.get("viewbox") or ""
            if tag == "g":
                self.group_stack.append((self.depth, classes))
            if tag == "path":
                path = attributes.get("d") or ""
                groups = self.current_group_classes()
                if "instrument-grid" in groups:
                    self.grid_paths.append(path)
                elif "instrument-bound" in groups:
                    self.bound_paths.append(path)
                elif "instrument-band" in classes:
                    self.band_path = path
                elif "instrument-curve-search" in classes:
                    self.search_path = path
                elif "instrument-curve-social" in classes:
                    self.social_path = path
            if tag == "rect" and "instrument-bound" in self.current_group_classes():
                self.bound_rect = {
                    name: attributes.get(name) or ""
                    for name in ("x", "y", "width", "height", "rx")
                }
            if tag == "circle" and "instrument-points" in self.current_group_classes():
                point_class = next(
                    class_name
                    for class_name in classes
                    if class_name.startswith("instrument-point-")
                )
                self.points[point_class] = {
                    name: attributes.get(name) or "" for name in ("cx", "cy", "r")
                }
            if tag == "text" and "instrument-axis-labels" in self.current_group_classes():
                self._collect_axis_depth = self.depth
                self._collect_axis = []
            if "instrument-legend" in classes:
                self._legend_depth = self.depth
            elif tag == "span" and self._legend_depth is not None:
                self._collect_legend_depth = self.depth
                self._collect_legend = []
            if "instrument-readout" in classes:
                self._readout_depth = self.depth
            elif tag == "div" and self._readout_depth is not None:
                if attributes.get("data-instrument-focus"):
                    self.readout_hooks.append(
                        (
                            attributes["data-instrument-focus"] or "",
                            attributes.get("tabindex") or "",
                        )
                    )
                self._collect_readout_depth = self.depth
                self._collect_readout = []

        if (
            tag == "a"
            and attributes.get("href") == "/analytics/"
            and "btn" in classes
        ):
            self._primary_cta_depth = self.depth
        elif self._primary_cta_depth is not None and tag == "span":
            if "hero-cta-label" in classes:
                self.primary_cta_parts.append("label")
            if (
                "hero-cta-arrow" in classes
                and attributes.get("aria-hidden") == "true"
            ):
                self.primary_cta_parts.append("arrow")

    def handle_data(self, data: str) -> None:
        if self._collect_axis_depth is not None:
            self._collect_axis.append(data)
        if self._collect_legend_depth is not None:
            self._collect_legend.append(data)
        if self._collect_readout_depth is not None:
            self._collect_readout.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "text" and self._collect_axis_depth == self.depth:
            self.axis_labels.append(normalize(self._collect_axis))
            self._collect_axis_depth = None
            self._collect_axis = []
        if tag == "span" and self._collect_legend_depth == self.depth:
            self.legend_labels.append(normalize(self._collect_legend))
            self._collect_legend_depth = None
            self._collect_legend = []
        if tag == "div" and self._collect_readout_depth == self.depth:
            self.readout_text.append(normalize(self._collect_readout))
            self._collect_readout_depth = None
            self._collect_readout = []
        if tag == "a" and self._primary_cta_depth == self.depth:
            self._primary_cta_depth = None
        if self._legend_depth == self.depth:
            self._legend_depth = None
        if self._readout_depth == self.depth:
            self._readout_depth = None
        if self._header_rail_depth == self.depth:
            self._header_rail_depth = None
        if tag == "g" and self.group_stack and self.group_stack[-1][0] == self.depth:
            self.group_stack.pop()
        if tag == "figure" and self.instrument_depth == self.depth:
            self.instrument_depth = None
        self.depth -= 1


def parse_homepage() -> HomepageIdentityParser:
    parser = HomepageIdentityParser()
    parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    return parser


class HomepageIdentityTests(unittest.TestCase):
    def test_decision_graph_geometry_and_evidence_remain_unchanged(self) -> None:
        parser = parse_homepage()

        self.assertEqual("0 0 540 240", parser.view_box)
        self.assertEqual(
            [
                "M54 24V198M148 24V198M242 24V198M336 24V198M430 24V198",
                "M54 48H500M54 98H500M54 148H500M54 198H500",
            ],
            parser.grid_paths,
        )
        self.assertEqual(
            "M54 188C132 173 193 133 250 93C310 51 377 36 500 28"
            "L500 66C390 70 327 81 270 118C211 157 145 191 54 204Z",
            parser.band_path,
        )
        self.assertEqual(
            "M54 194C130 180 190 138 250 94C315 46 385 31 500 28",
            parser.search_path,
        )
        self.assertEqual(
            "M54 199C135 190 203 165 266 132C337 95 405 83 500 79",
            parser.social_path,
        )
        self.assertEqual(
            {"x": "299", "y": "24", "width": "42", "height": "174", "rx": "2"},
            parser.bound_rect,
        )
        self.assertEqual(["M320 24V198", "M307 41L320 28L333 41"], parser.bound_paths)
        self.assertEqual(
            {
                "instrument-point-search": {"cx": "320", "cy": "53", "r": "5"},
                "instrument-point-social": {"cx": "320", "cy": "107", "r": "5"},
            },
            parser.points,
        )
        self.assertEqual(
            ["CURRENT SPEND", "ADDITIONAL SPEND →", "≤10% TEST BOUND"],
            parser.axis_labels,
        )
        self.assertEqual(
            ["Paid search", "Paid social", "Uncertainty range"],
            parser.legend_labels,
        )
        self.assertEqual(
            [
                "01 Observation Paid search converted more efficiently across "
                "the available four-week history.",
                "02 Bounded move Shift up to 10% of paid social allocation to "
                "paid search.",
                "03 Recheck Review after 30 days. Stop if acquisition cost rises "
                "or conversion quality falls.",
            ],
            parser.readout_text,
        )

    def test_homepage_exposes_concept_rails_split_cta_and_focusable_readouts(
        self,
    ) -> None:
        parser = parse_homepage()

        self.assertEqual(["evidence", "bound", "recheck"], parser.header_signals)
        self.assertEqual(
            ["evidence", "bound", "recheck"], parser.instrument_signals
        )
        self.assertEqual(4, parser.locators)
        self.assertEqual(["label", "arrow"], parser.primary_cta_parts)
        self.assertEqual(
            [
                ("observation", "0"),
                ("bound", "0"),
                ("recheck", "0"),
            ],
            parser.readout_hooks,
        )


if __name__ == "__main__":
    unittest.main()
