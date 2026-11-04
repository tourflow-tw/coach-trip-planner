-- Backwards-compatible expansion; existing RLS, grants and capability checks remain.
alter table public.agency_visit_sync add column if not exists settings jsonb not null default '{}'::jsonb check(jsonb_typeof(settings)='object' and octet_length(settings::text)<=50000);
