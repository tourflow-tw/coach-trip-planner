-- TourFlow / Coach Trip Planner: run only in a new, dedicated Supabase project.
-- No shared team policies: authenticated users can access only their own trips.
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trips_owner_updated_idx on public.trips(owner_id,updated_at desc);
alter table public.trips enable row level security;
revoke all on public.trips from anon;
grant select, insert, update, delete on public.trips to authenticated;

drop policy if exists "trips_select_own" on public.trips;
create policy "trips_select_own" on public.trips for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists "trips_insert_own" on public.trips;
create policy "trips_insert_own" on public.trips for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "trips_update_own" on public.trips;
create policy "trips_update_own" on public.trips for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "trips_delete_own" on public.trips;
create policy "trips_delete_own" on public.trips for delete to authenticated using ((select auth.uid()) = owner_id);

create or replace function public.update_trip_time() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists trips_set_updated on public.trips;
create trigger trips_set_updated before update on public.trips for each row execute function public.update_trip_time();