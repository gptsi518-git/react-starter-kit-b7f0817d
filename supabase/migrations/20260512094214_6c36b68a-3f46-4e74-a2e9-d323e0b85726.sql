
-- ───────── tables ─────────
create table public.sessions (
  id text primary key,
  owner_name text not null default '',
  facilitator_name text not null default '',
  stage int not null default 1,
  active_slot int not null default 1,
  paused boolean not null default false,
  stage_started_at timestamptz not null default now(),
  paused_at timestamptz,
  paused_accum_ms bigint not null default 0,
  notes text not null default '',
  ai_questions jsonb not null default '[]'::jsonb,
  clusters jsonb,
  pending_chunk text not null default '',
  created_at timestamptz not null default now()
);

create table public.slots (
  session_id text not null references public.sessions(id) on delete cascade,
  n int not null,
  title text not null default '',
  state text not null default 'wait',
  transcript text not null default '',
  summary text not null default '',
  primary key (session_id, n)
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.sessions(id) on delete cascade,
  n int not null,
  author text not null default '',
  text text not null,
  mark text,
  created_at timestamptz not null default now()
);
create index idx_ideas_session on public.ideas(session_id, n);

create table public.idea_candidates (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.sessions(id) on delete cascade,
  text text not null,
  author text,
  confidence numeric not null default 0.7,
  created_at timestamptz not null default now()
);
create index idx_cands_session on public.idea_candidates(session_id);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.sessions(id) on delete cascade,
  author text not null default '',
  text text not null,
  created_at timestamptz not null default now()
);
create index idx_questions_session on public.questions(session_id);

create table public.steps (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.sessions(id) on delete cascade,
  n int not null,
  title text not null,
  detail text not null default '',
  first_step text not null default '',
  due text not null default '',
  idea_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_steps_session on public.steps(session_id, n);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.sessions(id) on delete cascade,
  name text not null,
  joined_at timestamptz not null default now()
);
create index idx_participants_session on public.participants(session_id);

-- ───────── RLS (public prototype: open access) ─────────
alter table public.sessions enable row level security;
alter table public.slots enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_candidates enable row level security;
alter table public.questions enable row level security;
alter table public.steps enable row level security;
alter table public.participants enable row level security;

create policy "open all" on public.sessions for all using (true) with check (true);
create policy "open all" on public.slots for all using (true) with check (true);
create policy "open all" on public.ideas for all using (true) with check (true);
create policy "open all" on public.idea_candidates for all using (true) with check (true);
create policy "open all" on public.questions for all using (true) with check (true);
create policy "open all" on public.steps for all using (true) with check (true);
create policy "open all" on public.participants for all using (true) with check (true);

-- ───────── realtime ─────────
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.slots;
alter publication supabase_realtime add table public.ideas;
alter publication supabase_realtime add table public.idea_candidates;
alter publication supabase_realtime add table public.questions;
alter publication supabase_realtime add table public.steps;
alter publication supabase_realtime add table public.participants;

-- ───────── RPC functions ─────────

create or replace function public.create_session(
  p_id text,
  p_owner_name text default '',
  p_facilitator_name text default ''
) returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.sessions;
begin
  insert into public.sessions (id, owner_name, facilitator_name)
  values (p_id, coalesce(p_owner_name,''), coalesce(p_facilitator_name,''))
  returning * into s;

  insert into public.slots (session_id, n, title, state) values
    (p_id, 1, 'Слот 1', 'active'),
    (p_id, 2, 'Слот 2', 'wait'),
    (p_id, 3, 'Слот 3', 'wait');

  return s;
end;
$$;

create or replace function public.next_slot(p_session_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cur int;
begin
  select active_slot into cur from public.sessions where id = p_session_id for update;
  if cur is null then return false; end if;

  update public.slots set state = 'done' where session_id = p_session_id and n = cur;
  if cur >= 3 then
    return false;
  end if;

  update public.slots set state = 'active' where session_id = p_session_id and n = cur + 1;
  update public.sessions set active_slot = cur + 1, stage_started_at = now(), paused = false, paused_at = null, paused_accum_ms = 0
    where id = p_session_id;
  return true;
end;
$$;

create or replace function public.next_stage(p_session_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sessions
  set stage = least(stage + 1, 5),
      stage_started_at = now(),
      paused = false,
      paused_at = null,
      paused_accum_ms = 0
  where id = p_session_id;
end;
$$;

create or replace function public.toggle_pause(p_session_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.sessions;
begin
  select * into s from public.sessions where id = p_session_id for update;
  if s.paused then
    update public.sessions
    set paused = false,
        paused_accum_ms = paused_accum_ms + extract(epoch from (now() - s.paused_at)) * 1000,
        paused_at = null
    where id = p_session_id;
  else
    update public.sessions set paused = true, paused_at = now() where id = p_session_id;
  end if;
end;
$$;

create or replace function public.add_idea(
  p_session_id text,
  p_author text,
  p_text text
) returns public.ideas
language plpgsql
security definer
set search_path = public
as $$
declare
  next_n int;
  i public.ideas;
begin
  select coalesce(max(n), 0) + 1 into next_n from public.ideas where session_id = p_session_id;
  insert into public.ideas (session_id, n, author, text)
  values (p_session_id, next_n, p_author, p_text)
  returning * into i;
  return i;
end;
$$;

create or replace function public.accept_candidate(
  p_candidate_id uuid,
  p_author text default null,
  p_text text default null
) returns public.ideas
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.idea_candidates;
  i public.ideas;
  next_n int;
begin
  select * into c from public.idea_candidates where id = p_candidate_id;
  if c is null then raise exception 'candidate not found'; end if;

  select coalesce(max(n), 0) + 1 into next_n from public.ideas where session_id = c.session_id;
  insert into public.ideas (session_id, n, author, text)
  values (c.session_id, next_n, coalesce(p_author, c.author, ''), coalesce(p_text, c.text))
  returning * into i;

  delete from public.idea_candidates where id = p_candidate_id;
  return i;
end;
$$;

create or replace function public.toggle_idea_mark(p_idea_id uuid, p_mark text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cur text;
begin
  select mark into cur from public.ideas where id = p_idea_id for update;
  if cur is not distinct from p_mark then
    update public.ideas set mark = null where id = p_idea_id;
  else
    update public.ideas set mark = p_mark where id = p_idea_id;
  end if;
end;
$$;

create or replace function public.add_step(
  p_session_id text,
  p_title text,
  p_detail text default '',
  p_first_step text default '',
  p_due text default '',
  p_idea_refs jsonb default '[]'::jsonb
) returns public.steps
language plpgsql
security definer
set search_path = public
as $$
declare
  next_n int;
  s public.steps;
begin
  select coalesce(max(n), 0) + 1 into next_n from public.steps where session_id = p_session_id;
  insert into public.steps (session_id, n, title, detail, first_step, due, idea_refs)
  values (p_session_id, next_n, p_title, coalesce(p_detail,''), coalesce(p_first_step,''), coalesce(p_due,''), coalesce(p_idea_refs,'[]'::jsonb))
  returning * into s;
  return s;
end;
$$;

create or replace function public.remove_step(p_step_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.steps where id = p_step_id;
end;
$$;
