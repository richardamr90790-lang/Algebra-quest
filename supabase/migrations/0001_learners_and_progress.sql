-- Algebra Quest: parent accounts own learner profiles; each learner has one progress row.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table if not exists public.learners (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  created_at  timestamptz not null default now()
);
create index if not exists learners_owner_idx on public.learners (owner_id);

create table if not exists public.progress (
  learner_id  uuid primary key references public.learners(id) on delete cascade,
  state       jsonb not null default '{}'::jsonb check (pg_column_size(state) < 500000),
  updated_at  timestamptz not null default now()
);

alter table public.learners enable row level security;
alter table public.progress enable row level security;

-- A signed-in parent can see and change only their own learners...
create policy "own learners: select" on public.learners for select to authenticated using (owner_id = auth.uid());
create policy "own learners: insert" on public.learners for insert to authenticated with check (owner_id = auth.uid());
create policy "own learners: update" on public.learners for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own learners: delete" on public.learners for delete to authenticated using (owner_id = auth.uid());

-- ...and the progress rows that belong to those learners.
create policy "own progress: select" on public.progress for select to authenticated
  using (exists (select 1 from public.learners l where l.id = learner_id and l.owner_id = auth.uid()));
create policy "own progress: insert" on public.progress for insert to authenticated
  with check (exists (select 1 from public.learners l where l.id = learner_id and l.owner_id = auth.uid()));
create policy "own progress: update" on public.progress for update to authenticated
  using (exists (select 1 from public.learners l where l.id = learner_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.learners l where l.id = learner_id and l.owner_id = auth.uid()));

create or replace function public.touch_progress() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists progress_touch on public.progress;
create trigger progress_touch before update on public.progress for each row execute function public.touch_progress();
