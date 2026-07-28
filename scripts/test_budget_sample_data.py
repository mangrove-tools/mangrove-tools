import json
import subprocess
import textwrap
import unittest
from html.parser import HTMLParser
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


class ButtonParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.buttons = []
        self._current = None

    def handle_starttag(self, tag, attrs):
        if tag != "button":
            return
        self._current = {"attrs": dict(attrs), "text": []}

    def handle_data(self, data):
        if self._current is not None:
            self._current["text"].append(data)

    def handle_endtag(self, tag):
        if tag == "button" and self._current is not None:
            self.buttons.append(self._current)
            self._current = None


class BudgetSampleDataTest(unittest.TestCase):
    def test_budget_advisor_has_accessible_sample_data_button(self):
        parser = ButtonParser()
        parser.feed((REPO_ROOT / "analytics/budget/index.html").read_text())

        sample_buttons = [
            button
            for button in parser.buttons
            if button["attrs"].get("id") == "use-sample-data"
        ]

        self.assertEqual(len(sample_buttons), 1)
        button = sample_buttons[0]
        self.assertEqual(button["attrs"].get("type"), "button")
        self.assertIn("Use sample data", " ".join(button["text"]))
        self.assertIn("small-business", button["attrs"].get("aria-describedby", ""))

    def test_sample_data_produces_complete_partially_modelable_allocation(self):
        script = textwrap.dedent(
            """
            const fs = require('fs');
            const vm = require('vm');

            const sandbox = { window: {}, console };
            vm.createContext(sandbox);
            vm.runInContext(fs.readFileSync('shared/history-data.js', 'utf8'), sandbox);
            vm.runInContext(fs.readFileSync('shared/marginality-engine.js', 'utf8'), sandbox);
            vm.runInContext(fs.readFileSync('shared/budget-allocator.js', 'utf8'), sandbox);
            vm.runInContext(fs.readFileSync('shared/budget-sample-data.js', 'utf8'), sandbox);

            const sample = sandbox.window.MangroveBudgetSampleData;
            const history = sandbox.window.MangroveHistoryData.inspectHistory(
              sample.text,
              { now: new Date('2026-07-28T12:00:00Z') }
            );
            const analysis = sandbox.window.MangroveMarginality.analyzeHistory(history);
            const model = analysis.models[analysis.recommendedObjective];
            const modelChannels = model && Array.isArray(model.channels) ? model.channels : [];
            const plan = sandbox.window.MangroveBudgetAllocator.allocatePlan({
              model,
              totalBudget: sample.totalBudget,
              planDays: sample.planDays,
              constraints: {}
            });
            const finitePlan = plan.ok
              && Number.isFinite(plan.totals.allocatedBudget)
              && Number.isFinite(plan.totals.optimizedBudget)
              && Number.isFinite(plan.totals.preservedBudget)
              && plan.allocation.every((row) => Number.isFinite(row.recommendedSpend)
                && (row.predictedOutcome === null || Number.isFinite(row.predictedOutcome))
                && (row.marginalMetric === null || Number.isFinite(row.marginalMetric.value)));

            process.stdout.write(JSON.stringify({
              historyOk: history.ok,
              completePeriods: history.summary.completePeriods,
              channels: history.summary.channels,
              modelableChannels: modelChannels.filter((channel) => channel.status === 'modelable').length,
              preservedChannels: modelChannels.filter((channel) => channel.status === 'preserved').length,
              allocatedTotal: plan.ok ? plan.totals.allocatedBudget : null,
              finitePlan,
              hasAssumptionCurve: modelChannels.some((channel) => channel.curve && channel.curve.assumption === true),
            }));
            """
        )
        completed = subprocess.run(
            ["node", "-e", script],
            cwd=REPO_ROOT,
            check=True,
            text=True,
            capture_output=True,
        )
        actual = json.loads(completed.stdout)

        self.assertTrue(actual["historyOk"])
        self.assertEqual(actual["completePeriods"], 16)
        self.assertEqual(actual["channels"], 4)
        self.assertEqual(actual["modelableChannels"], 3)
        self.assertEqual(actual["preservedChannels"], 1)
        self.assertEqual(actual["allocatedTotal"], 72000)
        self.assertTrue(actual["finitePlan"])
        self.assertFalse(actual["hasAssumptionCurve"])

    def test_manual_entry_is_an_explicit_assumption_not_fake_history(self):
        app_source = (REPO_ROOT / "analytics/budget/app.js").read_text()

        self.assertIn("createAssumptionCurve", app_source)
        self.assertNotIn("spend * 0.6", app_source)
        self.assertNotIn("Math.pow(0.65", app_source)
        self.assertIn("delete row.dataset.sampleDataPoints", app_source)
        self.assertIn(
            "event.target.matches('.ch-spend, .ch-conversions')",
            app_source,
        )

    def test_budget_layout_contains_narrow_results(self):
        tool_css = (REPO_ROOT / "tool-shell.css").read_text()
        charts_js = (REPO_ROOT / "shared/charts.js").read_text()

        self.assertIn(".channel-row {", tool_css)
        self.assertIn("grid-template-columns: 1fr;", tool_css)
        self.assertIn(".results .data-table-wrap", tool_css)
        self.assertIn("recommendedLegend", charts_js)
        self.assertNotIn("var(--surface-warm)", tool_css)


if __name__ == "__main__":
    unittest.main()
