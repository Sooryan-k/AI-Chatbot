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

-- ── Shared chats ──────────────────────────────────────────────────────────────
-- Read-only snapshots behind a short share link. Anyone with the link (even
-- signed-out) can read; only the signed-in owner can create or delete.
create table if not exists shared_chats (
  id          text        primary key,
  user_id     uuid        references auth.users not null,
  payload     jsonb       not null,
  created_at  bigint      not null
);

alter table shared_chats enable row level security;

create policy "Anyone can read a shared chat"
  on shared_chats for select
  using (true);

create policy "Users can create their own shares"
  on shared_chats for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own shares"
  on shared_chats for delete
  using (auth.uid() = user_id);

-- ── Live collaborative rooms ──────────────────────────────────────────────────
-- A room is a real-time chat any signed-in user can join via its link. Room ids
-- are random and unguessable; access is link-based, like the share feature.
-- (A future room_members table could restrict reads to invited users.)
create table if not exists rooms (
  id          text        primary key,
  host_id     uuid        references auth.users not null,
  title       text        not null default 'Live chat',
  created_at  bigint      not null
);

create table if not exists room_messages (
  id          text        primary key,
  room_id     text        references rooms(id) on delete cascade not null,
  sender_id   uuid        references auth.users,
  sender_name text,
  role        text        not null,   -- 'user' | 'assistant'
  content     text        not null,
  to_ai       boolean     not null default false,  -- was this addressed to the AI?
  created_at  bigint      not null
);
-- if room_messages already exists, add the column:
--   alter table room_messages add column if not exists to_ai boolean not null default false;

alter table rooms enable row level security;
alter table room_messages enable row level security;

-- Any signed-in user with the link can read and join a room.
create policy "Signed-in users can read rooms"
  on rooms for select to authenticated using (true);

create policy "Users can create rooms they host"
  on rooms for insert to authenticated with check (auth.uid() = host_id);

-- Anyone in a room can rename it (the Facilitator's "name this room").
create policy "Signed-in users can rename rooms"
  on rooms for update to authenticated using (true) with check (true);

-- Stream room renames so everyone's header/history updates live.
alter publication supabase_realtime add table rooms;

create policy "Signed-in users can read room messages"
  on room_messages for select to authenticated using (true);

-- Senders post their own user messages; assistant rows have a null sender.
create policy "Signed-in users can post room messages"
  on room_messages for insert to authenticated
  with check (auth.uid() = sender_id or sender_id is null);

create index if not exists room_messages_room_created
  on room_messages (room_id, created_at);

-- Stream inserts to all participants in real time.
alter publication supabase_realtime add table room_messages;

-- ── Room membership ───────────────────────────────────────────────────────────
-- One row per (room, user) that the user has joined. Powers the "Live sessions"
-- history list so people can return to rooms they have been in. Usernames are
-- stored in auth user metadata, not here.
create table if not exists room_members (
  room_id    text   references rooms(id) on delete cascade not null,
  user_id    uuid   references auth.users not null,
  joined_at  bigint not null,
  primary key (room_id, user_id)
);

alter table room_members enable row level security;

create policy "Signed-in users can read room members"
  on room_members for select to authenticated using (true);

create policy "Users can join rooms as themselves"
  on room_members for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own membership"
  on room_members for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- leaving a room removes the membership (and the room from the history list).
create policy "Users can leave rooms"
  on room_members for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists room_members_user_joined
  on room_members (user_id, joined_at desc);

-- ── Room highlights ───────────────────────────────────────────────────────────
-- Important AI answers saved from a live room into a shared "Highlights"
-- collection. The question and answer are both stored, and every signed-in user
-- can read a room's highlights (so the whole room shares them).
create table if not exists room_highlights (
  id            text   primary key,
  room_id       text   references rooms(id) on delete cascade not null,
  question      text   not null,
  answer        text   not null,
  saved_by      uuid   references auth.users,
  saved_by_name text,
  created_at    bigint not null
);

alter table room_highlights enable row level security;

create policy "Signed-in users can read room highlights"
  on room_highlights for select to authenticated using (true);

create policy "Users can save highlights"
  on room_highlights for insert to authenticated
  with check (auth.uid() = saved_by);

create policy "Users can remove their own highlights"
  on room_highlights for delete to authenticated
  using (auth.uid() = saved_by);

create index if not exists room_highlights_room_created
  on room_highlights (room_id, created_at desc);

-- Stream saved highlights to everyone in the room in real time.
alter publication supabase_realtime add table room_highlights;

-- ── Facilitator: recaps + action-item tasks ───────────────────────────────────
-- The Facilitator agent reads a room's conversation and produces a structured
-- recap (stored as jsonb). Recaps are shared with everyone in the room.
create table if not exists room_reports (
  id             text   primary key,
  room_id        text   references rooms(id) on delete cascade not null,
  content        jsonb  not null,   -- { tldr, decisions[], actionItems[], openQuestions[] }
  created_by     uuid   references auth.users,
  created_by_name text,
  created_at     bigint not null
);

alter table room_reports enable row level security;

create policy "Signed-in users can read room reports"
  on room_reports for select to authenticated using (true);

create policy "Users can create room reports"
  on room_reports for insert to authenticated
  with check (auth.uid() = created_by);

create index if not exists room_reports_room_created
  on room_reports (room_id, created_at desc);

alter publication supabase_realtime add table room_reports;

-- A shared, collaborative action-item checklist. Anyone in the room can add,
-- tick off, or remove tasks.
create table if not exists room_tasks (
  id         text    primary key,
  room_id    text    references rooms(id) on delete cascade not null,
  text       text    not null,
  owner      text,
  done       boolean not null default false,
  created_at bigint  not null
);

alter table room_tasks enable row level security;

create policy "Signed-in users can read room tasks"
  on room_tasks for select to authenticated using (true);

create policy "Signed-in users can add room tasks"
  on room_tasks for insert to authenticated with check (true);

create policy "Signed-in users can update room tasks"
  on room_tasks for update to authenticated using (true) with check (true);

create policy "Signed-in users can remove room tasks"
  on room_tasks for delete to authenticated using (true);

create index if not exists room_tasks_room_created
  on room_tasks (room_id, created_at desc);

alter publication supabase_realtime add table room_tasks;
