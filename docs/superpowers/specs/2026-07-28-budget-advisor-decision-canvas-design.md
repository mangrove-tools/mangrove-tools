# Budget Advisor Decision Canvas Design

**Date:** 2026-07-28
**Status:** User-approved for implementation planning
**Scope:** `/analytics/budget/` and new reusable browser-only history,
marginality, allocation, and chart modules

## Objective

Replace Budget Advisor's long channel-by-channel form with a progressive
historical-data Decision Canvas.

The primary user supplies real dated channel history, enters a total budget and
planning window, and receives a constrained allocation based only on channels
whose marginal response is defensible from the supplied observations.

The redesign must make the tool easier to use without hiding its evidence,
assumptions, constraints, or failure modes.

## Product boundary

This specification covers Budget Advisor v2 only.

Revenue Forecaster may later reuse parsing and visual primitives, but its model
and interaction require a separate design. Its missing manual-input labels and
uncalibrated confidence language should be repaired independently rather than
being bundled into this implementation.

The following are removed from Budget Advisor's primary flow:

- number of channels;
- repeated channel input rows;
- manually entered months represented;
- the current disconnected target-metric selector; and
- an implicit assumption curve presented as if it were fitted history.

An explicitly labeled scenario mode is not part of this implementation. It may
be designed separately after the historical-data path is validated.

## Experience model

The page is one progressive Decision Canvas rather than a modal wizard or dense
split workspace.

### State 1: Bring historical data

The first viewport provides three actions:

1. Upload CSV.
2. Paste a table copied from a spreadsheet.
3. Try the committed sample dataset.

The sample is secondary to the real-data actions but remains visible without
scrolling at a 390-by-844 viewport.

Accepted data stays in browser memory. Importing a replacement dataset clears
the prior analysis after an explicit in-page warning.

### State 2: Inspect readiness

After parsing, the page reports:

- complete periods detected;
- channels detected;
- available outcome metrics;
- rows excluded or requiring correction;
- modelable channels;
- preserved channels; and
- the reason for every modelability decision.

The user never needs to declare channel count, history length, or outcome type
when those facts can be derived from the imported columns.

### State 3: Plan the next move

After at least one defensible channel or preserved allocation exists, the
required planning controls are:

- total budget; and
- planning window, expressed as dates or a number of days.

The tool automatically selects the strongest eligible objective whose units and
cost treatment are unambiguous:

1. contribution or gross-profit data;
2. revenue data; or
3. conversions.

When multiple objectives are eligible, the user may change the objective after
import. Financial outcomes do not become eligible until the mapping identifies
whether marketing spend is already deducted. Optional channel minimums,
maximums, and exclusions remain collapsed under an advanced disclosure.

### State 4: Inspect the result

The result reports:

- the entire requested budget or a structured infeasibility result;
- optimized spend versus preserved spend;
- current and recommended spend by channel;
- predicted outcome under the selected objective;
- marginal CPA, ROAS, or ROI when supported;
- the constraints applied;
- observed historical points;
- fitted response curves for modelable channels;
- current and recommended positions on each curve;
- marginal-efficiency comparisons;
- visible evidence gaps for unmodeled channels;
- a plain-language explanation; and
- a bounded test and recheck recommendation.

Changing budget, dates, objective, or optional constraints reuses the admitted
curves without requiring another import.

## Input contract

### Required columns

- `period`
- `channel`
- `spend`
- at least one of `conversions` or `revenue`

### Optional columns

- a contribution or gross-profit value whose cost treatment can be mapped;
- campaign or segment identifiers retained for inspection

Financial columns such as `contribution`, `gross_profit`, or `profit` require an
explicit cost-treatment mapping: before marketing spend or after marketing
spend. Column names may suggest a mapping but never confirm it automatically.
This prevents the model from silently subtracting marketing spend twice or
failing to subtract it.

### Supported input

- UTF-8 CSV, including quoted values;
- tab-separated text;
- spreadsheet paste; and
- the versioned committed sample fixture.

The parser detects common column names and presents a mapping step only when the
mapping is missing or ambiguous. It never silently guesses date formats,
currency units, percentages, or financial meaning.

### Period normalization

- Daily data aggregates into complete ISO weeks by default.
- Weekly data remains weekly.
- Monthly data remains monthly.
- Mixed cadences are rejected until the user selects one cadence or fixes the
  input.
- Incomplete current periods are excluded and disclosed.
- Spend and outcome rates are normalized consistently for the chosen cadence
  before planning-window scaling.

## Modelability contract

A channel is modelable only when all gates pass.

### Initial deterministic gates

- at least 12 complete periods at one cadence;
- positive spend and the selected outcome in at least 75% of periods;
- at least four distinct positive spend values; and
- robust spend variation of at least 20%, measured as
  `(p90 spend - p10 spend) / median spend`.

These thresholds are named policy constants with unit tests and user-facing
explanations. They must not be duplicated as anonymous numbers across modules.

### Curve gates

The initial model remains an inspectable log-log diminishing-return response
curve. A curve is admitted only when:

- elasticity is finite and strictly between 0 and 1;
- predictions are finite, nonnegative, monotonic, and diminishing;
- leave-one-period-out elasticity estimates remain in the valid range;
- the leave-one-period-out elasticity interquartile range is no greater than
  0.25; and
- removing one period does not change the predicted outcome at current spend
  by more than 25%.

Fit strength is reported separately from data quality. A high in-sample fit
does not override a failed variation or stability gate.

### Observational boundary

The fitted relationship is observational, not causal. Seasonality, promotions,
pricing, targeting, creative, audience, channel interactions, and measurement
changes may confound it.

The interface must say "modeled marginal" or "historical response estimate." It
must not say "causal," "proven optimal," or equivalent language unless a future
design accepts suitable experimental evidence.

## Preserved-channel behavior

When a channel fails modelability:

1. Do not fit, display, or use a generic substitute curve.
2. Show its historical observations and the failed gates.
3. Calculate its default preserved amount from the median spend rate over the
   four most recent complete periods, projected across the requested planning
   window.
4. Allow the user to override the preserved minimum or exclude the channel.
5. Prevent the optimizer from assigning incremental spend to the channel.

If preserved allocations and explicit minimums exceed the total budget, the
plan is infeasible. The result must identify the conflicting channels and the
minimum budget or constraint changes required. It must not scale user-set
minimums silently or manufacture a partial recommendation.

## Objective and marginal metrics

The optimizer uses exactly one selected objective.

### Conversions

- Maximize predicted conversions.
- Report marginal CPA as the inverse of marginal conversions per dollar.

### Revenue

- Maximize predicted revenue.
- Report marginal ROAS as marginal revenue per dollar.
- Do not label revenue-based return as ROI.

### Contribution or gross profit

- If the mapped outcome is before marketing spend, derive net contribution as
  predicted outcome minus spend, maximize that derived value, and calculate
  marginal ROI as the change in net contribution per incremental dollar.
- If the mapped outcome is already after marketing spend, maximize the modeled
  net contribution directly and calculate marginal ROI from its marginal
  change per dollar.
- Keep the mapping and cost treatment visible beside the result.
- Reserve "marginal ROI" for these explicitly mapped cases.

When multiple outcomes are available, fit and display them separately. The
non-selected metrics are diagnostics; they are not blended into an opaque
composite score.

## Allocation contract

The optimizer operates at the historical cadence and scales the plan to the
requested horizon. For a partial cadence, it converts the proposed total spend
to a per-cadence spend rate, evaluates the response curve at that rate, and
multiplies the predicted outcome by the same fractional cadence. For example, a
10-day plan against weekly history uses a `10 / 7` horizon factor. The same
factor is applied to preserved spend rates and every modeled outcome.

Inputs are:

- admitted response curves;
- preserved allocations;
- total budget;
- planning window;
- selected objective;
- optional minimums;
- optional maximums; and
- optional exclusions.

The optimizer:

1. validates feasibility;
2. reserves preserved and minimum allocations;
3. allocates only the defensible remainder across admitted curves;
4. approximately balances the selected marginal return among unconstrained
   channels;
5. applies maximums and exclusions; and
6. returns the complete allocation plus machine-readable diagnostics.

The allocation must sum to the requested budget within a documented currency
rounding tolerance. It must never emit negative, nonfinite, or unit-inconsistent
values.

Short horizons or known channel-response delays trigger a timing caveat. They
do not silently change the requested planning window.

## Visual evidence

The design extends the approved Premium Analytics Instrument system:

- IBM Plex Sans for interface hierarchy;
- IBM Plex Mono for labels, metrics, axes, diagnostics, and tables;
- pine for recommended or model-supported states;
- signal amber for current state, uncertainty, caveats, or thresholds; and
- calibrated rules and coordinate grids only where they clarify evidence.

The result always shows an allocation overview. An in-page model inspector then
shows:

- observed points and the fitted curve for each modelable channel;
- current and recommended spend markers;
- marginal CPA, ROAS, or ROI at the proposed allocation;
- a cross-channel marginal-efficiency comparison;
- observed points without an invented curve for unmodeled channels;
- the cleaned historical table; and
- user-triggered downloads for cleaned data and the allocation.

Charts may not use color as their only distinction. Every chart needs labels, a
plain-language summary, and an equivalent accessible table. At 390px, channel
charts stack vertically and tables remain contained with deliberate horizontal
scrolling.

Reduced-motion mode shows the final chart and result states without animated
transitions.

## Application states

The Decision Canvas has six explicit states:

1. `empty`
2. `parsing`
3. `needs_correction`
4. `ready` or `partially_modelable`
5. `blocked`
6. `result`

### Parsing and correction

Malformed or ambiguous rows receive row-level findings. The parser must not
silently coerce ambiguous dates, financial semantics, currencies, or units.
Users may download correction guidance based on the detected schema.

### Partial modelability

A partially modelable dataset remains usable when preserved allocations and
the remaining modelable channels permit a feasible plan. Every excluded row,
failed gate, and preserved allocation remains visible.

### Blocked states

Blocked states include:

- no eligible outcome;
- insufficient complete history for every channel;
- no meaningful spend variation;
- unstable or invalid curves;
- incompatible period cadences;
- infeasible preserved allocations or constraints; and
- a total budget or horizon that cannot be normalized safely.

Every blocked state identifies the next corrective action. It never displays a
recommendation.

## Architecture

### `shared/history-data.js`

Pure parsing, column mapping, date and unit normalization, cadence aggregation,
and row-level validation.

### `shared/marginality-engine.js`

Pure curve fitting, prediction, marginal metrics, modelability gates,
leave-one-period-out diagnostics, and controlled result objects.

### `shared/budget-allocator.js`

Pure feasibility checks, preserved-amount handling, bounded allocation, marginal
balancing, and allocation diagnostics.

### `shared/charts.js`

Allocation, historical-response, and marginal-efficiency rendering from
controlled result objects. It must not calculate business-model outputs.

### `analytics/budget/app.js`

DOM and application-state orchestration only:

```text
file or paste
  -> parsed rows
  -> normalized history
  -> channel diagnostics
  -> admitted curves and preserved channels
  -> budget and horizon
  -> constrained allocation
  -> visual result and inspectable evidence
  -> optional local download
```

Model math must not live in the UI controller.

## Privacy and telemetry

- Raw imported rows remain in browser memory.
- Refreshing clears the session.
- Raw rows, spend, revenue, conversions, dates, channel names, curves, and
  allocations may not enter analytics payloads, logs, local storage, or network
  requests.
- Downloads occur only after an explicit user action.
- Product telemetry remains limited to the existing event allowlist:
  `tool_started`, `sample_data_used`, `calculation_completed`,
  `analytics_cta_clicked`, and `affiliate_clicked`.
- No backend, account, database write, or new analytics SDK is introduced.

## Testing

Implementation is test-first.

### Parser and normalization fixtures

- quoted CSV;
- TSV and spreadsheet paste;
- valid daily, weekly, and monthly history;
- mixed and ambiguous dates;
- mixed cadences;
- missing fields;
- incomplete current periods;
- malformed numbers;
- conversions-only history;
- revenue history;
- contribution history; and
- ambiguous profit semantics.

### Model fixtures

- strong multi-channel variation;
- too few complete periods;
- insufficient spend variation;
- zero or missing outcomes;
- invalid elasticity;
- one-period leverage;
- stable and unstable leave-one-out fits;
- mixed modelable and preserved channels; and
- confounded or directional examples whose UI language remains observational.

### Allocation invariants

- allocations sum to the requested budget within rounding tolerance;
- preserved channels remain at their default or user-set amount;
- unmodeled channels receive no incremental optimized spend;
- minimums, maximums, and exclusions are honored;
- unconstrained channels approximately balance the selected marginal return;
- objectives and units remain consistent;
- results are finite and nonnegative; and
- infeasible constraints return a structured error, not a partial allocation.

### UI and accessibility

- every Decision Canvas state has an integration test;
- import actions remain visible in the initial 390-by-844 viewport;
- only budget and horizon are required after successful import;
- controls have programmatic labels;
- keyboard-only operation works;
- every chart has a summary and accessible table;
- modelable and preserved states do not rely on color;
- reduced motion is static and readable;
- desktop and 390px browser verification covers successful, partial, blocked,
  and infeasible states; and
- successful sample and real-fixture flows produce no console errors or
  horizontal overflow.

### Privacy

Tests assert that raw inputs and derived financial values never reach:

- telemetry payloads;
- console output;
- local storage;
- session storage; or
- network requests.

## Boundaries

Do not change:

- Affiliate IDs or `AFFILIATE_URL`;
- Google Analytics identity;
- Supabase schema or backend behavior;
- Vercel, DNS, domain, or production wiring;
- payments, secrets, or legal claims;
- Revenue Forecaster behavior beyond separately scoped repairs; or
- unrelated routes and calculators.

Do not add:

- a framework;
- a runtime dependency;
- a build step;
- an account requirement;
- server-side input handling; or
- raw-input persistence.

## Acceptance

The implementation is complete only when:

1. all required behavior above is covered by deterministic tests;
2. the repository validator and validator unit suite pass;
3. relevant Node contracts pass;
4. desktop, 390px, keyboard, reduced-motion, partial, blocked, and infeasible
   browser states are verified;
5. desktop and 390px screenshots are included;
6. privacy assertions pass;
7. an independent reviewer reports no critical or important findings on the
   exact committed head; and
8. the ready pull request identifies remaining statistical and product risks.
