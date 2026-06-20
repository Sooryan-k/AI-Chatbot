# EmeraldChat

A ChatGPT-style chat interface with a custom **emerald** theme, powered by
**[OpenRouter](https://openrouter.ai)** (an OpenAI-compatible API, with free
models). Built with Next.js (App Router), the Vercel AI SDK v6, and Tailwind
CSS v4. Deploys to Vercel as-is.

## Features

- 💬 ChatGPT-style layout — collapsible sidebar, chat area, and composer
- 🌊 **Streaming** responses, token-by-token (with a Stop button)
- 🗂️ **Conversation history** in the sidebar, grouped by date, with rename & delete
- 📝 **Markdown** rendering with syntax-highlighted code blocks + copy buttons
- 🌗 **Dark / light** mode (emerald palette in both)
- 💾 History persists in your browser via **localStorage** (no database)
- ☁️ Provider is env-driven — same code runs locally and on Vercel

## Configuration

Settings live in `.env.local` (already created). The provider is OpenRouter:

```bash
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=cohere/north-mini-code:free   # any model your key can use
AI_API_KEY=sk-or-v1-...                # from https://openrouter.ai/keys
```

Get a key (and browse free models) at https://openrouter.ai. Change `AI_MODEL`
to any model your account can access. The badge in the top bar shows a green
dot when the provider is reachable, red when it isn't.

> Works with any OpenAI-compatible API — point `AI_BASE_URL`/`AI_API_KEY` at
> Groq, Together, etc., if you prefer.

## Run

```bash
npm run dev
```

Open http://localhost:3000.

## Deploying to Vercel

1. Push this repo to GitHub and import it at https://vercel.com.
2. In the Vercel project's **Environment Variables**, add the same three vars:
   ```bash
   AI_BASE_URL = https://openrouter.ai/api/v1
   AI_MODEL    = cohere/north-mini-code:free
   AI_API_KEY  = sk-or-v1-...
   ```
3. Deploy. `.env.local` is gitignored, so your key is set only in Vercel.

## How it works

- `app/api/chat/route.ts` — the only chat endpoint. Streams responses via the
  AI SDK (`streamText` → `toUIMessageStreamResponse`). Stateless.
- `lib/provider.ts` — configures the OpenRouter (OpenAI-compatible) model from
  env. Swap providers by changing env, not code.
- `app/api/health/route.ts` — reports whether the provider is reachable.
- `lib/use-conversations.ts` + `lib/storage.ts` — conversation persistence
  (localStorage), behind a small interface so it can be swapped for a database.
- `components/chat/*`, `components/sidebar/*`, `components/layout/*` — the UI.
- Theme tokens are CSS variables in `app/globals.css`.

## Build

```bash
npm run build && npm start
```
