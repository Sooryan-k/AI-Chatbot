# ZooperChat

A ChatGPT-style AI chat app with a custom **emerald** theme. Chats are saved to
the cloud (Supabase PostgreSQL) behind email magic-link sign-in, so your history
follows you across devices. Built with Next.js 16 (App Router), the Vercel AI
SDK v6, Tailwind CSS v4, and an OpenAI-compatible model provider (OpenRouter by
default). Deploys to Vercel.

## Features

- ChatGPT-style layout: sidebar, chat area, composer, responsive on phone to desktop
- Streaming responses, token by token, with a Stop button
- Email magic-link auth (Supabase) so chats sync across devices
- Cloud storage in Supabase PostgreSQL with Row-Level Security (each user sees only their own data)
- Projects to group related chats, plus rename and delete
- Short share links: a read-only snapshot anyone can open, no account needed
- **Voice mode**: dictate prompts and have replies read aloud, with an optional
  hands-free loop, all on free browser speech APIs (no paid TTS/STT)
- **Live collaborative rooms**: share a link so others can join and chat with the
  AI together in real time, with live presence, powered by Supabase Realtime
- Markdown rendering with syntax-highlighted code blocks and copy buttons
- Dark and light mode (emerald palette in both)

## Architecture at a glance

The browser talks to two backends: the model provider (for streaming replies)
and Supabase (for auth + storage). The Next.js server is thin.

```
Browser (React client)
  ├─ POST /api/chat ─────────────► model provider (OpenRouter)   streaming reply
  ├─ Supabase JS (anon key) ─────► Supabase Postgres              chats, projects, shares
  └─ magic-link sign-in ─────────► Supabase Auth                  session cookie
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
  stores nothing; the client saves messages to Supabase.
- **Share links:** a snapshot is stored once in the `shared_chats` table and the
  link carries only a short id (`/share/<id>`), readable by anyone.
- **Voice mode:** the browser Web Speech API handles speech-to-text and
  `speechSynthesis` handles text-to-speech, wired into the chat from event
  callbacks. Nothing leaves the browser; feature-detected so it hides where
  unsupported.
- **Live rooms:** a room (`rooms` + `room_messages` tables) is a real-time chat
  any signed-in user can join via `/room/<id>`. Messages sync through Supabase
  Realtime (Postgres Changes) and Presence shows who is online; the sender's
  client calls `/api/room-reply` and persists the answer for everyone.

## Project structure

```
app/
  api/chat/route.ts        streaming chat endpoint (model provider)
  api/room-reply/route.ts  non-streaming reply for live rooms
  auth/login/page.tsx      magic-link sign-in screen
  auth/callback/route.ts   exchanges the magic-link code for a session
  auth/logout/route.ts     signs out
  c/[id]/page.tsx          a single conversation
  room/[id]/page.tsx       live collaborative room (realtime + presence)
  share/[id]/page.tsx      public read-only shared view
  layout.tsx               fonts, theme + auth providers, app shell
  page.tsx                 redirects to a fresh chat id
lib/
  supabase/client.ts       browser Supabase client
  supabase/server.ts       server Supabase client (route handlers, proxy)
  storage.ts               Supabase CRUD for chats and projects
  use-conversations.ts     reactive chats store (optimistic + Supabase)
  use-projects.ts          reactive projects store
  share.ts                 store/fetch share snapshots, build short links
  rooms.ts                 create/fetch/insert live-room messages
  use-room.ts              room realtime: postgres changes + presence
  use-speech-recognition.ts  speech-to-text hook (Web Speech API)
  use-speech-synthesis.ts    text-to-speech hook (speechSynthesis)
  provider.ts              configures the model from env
providers/
  auth-provider.tsx        single source of auth state + per-user store refresh
  theme-provider.tsx       dark / light theme provider
components/
  layout/                  app shell, top bar, theme toggle
  sidebar/                 sidebar, project + chat items, account menu
  chat/                    chat container, message list, message, composer, markdown, voice buttons
  share/                   share button, dialog, shared view
  room/                    start-session button
proxy.ts                   auth proxy (runs before page requests)
supabase-schema.sql        tables + Row-Level Security to run in Supabase
```

## Setup

### 1. Create the Supabase tables

In your Supabase project, open **SQL Editor** and run the contents of
[`supabase-schema.sql`](supabase-schema.sql). This creates the `projects`,
`conversations`, `shared_chats`, `rooms`, and `room_messages` tables with
Row-Level Security, and enables Supabase Realtime on `room_messages` (required
for live collaborative rooms).

### 2. Configure auth redirect URLs

In Supabase, go to **Authentication → URL Configuration** and add your callback
URLs:

```
http://localhost:3000/auth/callback
https://your-app.vercel.app/auth/callback
```

### 3. Custom email sender (recommended)

Supabase's built-in mailer is rate-limited to a few emails per hour. To send
magic links reliably, add custom SMTP under **Authentication → SMTP Settings**
(for example Gmail SMTP, or Resend with a verified domain).

### 4. Environment variables

Settings live in `.env.local` (gitignored). You need the model provider and
Supabase values:

```bash
# Model provider (OpenRouter, or any OpenAI-compatible API)
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=cohere/north-mini-code:free   # any model your key can use
AI_API_KEY=sk-or-v1-...                # from https://openrouter.ai/keys

# Supabase (Project Settings → API). The anon key is safe in the browser.
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. You will be sent to the sign-in page; enter your
email, click the magic link, and your chats will save to Supabase.

## Deploy to Vercel

1. Push this repo to GitHub and import it at https://vercel.com.
2. In the Vercel project's **Environment Variables**, add the same five vars
   above (`AI_*` and `NEXT_PUBLIC_SUPABASE_*`).
3. Add your production callback URL in Supabase (step 2 above).
4. Deploy. `.env.local` is gitignored, so secrets live only in Vercel.

## Build

```bash
npm run build && npm start
```
