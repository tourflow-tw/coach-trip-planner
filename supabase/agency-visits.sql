-- Agency visits: separate user-owned dataset, atomic optimistic concurrency.
create table public.agency_visit_books (
  user_id uuid primary key references auth.users(id) on delete cascade,
  agencies jsonb not null default '[]'::jsonb,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint agency_visit_books_array check (jsonb_typeof(agencies) = 'array'),
  constraint agency_visit_books_size check (octet_length(agencies::text) <= 4000000)
);
alter table public.agency_visit_books enable row level security;
revoke all on public.agency_visit_books from anon, authenticated;
grant select, insert, update, delete on public.agency_visit_books to authenticated;
create policy agency_visit_books_select on public.agency_visit_books for select to authenticated using ((select auth.uid()) = user_id);
create policy agency_visit_books_insert on public.agency_visit_books for insert to authenticated with check ((select auth.uid()) = user_id);
create policy agency_visit_books_update on public.agency_visit_books for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy agency_visit_books_delete on public.agency_visit_books for delete to authenticated using ((select auth.uid()) = user_id);
create function public.save_agency_visit_book(p_agencies jsonb, p_expected_revision integer)
returns table(revision integer, updated_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_rows integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if jsonb_typeof(p_agencies) is distinct from 'array' or octet_length(p_agencies::text) > 4000000 then
    raise exception 'INVALID_DATASET' using errcode = '22023';
  end if;
  if p_expected_revision = 0 then
    return query insert into public.agency_visit_books as b(user_id, agencies, revision)
      values (v_uid, p_agencies, 1) on conflict (user_id) do nothing returning b.revision, b.updated_at;
  else
    return query update public.agency_visit_books as b set agencies=p_agencies, revision=b.revision+1, updated_at=now()
      where b.user_id=v_uid and b.revision=p_expected_revision returning b.revision, b.updated_at;
  end if;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then raise exception 'VERSION_CONFLICT' using errcode = '40001'; end if;
end;
$$;
revoke all on function public.save_agency_visit_book(jsonb, integer) from public, anon;
grant execute on function public.save_agency_visit_book(jsonb, integer) to authenticated;
