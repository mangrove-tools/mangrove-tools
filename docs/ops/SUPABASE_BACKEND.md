# Supabase Backend Foundation

This repo uses Supabase only through server-side Vercel API routes. Browser calculators must not send raw calculator inputs to the backend by default.

## Environment

Set these variables in the server runtime:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `ANALYTICS_EVENTS_ENABLED=false`

Do not expose the secret key through `NEXT_PUBLIC_`, client JavaScript, static HTML, or committed files.

## Routes

- `POST /api/analytics/events/`: records allowlisted non-sensitive product events only.
- `GET /api/analytics/benchmarks/`: reads at most 100 curated benchmark rows for analytics tools.

Event collection is disabled unless `ANALYTICS_EVENTS_ENABLED=true`. Keep it
disabled until the production route has a Vercel Firewall rate limit and its
event taxonomy has been reviewed against the browser integration. The database
migration and environment setup alone must not activate public writes.

Allowed event names are `tool_started`, `sample_data_used`, `calculation_completed`, `analytics_cta_clicked`, and `affiliate_clicked`.

Allowed event metadata keys are `affiliate_partner`, `cta_id`, `result_state`, `sample_id`, `source`, `step`, `surface`, and `version`. Values are restricted to server-owned enumerations; the route drops unknown values and all other metadata keys, including raw calculator inputs such as budgets, revenue, pipeline values, emails, or notes. Tool slugs and page paths must match the repository's fixed public tool routes.

## Security Posture

The migration enables RLS on both tables and grants no `anon` or `authenticated` table privileges. Direct browser access through Supabase Data APIs is not part of this foundation. Server routes use the server-only Supabase secret key and must keep their own payload allowlists narrow.
