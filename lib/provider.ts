import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

/**
 * Model provider: OpenRouter (an OpenAI-compatible API).
 *
 * Everything is env-driven so the same code runs locally and on Vercel — set
 * the vars in `.env.local` for dev and in the Vercel dashboard for production.
 * The API key is never hardcoded here.
 */

const AI_BASE_URL = process.env.AI_BASE_URL ?? "https://openrouter.ai/api/v1";

/** Active model id. */
export const MODEL = process.env.AI_MODEL ?? "cohere/north-mini-code:free";

const provider = createOpenAICompatible({
  name: "openrouter",
  baseURL: AI_BASE_URL,
  apiKey: process.env.AI_API_KEY ?? "",
  // Optional OpenRouter attribution headers.
  headers: {
    "HTTP-Referer": process.env.AI_SITE_URL ?? "http://localhost:3000",
    "X-Title": "VedantChat",
  },
});

/** Resolve a language model (optionally overriding the model id per request). */
export function getModel(modelId?: string): LanguageModel {
  return provider(modelId || MODEL);
}

/** Connection details used by the /api/health check. */
export const HEALTH = {
  model: MODEL,
  baseURL: AI_BASE_URL,
  apiKey: process.env.AI_API_KEY,
};
