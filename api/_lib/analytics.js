const ALLOWED_EVENT_NAMES = Object.freeze([
  "tool_started",
  "sample_data_used",
  "calculation_completed",
  "analytics_cta_clicked",
  "affiliate_clicked",
]);

const ALLOWED_METADATA_KEYS = Object.freeze([
  "affiliate_partner",
  "cta_id",
  "result_state",
  "sample_id",
  "source",
  "step",
  "surface",
  "version",
]);

const TOOL_PAGE_PATHS = Object.freeze({
  budget: "/analytics/budget/",
  forecast: "/analytics/forecast/",
  inventory: "/inventory/",
  letterroi: "/letterroi/",
  mediakit: "/mediakit/",
  sponsorquote: "/sponsorquote/",
  subtarget: "/subtarget/",
});

const ALLOWED_METADATA_VALUES = Object.freeze({
  affiliate_partner: new Set(["beehiiv"]),
  cta_id: new Set([
    "affiliate",
    "analytics-cta",
    "budget-tool",
    "forecast-cross-sell",
  ]),
  result_state: new Set([
    "complete",
    "incomplete",
    "invalid",
    "likely",
    "possible",
    "profitable",
    "unlikely",
    "unprofitable",
    "valid",
  ]),
  sample_id: new Set(["budget-sample", "forecast-sample"]),
  source: new Set(["form", "navigation", "results", "sample"]),
  step: new Set(["complete", "start"]),
  surface: new Set(["footer", "form", "navigation", "results"]),
});

const MAX_TEXT_LENGTH = 160;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_PATTERN = /^v[1-9][0-9]{0,2}$/;

function normalizeEventName(body) {
  return body.event_name || body.eventName || "";
}

function normalizeToolSlug(body) {
  return body.tool_slug || body.toolSlug || "";
}

function normalizePagePath(body) {
  return body.page_path || body.pagePath || null;
}

function sanitizeText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, MAX_TEXT_LENGTH);
}

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return ALLOWED_METADATA_KEYS.reduce((clean, key) => {
    const value = metadata[key];
    if (typeof value === "string") {
      const sanitized = sanitizeText(value);
      const allowedValues = ALLOWED_METADATA_VALUES[key];
      if (
        sanitized
        && (
          allowedValues?.has(sanitized)
          || (key === "version" && VERSION_PATTERN.test(sanitized))
        )
      ) {
        clean[key] = sanitized;
      }
    }
    return clean;
  }, {});
}

function sanitizeEventPayload(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("A valid event payload is required.");
  }

  const eventName = sanitizeText(normalizeEventName(body));
  if (!ALLOWED_EVENT_NAMES.includes(eventName)) {
    throw new Error("Unsupported event name.");
  }

  const toolSlug = sanitizeText(normalizeToolSlug(body));
  if (!toolSlug || !Object.hasOwn(TOOL_PAGE_PATHS, toolSlug)) {
    throw new Error("A supported tool slug is required.");
  }

  const pagePath = sanitizeText(normalizePagePath(body));
  const canonicalPagePath = TOOL_PAGE_PATHS[toolSlug];
  if (pagePath && pagePath !== canonicalPagePath) {
    throw new Error("The page path must match the selected tool.");
  }

  return {
    event_name: eventName,
    tool_slug: toolSlug,
    page_path: canonicalPagePath,
    metadata: sanitizeMetadata(body.metadata),
  };
}

function sanitizeFilter(value) {
  const sanitized = sanitizeText(value);
  return sanitized && SLUG_PATTERN.test(sanitized) ? sanitized : null;
}

module.exports = {
  ALLOWED_EVENT_NAMES,
  ALLOWED_METADATA_KEYS,
  sanitizeEventPayload,
  sanitizeFilter,
};
