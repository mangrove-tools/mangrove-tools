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

const MAX_TEXT_LENGTH = 160;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
      if (sanitized) {
        clean[key] = sanitized;
      }
    } else if (typeof value === "boolean") {
      clean[key] = value;
    }
    return clean;
  }, {});
}

function sanitizeEventPayload(body = {}) {
  const eventName = sanitizeText(normalizeEventName(body));
  if (!ALLOWED_EVENT_NAMES.includes(eventName)) {
    throw new Error("Unsupported event name.");
  }

  const toolSlug = sanitizeText(normalizeToolSlug(body));
  if (!toolSlug || !SLUG_PATTERN.test(toolSlug)) {
    throw new Error("A valid tool slug is required.");
  }

  const pagePath = sanitizeText(normalizePagePath(body));
  return {
    event_name: eventName,
    tool_slug: toolSlug,
    page_path: pagePath && pagePath.startsWith("/") ? pagePath : null,
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
