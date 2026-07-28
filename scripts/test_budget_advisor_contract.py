from __future__ import annotations

import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class BudgetAdvisorContractTests(unittest.TestCase):
    def test_synthesized_channel_data_meets_validator_minimum(self) -> None:
        app_js = (ROOT / "analytics/budget/app.js").read_text(encoding="utf-8")
        response_curve_js = (ROOT / "shared/response-curve.js").read_text(
            encoding="utf-8"
        )

        min_match = re.search(r"minMonths < (\d+)", response_curve_js)
        self.assertIsNotNone(min_match)
        validator_minimum = int(min_match.group(1))

        read_channels_body = app_js.split("function readChannels()", 1)[1].split(
            "/** Format currency */",
            1,
        )[0]
        synthesized_points = read_channels_body.count("dataPoints.push")

        self.assertGreaterEqual(synthesized_points, validator_minimum)
        self.assertNotIn("spend > 50", read_channels_body)
        self.assertNotIn("spend > 100", read_channels_body)
