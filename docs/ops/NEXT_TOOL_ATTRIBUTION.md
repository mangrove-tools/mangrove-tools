# Phase 4 decision — Channel Attribution (MMM-lite)

## 1. Name / slug
**Channel Attribution** — `/analytics/attribution/`

## 2. Primary search intent / keyword
"marketing mix modeling small business", "channel attribution calculator", "free MMM tool".
Secondary: "multi-touch attribution free", "marketing attribution model".

## 3. Why it's niche & unique
- Full Marketing Mix Modeling (MMM) is a $30K-$100K/year agency product (Meta's
  Robyn, Google's LightweightMMM, Analytic Partners). The honest alternatives are
  either paid SaaS or spreadsheets.
- This tool does a **retrospective decomposition** of historical spend + outcome
  data into per-channel contributions, using a Hill curve per channel and least
  squares fit. It's the "MMM-lite" the AGENTS.md mentions.
- Complements the existing analytics pair: Budget Advisor = forward (given spend, predict
  outcome); Revenue Forecaster = time-series (given history, project future);
  **Attribution = retrospective (given history, attribute contributions)**.
- Calibrated for small business data: 4-12 monthly observations, sparse, noisy.
  No Bayesian, no MCMC, no hourly data required. Runs client-side.

## 4. Inputs → outputs → math outline

**Inputs:**
- Up to 6 channels (named by user; defaults: Search, Social, Email, Organic, Display, Other)
- Monthly rows of spend per channel + total outcome (revenue or conversions) for 4-12 months
- Entry: CSV paste (preferred), manual row entry, or load sample data

**Math (per channel i):**
- Hill-curve response: `contrib_i = a_i × spend_i / (spend_i + K_i)`
- Total predicted: `Σ contrib_i + baseline` (baseline = unmodeled lift, e.g. brand)
- Fit `a_i`, `K_i`, and `baseline` via bounded least squares (Levenberg-Marquardt
  approximation or grid + refine)
- Guard: at least 4 months; warn if R² < 0.5; clip per-channel contribution to ≥0

**Outputs:**
- Per-channel contribution share % over the fitted period
- Per-channel "saturation score" (where each channel sits on its Hill curve;
  0=linear, 1=saturated)
- Recommended reallocation suggestion (move spend from saturated to under-saturated)
- Goodness of fit (R², residual chart)
- Confidence band (bootstrap-resampled, optional toggle)

## 5. Monetization path
Soft CTA only — same model as Budget Advisor / Revenue Forecaster. After the
user sees their attribution breakdown, link to the analytics hub or back to
Budget Advisor for the forward-looking reallocation. No affiliate on the
analytics tools (per AGENTS.md "Analytics tools = free client-side calculators;
affiliate CTAs after value where relevant; never invent checkout links for
unconfigured products").

## 6. Explicit out-of-scope
- Adstock / carryover effects (full MMM has this; we omit for client-side tractability)
- Bayesian uncertainty (we give a point estimate + bootstrap CI toggle, not full posteriors)
- Hourly or weekly data (monthly grain only)
- Paid media attribution platform integrations (no GA4/Meta API — pure data in, model out)
- Multi-touch attribution paths (we use response curves, not Shapley/Hillstrom)
- Account-based / multi-tenant (no login, no save, no history)
- Comparison to Robyn/LightweightMMM (we're honest about being lite, not a replacement)

## 7. Size
M (3-5 files, 300-700 lines, one new shared engine)

## 8. Workflow
Static HTML/CSS/JS, mirrors the existing `analytics/{slug}/` pattern. Build via
chat-propose → approve → build (no decision notes).
