const { sanitizeEventPayload } = require("../_lib/analytics");
const { methodNotAllowed, sendJson } = require("../_lib/http");
const { createServerSupabaseClient } = require("../_lib/supabase");

function createEventHandler({ supabase } = {}) {
  return async function analyticsEvents(req, res) {
    if (req.method !== "POST") {
      return methodNotAllowed(res, ["POST"]);
    }

    let eventPayload;
    try {
      eventPayload = sanitizeEventPayload(req.body);
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }

    const client = supabase || createServerSupabaseClient();
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
