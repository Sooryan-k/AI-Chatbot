# ZooperChat

A ChatGPT-style AI chat app with a custom **emerald** theme. Chats are saved to
the cloud (Supabase PostgreSQL) behind Google or email magic-link sign-in, so
your history follows you across devices. It goes beyond single-player chat with
**live collaborative rooms** and a **Facilitator agent** that recaps the
discussion and tracks action items for the whole room. Built with Next.js 16
(App Router), the Vercel AI SDK v6, Tailwind CSS v4, and an OpenAI-compatible
model provider (OpenRouter by default). Deploys to Vercel.

## Features

- ChatGPT-style layout: sidebar, chat area, composer, responsive on phone to desktop
- Streaming responses, token by token, with a Stop button
- Sign in with Google or an email magic link (Supabase Auth) so chats sync across devices
- Cloud storage in Supabase PostgreSQL with Row-Level Security (each user sees only their own data)
- Projects to group related chats, plus rename and delete
- An **agent menu** in every chat: one tap to summarize the conversation, pull out
  action items, surface risks and blind spots, or get concrete next steps — the
  reply streams inline like any other message
- Short share links: a read-only snapshot anyone can open, no account needed
- **Voice mode**: dictate prompts and have replies read aloud, with an optional
  hands-free loop, all on free browser speech APIs (no paid TTS/STT)
- **Live collaborative rooms** (multiplayer AI), powered by Supabase Realtime:
  - share a link so others can join and chat with the AI together in real time
  - a modern group-chat UI: own messages right, others left with colored avatars
  - a chosen username (not your email), changeable anytime, shown live everywhere
  - presence roster, "x joined the chat" notices, and a join chime
  - typing indicators broadcast as people type
  - an AI toggle: on = ask the AI, off = chat with people only
  - "AI listen" memory: pin specific messages for the AI to read on follow-ups
  - shared **Highlights**: save an important answer (question + answer) for the
    whole room to find later; toggle save/remove, syncs live
  - a **Facilitator agent**: on demand it reads the room and posts a shared,
    structured recap — TL;DR, decisions, action items, and open questions — plus
    a collaborative action-item **checklist** everyone can tick off in real time
  - Facilitator **tools** (results shown only to you): **Catch me up** (what you
    missed, summarized in your own language), **Risks** (blind spots and shaky
    assumptions), and **Next steps**; plus **Name room**, where the AI titles the
    room from the conversation and the new name updates live for everyone
  - export a recap and its open tasks as a Markdown file
  - share any single message as a read-only link
  - a Live sessions history list with a live "people here" count per room; Home
    keeps a room, Leave drops it
- Hover (or keyboard-focus) tooltips throughout the room that explain what each
  feature does
- Markdown rendering with syntax-highlighted code blocks and copy buttons
- Dark and light mode (emerald palette in both)
- Installable as a PWA (web app manifest, app icon, and a generated social
  preview image)

Everything runs on free tiers: the existing OpenRouter model powers the
Facilitator (no tool-calling, embeddings, or paid APIs), and Supabase's free tier
stores and streams it.

## Architecture at a glance

The browser talks to two backends: the model provider (for streaming replies)
and Supabase (for auth + storage). The Next.js server is thin.

```
Browser (React client)
  ├─ POST /api/chat ─────────────► model provider (OpenRouter)   streaming reply
  ├─ Supabase JS (anon key) ─────► Supabase Postgres              chats, projects, shares
  └─ Google / magic-link sign-in ► Supabase Auth                  session cookie
```

- **Auth gate:** `proxy.ts` (Next 16 renamed `middleware.ts`) runs on page
  requests, refreshes the session, and redirects signed-out users to
  `/auth/login`. `providers/auth-provider.tsx` holds the client auth state and
  `components/layout/app-shell.tsx` does the same check on the client, so the UI
  never renders for a signed-out user. API routes are excluded from the proxy
  and authenticate themselves.
- **Data:** the client reads/writes Supabase directly using the public anon key.
  Row-Level Security (defined in `supabase-schema.sql`) is what actually keeps
  each user's rows private, so the anon key is safe to ship to the browser.
- **Chat streaming:** `app/api/chat/route.ts` requires a signed-in user, then
  forwards the message history to the provider and streams the reply back. It
  stores nothing; the client saves messages to Supabase. The composer's **agent
  menu** (`components/chat/agent-menu.tsx`, prompts in `lib/chat-agent.ts`) rides
  this same path: each action sends a short, expert-phrased instruction over the
  current thread, so the answer streams inline and persists like any message — no
  extra route or storage.
- **Share links:** a snapshot is stored once in the `shared_chats` table and the
  link carries only a short id (`/share/<id>`), readable by anyone.
- **Voice mode:** the browser Web Speech API handles speech-to-text and
  `speechSynthesis` handles text-to-speech, wired into the chat from event
  callbacks. Nothing leaves the browser; feature-detected so it hides where
  unsupported.
- **Live rooms:** a room (`rooms`, `room_messages`, `room_members`,
  `room_highlights`, `room_reports`, `room_tasks` tables) is a real-time chat any
  signed-in user can join via `/room/<id>`. Messages sync through Supabase
  Realtime Postgres Changes; Presence drives the online roster, join notices, and
  live usernames; Broadcast carries typing events. A shared `rooms-lobby`
  presence channel lets the sidebar show a live "people here" count per room
  without joining each one. A username lives in auth user metadata (no email
  shown). When the AI toggle is on the sender's client calls `/api/room-reply`
  (its context is the AI thread plus any messages pinned via "AI listen") and
  persists the answer for everyone. Saved **Highlights** (question + answer) are
  stored per room and stream to everyone.
- **Facilitator agent:** `app/api/facilitator/route.ts` is a signed-in,
  non-streaming endpoint with a `mode` parameter. `recap` returns a structured
  JSON recap; `catchup` / `risks` / `nextsteps` return localized Markdown for the
  requester only; `title` returns a short room name. Because free models are not
  reliable at strict tool-calling, the recap is asked for as plain JSON and
  parsed defensively (first `{` to last `}`, with a fallback). Recaps persist to
  `room_reports` and action items become shared `room_tasks`; both stream to the
  room via Realtime, as do room renames (an UPDATE on `rooms`), so every header
  and history list stays current. `lib/facilitator.ts` builds the transcript
  (recent messages, capped for a small context window) and calls the route;
  `lib/use-facilitator.ts` subscribes to the reports/tasks changes.

## Project structure

```
app/
  api/chat/route.ts          streaming chat endpoint (model provider)
  api/room-reply/route.ts    non-streaming reply for live rooms
  api/facilitator/route.ts   Facilitator agent: recap / catchup / risks / next / title
  auth/login/page.tsx        Google + magic-link sign-in screen
  auth/callback/route.ts     exchanges the OAuth / magic-link code for a session
  auth/logout/route.ts       signs out
  c/[id]/page.tsx            a single conversation
  room/[id]/page.tsx         live collaborative room (realtime + presence)
  share/[id]/page.tsx        public read-only shared view
  layout.tsx                 fonts, metadata, theme + auth providers, app shell
  page.tsx                   redirects to a fresh chat id
  manifest.ts                web app manifest (installable PWA)
  apple-icon.tsx / opengraph-image.tsx   generated app icon + social preview
lib/
  supabase/client.ts         browser Supabase client
  supabase/server.ts         server Supabase client (route handlers, proxy)
  supabase/cookie-options.ts persistent-session cookie lifetime
  storage.ts                 Supabase CRUD for chats and projects
  use-conversations.ts       reactive chats store (optimistic + Supabase)
  use-projects.ts            reactive projects store
  share.ts                   store/fetch share snapshots, build short links
  use-share.ts               share-dialog state + snapshot creation
  rooms.ts                   live-room messages, membership, history, highlights, title
  use-room.ts                room realtime: messages, presence, typing, notices, title
  use-rooms.ts               the user's Live sessions history list
  use-room-highlights.ts     a room's shared Highlights (realtime)
  facilitator.ts             Facilitator data layer: transcript, recap, tools, tasks
  use-facilitator.ts         a room's recaps + shared checklist (realtime)
  chat-agent.ts              one-tap agent actions for a normal chat (prompts)
  use-live-counts.ts         live "people here" count per room (lobby presence)
  room-presence.ts           shared rooms-lobby channel name
  profile.ts                 username get/set (auth user metadata)
  sound.ts                   synthesized join chime (Web Audio)
  use-speech-recognition.ts  speech-to-text hook (Web Speech API)
  use-speech-synthesis.ts    text-to-speech hook (speechSynthesis)
  use-mounted.ts             SSR-safe "has mounted" flag
  provider.ts                configures the model from env
  types.ts                   shared types (ChatMessage, Conversation, Project)
  utils.ts                   helpers: id generation, class merge, message text
providers/
  auth-provider.tsx          single source of auth state + per-user store refresh
  theme-provider.tsx         dark / light theme provider
components/
  layout/                    app shell, top bar, theme toggle
  sidebar/                   sidebar, project + chat items, new-project dialog, account menu
  chat/                      chat container, message list, message, composer, code block,
                             markdown, empty state, voice buttons, agent menu
  share/                     share button, dialog, shared view
  room/                      start-session button, username gate, AI controls, facilitator panel
  ui/                        shared primitives (modal, hover tooltip)
proxy.ts                     auth proxy (runs before page requests)
supabase-schema.sql          tables + Row-Level Security to run in Supabase
```

## Setup

### 1. Create the Supabase tables

In your Supabase project, open **SQL Editor** and run the contents of
[`supabase-schema.sql`](supabase-schema.sql). This creates the `projects`,
`conversations`, `shared_chats`, `rooms`, `room_messages`, `room_members`,
`room_highlights`, `room_reports`, and `room_tasks` tables with Row-Level
Security, and enables Supabase Realtime on `rooms`, `room_messages`,
`room_highlights`, `room_reports`, and `room_tasks` (required for live rooms,
shared Highlights, and the Facilitator's recaps, checklist, and live room
renames). Usernames for live chat are stored in Supabase auth user metadata, so
they need no table. The file is idempotent — re-running it to add the newer
Facilitator tables is safe.

### 2. Configure auth redirect URLs

In Supabase, go to **Authentication → URL Configuration** and add your callback
URLs:

```
http://localhost:3000/auth/callback
https://your-app.vercel.app/auth/callback
```

### 3. Enable Google sign-in (optional)

To offer "Continue with Google", create an OAuth client in **Google Cloud
Console** (Web application) with the redirect URI
`https://<project-ref>.supabase.co/auth/v1/callback`, then enable the **Google**
provider under **Authentication → Providers** in Supabase and paste the client
id + secret. The login screen falls back to the email magic link if Google is
not configured.

### 4. Custom email sender (recommended for magic links)

Supabase's built-in mailer is rate-limited to a few emails per hour. To send
magic links reliably, add custom SMTP under **Authentication → SMTP Settings**
(for example Gmail SMTP, or Resend with a verified domain).

### 5. Environment variables

Settings live in `.env.local` (gitignored). You need the model provider and
Supabase values:

```bash
# Model provider (OpenRouter, or any OpenAI-compatible API)
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=cohere/north-mini-code:free   # any model your key can use
AI_API_KEY=sk-or-v1-...                # from https://openrouter.ai/keys
AI_SITE_URL=http://localhost:3000      # optional: OpenRouter attribution header

# Supabase (Project Settings → API). The anon key is safe in the browser.
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

`AI_BASE_URL` and `AI_SITE_URL` are optional (they default to OpenRouter and
`http://localhost:3000`); the model, API key, and both Supabase values are
required.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. You will be sent to the sign-in page; enter your
email, click the magic link, and your chats will save to Supabase.

## Deploy to Vercel

1. Push this repo to GitHub and import it at https://vercel.com.
2. In the Vercel project's **Environment Variables**, add the vars above
   (`AI_*` and `NEXT_PUBLIC_SUPABASE_*`); set `AI_SITE_URL` to your production
   URL.
3. Add your production callback URL in Supabase (step 2 above).
4. Deploy. `.env.local` is gitignored, so secrets live only in Vercel.

## Build

```bash
npm run build && npm start
```
