const { sanitizeEventPayload } = require("../_lib/analytics");
const { methodNotAllowed, sendJson } = require("../_lib/http");
const { createServerSupabaseClient } = require("../_lib/supabase");

function createEventHandler({
  supabase,
  eventsEnabled = process.env.ANALYTICS_EVENTS_ENABLED === "true",
} = {}) {
  return async function analyticsEvents(req, res) {
    if (req.method !== "POST") {
      return methodNotAllowed(res, ["POST"]);
    }

    if (!eventsEnabled) {
      return sendJson(res, 503, {
        error: "Analytics event collection is disabled.",
      });
    }

    let eventPayload;
    try {
      eventPayload = sanitizeEventPayload(req.body);
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }

    let client;
    try {
      client = supabase || createServerSupabaseClient();
    } catch (error) {
      return sendJson(res, 503, {
        error: "Analytics event collection is unavailable.",
      });
    }
    const { error } = await client.from("analytics_events").insert([eventPayload]);
    if (error) {
      return sendJson(res, 502, { error: "Unable to record analytics event." });
    }

    return sendJson(res, 202, { ok: true });
  };
}

module.exports = function analyticsEvents(req, res) {
  return createEventHandler()(req, res);
};
module.exports.createEventHandler = createEventHandler;
