const { sanitizeFilter } = require("../_lib/analytics");
const { methodNotAllowed, sendJson } = require("../_lib/http");
const { createServerSupabaseClient } = require("../_lib/supabase");

const BENCHMARK_COLUMNS = [
  "tool_slug",
  "benchmark_key",
  "label",
  "metric",
  "segment",
  "value",
  "unit",
  "source_label",
  "source_url",
  "methodology",
  "metadata",
  "updated_at",
].join(", ");

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function readOptionalFilter(query, key) {
  const rawValue = firstQueryValue(query?.[key]);
  if (rawValue === undefined) {
    return null;
  }
  const sanitized = sanitizeFilter(rawValue);
  if (!sanitized) {
    throw new Error("Invalid benchmark filter.");
  }
  return sanitized;
}

function createBenchmarksHandler({ supabase } = {}) {
  return async function analyticsBenchmarks(req, res) {
    if (req.method !== "GET") {
      return methodNotAllowed(res, ["GET"]);
    }

    let toolSlug;
    let metric;
    let segment;
    try {
      toolSlug = readOptionalFilter(req.query, "tool_slug");
      metric = readOptionalFilter(req.query, "metric");
      segment = readOptionalFilter(req.query, "segment");
    } catch (error) {
      return sendJson(res, 400, { error: "Invalid benchmark filter." });
    }

    let client;
    try {
      client = supabase || createServerSupabaseClient();
    } catch (error) {
      return sendJson(res, 503, {
        error: "Analytics benchmarks are unavailable.",
      });
    }

    let query = client
      .from("analytics_benchmarks")
      .select(BENCHMARK_COLUMNS);

    if (toolSlug) {
      query = query.eq("tool_slug", toolSlug);
    }
    if (metric) {
      query = query.eq("metric", metric);
    }
    if (segment) {
      query = query.eq("segment", segment);
    }

    const { data, error } = await query
      .order("tool_slug", { ascending: true })
      .order("benchmark_key", { ascending: true })
      .order("segment", { ascending: true })
      .limit(100);
    if (error) {
      return sendJson(res, 502, { error: "Unable to read analytics benchmarks." });
    }

    return sendJson(res, 200, { data });
  };
}

module.exports = function analyticsBenchmarks(req, res) {
  return createBenchmarksHandler()(req, res);
};
module.exports.createBenchmarksHandler = createBenchmarksHandler;
