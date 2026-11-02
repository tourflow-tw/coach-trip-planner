create table public.agency_visit_sync (
 id uuid primary key default gen_random_uuid(),
 token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
 agencies jsonb not null default '[]'::jsonb check (jsonb_typeof(agencies)='array' and octet_length(agencies::text)<=4000000),
 revision integer not null default 0 check (revision>=0),
 updated_at timestamptz not null default now()
);
alter table public.agency_visit_sync enable row level security;
revoke all on public.agency_visit_sync from public, anon, authenticated;
grant select, insert, update, delete on public.agency_visit_sync to service_role;
create policy agency_visit_sync_service_only on public.agency_visit_sync for all to service_role using (true) with check (true);
