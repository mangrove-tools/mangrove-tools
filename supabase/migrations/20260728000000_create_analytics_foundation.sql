-- Mangrove analytics backend foundation.
--
-- Security posture:
-- - Browser calculators do not write directly to Supabase.
-- - RLS is enabled on both public tables as defense in depth.
-- - No anon/authenticated grants are added; server-side API routes use the
--   server-only Supabase secret key.
-- - analytics_events stores allowlisted product events and sanitized metadata
--   only. It is not intended for raw calculator inputs or customer data.

create extension if not exists pgcrypto;

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  tool_slug text not null,
  page_path text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint analytics_events_event_name_check check (
    event_name in (
      'tool_started',
      'sample_data_used',
      'calculation_completed',
      'analytics_cta_clicked',
      'affiliate_clicked'
    )
  ),
  constraint analytics_events_tool_slug_check check (
    tool_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint analytics_events_metadata_object_check check (
    jsonb_typeof(metadata) = 'object'
  )
);

create index analytics_events_occurred_at_idx
  on public.analytics_events (occurred_at desc);

create index analytics_events_tool_event_idx
  on public.analytics_events (tool_slug, event_name, occurred_at desc);

alter table public.analytics_events enable row level security;

create table public.analytics_benchmarks (
  id uuid primary key default gen_random_uuid(),
  tool_slug text not null,
  benchmark_key text not null,
  label text not null,
  metric text not null,
  segment text not null default 'all',
  value numeric not null,
  unit text not null,
  source_label text not null,
  source_url text,
  methodology text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analytics_benchmarks_tool_slug_check check (
    tool_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint analytics_benchmarks_key_check check (
    benchmark_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint analytics_benchmarks_metric_check check (
    metric ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint analytics_benchmarks_segment_check check (
    segment ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint analytics_benchmarks_metadata_object_check check (
    jsonb_typeof(metadata) = 'object'
  ),
  constraint analytics_benchmarks_unique_key unique (
    tool_slug,
    benchmark_key,
    segment
  )
);

create index analytics_benchmarks_tool_metric_idx
  on public.analytics_benchmarks (tool_slug, metric);

alter table public.analytics_benchmarks enable row level security;

revoke all on table public.analytics_events from anon, authenticated;
revoke all on table public.analytics_benchmarks from anon, authenticated;
