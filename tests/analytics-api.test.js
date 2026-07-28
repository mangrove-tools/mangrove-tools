const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  ALLOWED_EVENT_NAMES,
  sanitizeEventPayload,
} = require("../api/_lib/analytics");
const { createEventHandler } = require("../api/analytics/events");
const { createBenchmarksHandler } = require("../api/analytics/benchmarks");

const root = path.resolve(__dirname, "..");

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

test("event payload sanitizer rejects unknown tools and request-like page paths", () => {
  assert.throws(
    () => sanitizeEventPayload({
      event_name: "calculation_completed",
      tool_slug: "customer-acme",
      page_path: "/analytics/budget/",
    }),
    /supported tool slug/i,
  );
  assert.throws(
    () => sanitizeEventPayload({
      event_name: "calculation_completed",
      tool_slug: "budget",
      page_path: "/analytics/budget/?email=founder@example.com",
    }),
    /page path/i,
  );
});

test("event payload sanitizer drops request-like values under allowed metadata keys", () => {
  const payload = sanitizeEventPayload({
    event_name: "calculation_completed",
    tool_slug: "budget",
    page_path: "/analytics/budget/",
    metadata: {
      result_state: "profitable",
      cta_id: "founder@example.com",
      source: "my actual budget is 12000",
      version: "v1",
    },
  });

  assert.deepEqual(payload.metadata, {
    result_state: "profitable",
    version: "v1",
  });
});

test("event endpoint is unavailable unless explicitly enabled", async () => {
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
    eventsEnabled: false,
  });
  const res = createResponse();

  await handler({
    method: "POST",
    body: {
      event_name: "tool_started",
      tool_slug: "budget",
      page_path: "/analytics/budget/",
    },
  }, res);

  assert.equal(res.statusCode, 503);
  assert.equal(insertCalled, false);
  assert.deepEqual(res.body, { error: "Analytics event collection is disabled." });
});

test("event endpoint rejects unsupported events without calling Supabase", async () => {
  let insertCalled = false;
  const handler = createEventHandler({
    eventsEnabled: true,
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
    eventsEnabled: true,
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
      return this;
    },
    limit(value) {
      calls.push(["limit", value]);
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
    ["order", "benchmark_key", { ascending: true }],
    ["order", "segment", { ascending: true }],
    ["limit", 100],
  ]);
});

test("benchmarks endpoint rejects an invalid supplied filter", async () => {
  let selectCalled = false;
  const handler = createBenchmarksHandler({
    supabase: {
      from() {
        return {
          select() {
            selectCalled = true;
            return this;
          },
        };
      },
    },
  });
  const res = createResponse();

  await handler({
    method: "GET",
    query: { metric: "cac?customer=email@example.com" },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(selectCalled, false);
  assert.deepEqual(res.body, { error: "Invalid benchmark filter." });
});

test("migration grants only the server role and maintains benchmark timestamps", () => {
  const migration = fs.readFileSync(
    path.join(
      root,
      "supabase/migrations/20260728000000_create_analytics_foundation.sql",
    ),
    "utf8",
  );

  assert.match(
    migration,
    /grant insert on table public\.analytics_events to service_role;/i,
  );
  assert.match(
    migration,
    /grant select on table public\.analytics_benchmarks to service_role;/i,
  );
  assert.match(
    migration,
    /create trigger analytics_benchmarks_set_updated_at/i,
  );
  assert.doesNotMatch(
    migration,
    /grant\s+(?:insert|update|delete|select).*\b(?:anon|authenticated)\b/i,
  );
});

test("ops documentation uses canonical API routes and keeps writes disabled by default", () => {
  const docs = fs.readFileSync(
    path.join(root, "docs/ops/SUPABASE_BACKEND.md"),
    "utf8",
  );

  assert.match(docs, /POST `?\/api\/analytics\/events\/`?/);
  assert.match(docs, /GET `?\/api\/analytics\/benchmarks\/`?/);
  assert.match(docs, /ANALYTICS_EVENTS_ENABLED=false/);
  assert.match(docs, /rate limit/i);
});
