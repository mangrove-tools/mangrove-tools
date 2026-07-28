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

function createBenchmarksHandler({ supabase } = {}) {
  return async function analyticsBenchmarks(req, res) {
    if (req.method !== "GET") {
      return methodNotAllowed(res, ["GET"]);
    }

    const client = supabase || createServerSupabaseClient();
    let query = client
      .from("analytics_benchmarks")
      .select(BENCHMARK_COLUMNS);

    const toolSlug = sanitizeFilter(firstQueryValue(req.query?.tool_slug));
    const metric = sanitizeFilter(firstQueryValue(req.query?.metric));
    const segment = sanitizeFilter(firstQueryValue(req.query?.segment));

    if (toolSlug) {
      query = query.eq("tool_slug", toolSlug);
    }
    if (metric) {
      query = query.eq("metric", metric);
    }
    if (segment) {
      query = query.eq("segment", segment);
    }

    const { data, error } = await query.order("tool_slug", { ascending: true });
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
