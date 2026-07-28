const assert = require("node:assert/strict");
const test = require("node:test");

const {
  ALLOWED_EVENT_NAMES,
  sanitizeEventPayload,
} = require("../api/_lib/analytics");
const { createEventHandler } = require("../api/analytics/events");
const { createBenchmarksHandler } = require("../api/analytics/benchmarks");

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("event allowlist is limited to approved non-sensitive product events", () => {
  assert.deepEqual(ALLOWED_EVENT_NAMES, [
    "tool_started",
    "sample_data_used",
    "calculation_completed",
    "analytics_cta_clicked",
    "affiliate_clicked",
  ]);
});

test("event payload sanitizer drops raw calculator inputs and disallowed metadata", () => {
  const payload = sanitizeEventPayload({
    event_name: "calculation_completed",
    tool_slug: "budget",
    page_path: "/analytics/budget/",
    metadata: {
      result_state: "profitable",
      cta_id: "forecast-cross-sell",
      budget: 12000,
      revenue: 45000,
      email: "founder@example.com",
      freeform_note: "my actual business inputs",
    },
  });

  assert.equal(payload.event_name, "calculation_completed");
  assert.equal(payload.tool_slug, "budget");
  assert.deepEqual(payload.metadata, {
    result_state: "profitable",
    cta_id: "forecast-cross-sell",
  });
});

test("event endpoint rejects unsupported events without calling Supabase", async () => {
  let insertCalled = false;
  const handler = createEventHandler({
    supabase: {
      from() {
        return {
          insert() {
            insertCalled = true;
            return { error: null };
          },
        };
      },
    },
  });
  const req = {
    method: "POST",
    body: {
      event_name: "raw_calculator_submitted",
      tool_slug: "budget",
      metadata: { budget: 5000 },
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(insertCalled, false);
  assert.match(res.body.error, /unsupported event/i);
});

test("event endpoint stores only sanitized allowlisted event fields", async () => {
  let inserted;
  const handler = createEventHandler({
    supabase: {
      from(table) {
        assert.equal(table, "analytics_events");
        return {
          insert(rows) {
            inserted = rows[0];
            return { error: null };
          },
        };
      },
    },
  });
  const req = {
    method: "POST",
    body: {
      eventName: "analytics_cta_clicked",
      toolSlug: "forecast",
      pagePath: "/analytics/forecast/",
      metadata: {
        cta_id: "budget-tool",
        surface: "results",
        pipeline_value: 99000,
      },
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 202);
  assert.deepEqual(inserted, {
    event_name: "analytics_cta_clicked",
    tool_slug: "forecast",
    page_path: "/analytics/forecast/",
    metadata: {
      cta_id: "budget-tool",
      surface: "results",
    },
  });
  assert.deepEqual(res.body, { ok: true });
});

test("benchmarks endpoint reads curated rows through Supabase server route", async () => {
  const calls = [];
  const query = {
    select(columns) {
      calls.push(["select", columns]);
      return this;
    },
    eq(column, value) {
      calls.push(["eq", column, value]);
      return this;
    },
    order(column, options) {
      calls.push(["order", column, options]);
      return Promise.resolve({
        data: [
          {
            tool_slug: "budget",
            benchmark_key: "paid-search-cac",
            label: "Paid search CAC",
            metric: "cac",
            segment: "b2b-saas",
            value: 245,
            unit: "usd",
            source_label: "Curated Mangrove baseline",
            source_url: null,
            methodology: "Seed benchmark for local tool development.",
            metadata: {},
            updated_at: "2026-07-28T00:00:00Z",
          },
        ],
        error: null,
      });
    },
  };
  const handler = createBenchmarksHandler({
    supabase: {
      from(table) {
        calls.push(["from", table]);
        return query;
      },
    },
  });
  const req = {
    method: "GET",
    query: { tool_slug: "budget", metric: "cac" },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.length, 1);
  assert.deepEqual(calls, [
    ["from", "analytics_benchmarks"],
    [
      "select",
      "tool_slug, benchmark_key, label, metric, segment, value, unit, source_label, source_url, methodology, metadata, updated_at",
    ],
    ["eq", "tool_slug", "budget"],
    ["eq", "metric", "cac"],
    ["order", "tool_slug", { ascending: true }],
  ]);
});
