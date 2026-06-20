-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ── Projects ──────────────────────────────────────────────────────────────────
create table if not exists projects (
  id          text        primary key,
  user_id     uuid        references auth.users not null,
  name        text        not null,
  color       text,
  created_at  bigint      not null,
  updated_at  bigint      not null
);

alter table projects enable row level security;

create policy "Users own their projects"
  on projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Conversations ─────────────────────────────────────────────────────────────
create table if not exists conversations (
  id          text        primary key,
  user_id     uuid        references auth.users not null,
  project_id  text        references projects(id) on delete set null,
  title       text        not null default 'New chat',
  messages    jsonb       not null default '[]',
  created_at  bigint      not null,
  updated_at  bigint      not null
);

alter table conversations enable row level security;

create policy "Users own their conversations"
  on conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for fast sidebar queries (ordered by updated_at per user)
create index if not exists conversations_user_updated
  on conversations (user_id, updated_at desc);

create index if not exists conversations_project
  on conversations (project_id);
