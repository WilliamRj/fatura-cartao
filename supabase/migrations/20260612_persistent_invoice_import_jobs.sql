begin;

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null unique,
  file_name text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 20971520),
  file_hash text not null check (file_hash ~ '^[0-9a-f]{64}$'),
  pdf_path text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'success', 'duplicate', 'error')),
  stage text not null default 'queued',
  progress smallint not null default 5 check (progress between 0 and 100),
  error_message text,
  fatura_id uuid,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint import_jobs_owner_path check (
    pdf_path ~ (
      '^'
      || user_id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
    )
  )
);

create index if not exists import_jobs_user_created_at_idx
  on public.import_jobs (user_id, created_at desc);

create unique index if not exists import_jobs_user_active_hash_unique
  on public.import_jobs (user_id, file_hash)
  where status in ('queued', 'processing');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.faturas'::regclass
      and conname = 'faturas_id_user_id_key'
  ) then
    alter table public.faturas
      add constraint faturas_id_user_id_key unique (id, user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.import_jobs'::regclass
      and conname = 'import_jobs_fatura_owner_fkey'
  ) then
    alter table public.import_jobs
      add constraint import_jobs_fatura_owner_fkey
      foreign key (fatura_id, user_id)
      references public.faturas(id, user_id)
      on delete set null (fatura_id);
  end if;
end
$$;

alter table public.import_jobs enable row level security;
alter table public.import_jobs force row level security;

drop policy if exists import_jobs_select_own on public.import_jobs;
drop policy if exists import_jobs_insert_own on public.import_jobs;
drop policy if exists import_jobs_update_own on public.import_jobs;
drop policy if exists import_jobs_delete_own on public.import_jobs;

create policy import_jobs_select_own
  on public.import_jobs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy import_jobs_insert_own
  on public.import_jobs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy import_jobs_update_own
  on public.import_jobs
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy import_jobs_delete_own
  on public.import_jobs
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.import_jobs from public, anon;
revoke all on table public.import_jobs from authenticated;
grant select, insert, update, delete on table public.import_jobs
  to authenticated;

commit;
