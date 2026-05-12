-- ═════════════════════════════════════════════════════════════════════
-- Мастермайнд · схема БД
-- ═════════════════════════════════════════════════════════════════════
-- Принципы:
-- 1) Каждая логическая сущность — отдельная таблица. Realtime подписки
--    точечные, не на весь session.
-- 2) Идентификатор сессии — короткий человекочитаемый код (text, 6 симв.).
-- 3) RLS открыт на чтение/запись всем — для прототипа без авторизации.
--    В проде заменить на политики по anon-токену или auth.users.
-- 4) Таймер не пишем в БД. Каждый клиент локально вычисляет:
--      elapsed = now() - stage_started_at - paused_accum_ms
--    И обновляется раз в секунду таймером в браузере.
-- ═════════════════════════════════════════════════════════════════════

-- ───────── СЕССИИ ─────────
create table if not exists public.sessions (
  id                text primary key,
  owner_name        text not null default 'Михаил',
  facilitator_name  text not null default 'Фасилитатор',
  stage             smallint not null default 1 check (stage between 1 and 5),
  active_slot       smallint not null default 1 check (active_slot between 1 and 3),
  paused            boolean  not null default false,
  stage_started_at  timestamptz not null default now(),
  paused_at         timestamptz,
  paused_accum_ms   bigint   not null default 0,
  notes             text     not null default '',
  ai_questions      text[]   not null default '{}',
  clusters          jsonb,                 -- [{title, ideaIds:[..]}, ...] | null
  pending_chunk     text     not null default '', -- буфер для распознавания идей
  created_at        timestamptz not null default now()
);

-- ───────── СЛОТЫ ПОДЭТАПА 1 ─────────
create table if not exists public.slots (
  session_id  text references public.sessions(id) on delete cascade,
  n           smallint not null check (n between 1 and 3),
  title       text not null,
  state       text not null default 'wait' check (state in ('wait','active','done')),
  transcript  text not null default '',
  summary     text not null default '',
  primary key (session_id, n)
);

-- ───────── ИДЕИ ─────────
create table if not exists public.ideas (
  id          uuid primary key default gen_random_uuid(),
  session_id  text references public.sessions(id) on delete cascade,
  n           int  not null,
  author      text not null,
  text        text not null,
  mark        text check (mark in ('spark','q')),  -- null = без метки
  created_at  timestamptz not null default now(),
  unique (session_id, n)
);
create index if not exists idx_ideas_session on public.ideas (session_id, n);

-- ───────── КАНДИДАТЫ ИДЕЙ (от ИИ, ждут принятия) ─────────
create table if not exists public.idea_candidates (
  id          uuid primary key default gen_random_uuid(),
  session_id  text references public.sessions(id) on delete cascade,
  text        text not null,
  author      text,
  confidence  real not null default 0.7,
  created_at  timestamptz not null default now()
);
create index if not exists idx_candidates_session on public.idea_candidates (session_id, created_at);

-- ───────── ВОПРОСЫ УЧАСТНИКОВ ─────────
create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  session_id  text references public.sessions(id) on delete cascade,
  author      text not null,
  text        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_questions_session on public.questions (session_id, created_at);

-- ───────── ШАГИ «ЧТО БЕРУ В РАБОТУ» ─────────
create table if not exists public.steps (
  id          uuid primary key default gen_random_uuid(),
  session_id  text references public.sessions(id) on delete cascade,
  n           smallint not null,
  title       text not null,
  detail      text not null default '',
  first_step  text not null default '',
  due         text not null default '',
  idea_refs   int[] not null default '{}',
  created_at  timestamptz not null default now(),
  unique (session_id, n)
);
create index if not exists idx_steps_session on public.steps (session_id, n);

-- ───────── УЧАСТНИКИ ─────────
create table if not exists public.participants (
  id          uuid primary key default gen_random_uuid(),
  session_id  text references public.sessions(id) on delete cascade,
  name        text not null,
  joined_at   timestamptz not null default now()
);
create index if not exists idx_participants_session on public.participants (session_id);

-- ═════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═════════════════════════════════════════════════════════════════════
-- Включаем RLS на всех таблицах. Для прототипа — открытый доступ.
-- В проде: заменить на политики по anon-токену или auth.users.
-- ═════════════════════════════════════════════════════════════════════

alter table public.sessions         enable row level security;
alter table public.slots            enable row level security;
alter table public.ideas            enable row level security;
alter table public.idea_candidates  enable row level security;
alter table public.questions        enable row level security;
alter table public.steps            enable row level security;
alter table public.participants     enable row level security;

-- Открытые политики (anyone can read/write) — для прототипа.
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'sessions','slots','ideas','idea_candidates',
      'questions','steps','participants'
    ])
  loop
    execute format('drop policy if exists "anyone read %1$s" on public.%1$s', t);
    execute format('drop policy if exists "anyone write %1$s" on public.%1$s', t);
    execute format('create policy "anyone read %1$s" on public.%1$s for select using (true)', t);
    execute format('create policy "anyone write %1$s" on public.%1$s for all using (true) with check (true)', t);
  end loop;
end $$;

-- ═════════════════════════════════════════════════════════════════════
-- REALTIME
-- ═════════════════════════════════════════════════════════════════════
-- Все таблицы публикуются в supabase_realtime, чтобы клиенты могли
-- подписываться на изменения через postgres_changes.
-- ═════════════════════════════════════════════════════════════════════

-- replica identity full — чтобы события UPDATE содержали полную строку
alter table public.sessions        replica identity full;
alter table public.slots           replica identity full;
alter table public.ideas           replica identity full;
alter table public.idea_candidates replica identity full;
alter table public.questions       replica identity full;
alter table public.steps           replica identity full;
alter table public.participants    replica identity full;

-- добавляем в публикацию (если ещё нет)
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'sessions','slots','ideas','idea_candidates',
      'questions','steps','participants'
    ])
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ═════════════════════════════════════════════════════════════════════
-- ХЕЛПЕРЫ
-- ═════════════════════════════════════════════════════════════════════

-- Создание сессии: вставляет запись + 3 слота за один RPC-вызов.
-- Возвращает строку sessions.
create or replace function public.create_session(
  p_id text,
  p_owner_name text default 'Михаил',
  p_facilitator_name text default 'Фасилитатор'
) returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.sessions;
begin
  insert into public.sessions (id, owner_name, facilitator_name)
  values (p_id, p_owner_name, p_facilitator_name)
  returning * into s;

  insert into public.slots (session_id, n, title, state) values
    (p_id, 1, 'Ситуация',         'active'),
    (p_id, 2, 'Что пробовал',     'wait'),
    (p_id, 3, 'Вопрос к группе',  'wait');

  return s;
end $$;

-- Перевод на следующий слот: завершает текущий, активирует следующий.
-- Возвращает true, если слоты ещё были; false — если все 3 закрыты.
create or replace function public.next_slot(p_session_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_slot smallint;
begin
  select active_slot into cur_slot from public.sessions where id = p_session_id;
  if cur_slot is null then
    return false;
  end if;

  update public.slots set state = 'done' where session_id = p_session_id and n = cur_slot;

  if cur_slot >= 3 then
    return false;
  end if;

  update public.slots set state = 'active' where session_id = p_session_id and n = cur_slot + 1;
  update public.sessions set active_slot = cur_slot + 1 where id = p_session_id;
  return true;
end $$;

-- Перевод на следующий подэтап: сбрасывает таймер, паузы, статус.
create or replace function public.next_stage(p_session_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sessions set
    stage = least(stage + 1, 5),
    stage_started_at = now(),
    paused = false,
    paused_at = null,
    paused_accum_ms = 0
  where id = p_session_id;
end $$;

-- Тоггл паузы: при включении сохраняет paused_at; при снятии прибавляет к accum.
create or replace function public.toggle_pause(p_session_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.sessions%rowtype;
begin
  select * into s from public.sessions where id = p_session_id;
  if s.paused then
    update public.sessions
      set paused = false,
          paused_accum_ms = paused_accum_ms + (extract(epoch from (now() - s.paused_at)) * 1000)::bigint,
          paused_at = null
      where id = p_session_id;
  else
    update public.sessions
      set paused = true, paused_at = now()
      where id = p_session_id;
  end if;
end $$;

-- Установка/тоггл метки на идее.
create or replace function public.toggle_idea_mark(p_idea_id uuid, p_mark text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cur text;
begin
  select mark into cur from public.ideas where id = p_idea_id;
  if cur = p_mark then
    update public.ideas set mark = null where id = p_idea_id;
  else
    update public.ideas set mark = p_mark where id = p_idea_id;
  end if;
end $$;

-- Принять кандидата: создаёт идею, удаляет кандидата.
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
  c public.idea_candidates%rowtype;
  next_n int;
  new_idea public.ideas%rowtype;
begin
  select * into c from public.idea_candidates where id = p_candidate_id;
  if c.id is null then
    raise exception 'candidate not found';
  end if;

  select coalesce(max(n), 0) + 1 into next_n from public.ideas where session_id = c.session_id;

  insert into public.ideas (session_id, n, author, text)
  values (
    c.session_id,
    next_n,
    coalesce(p_author, c.author, 'неизвестно'),
    coalesce(p_text, c.text)
  )
  returning * into new_idea;

  delete from public.idea_candidates where id = p_candidate_id;
  return new_idea;
end $$;

-- Добавить идею вручную с автонумерацией.
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
  new_idea public.ideas%rowtype;
begin
  select coalesce(max(n), 0) + 1 into next_n from public.ideas where session_id = p_session_id;
  insert into public.ideas (session_id, n, author, text)
  values (p_session_id, next_n, p_author, p_text)
  returning * into new_idea;
  return new_idea;
end $$;

-- Добавить шаг с автонумерацией.
create or replace function public.add_step(
  p_session_id text,
  p_title text,
  p_detail text default '',
  p_first_step text default '',
  p_due text default '',
  p_idea_refs int[] default '{}'
) returns public.steps
language plpgsql
security definer
set search_path = public
as $$
declare
  next_n smallint;
  new_step public.steps%rowtype;
begin
  select coalesce(max(n), 0) + 1 into next_n from public.steps where session_id = p_session_id;
  insert into public.steps (session_id, n, title, detail, first_step, due, idea_refs)
  values (p_session_id, next_n, p_title, p_detail, p_first_step, p_due, p_idea_refs)
  returning * into new_step;
  return new_step;
end $$;

-- Удаление шага с переномерацией.
create or replace function public.remove_step(p_step_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sid text;
begin
  select session_id into sid from public.steps where id = p_step_id;
  delete from public.steps where id = p_step_id;
  -- переномерация
  with renumbered as (
    select id, row_number() over (order by n) as new_n
    from public.steps where session_id = sid
  )
  update public.steps s set n = r.new_n::smallint
  from renumbered r
  where s.id = r.id;
end $$;
