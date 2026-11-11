create table if not exists public.table_of_contents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  href text not null default '' check (char_length(href) <= 500),
  created_at timestamptz not null default now()
);

alter table public.table_of_contents enable row level security;

grant select on public.table_of_contents to anon, authenticated;
grant insert on public.table_of_contents to authenticated;

drop policy if exists "Anyone can read table of contents" on public.table_of_contents;
create policy "Anyone can read table of contents"
  on public.table_of_contents
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Configured editor can add table of contents entries" on public.table_of_contents;
create policy "Configured editor can add table of contents entries"
  on public.table_of_contents
  for insert
  to authenticated
  with check (
    lower(auth.jwt() ->> 'email') = lower('REPLACE_WITH_EDITOR_EMAIL')
  );

