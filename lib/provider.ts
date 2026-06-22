// model provider, an openai compatible api (openrouter by default). everything
// is env driven so the same code runs locally and on vercel: set the vars in
// .env.local for dev and in the vercel dashboard for production. the api key is
// read from env and never hardcoded here.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

const AI_BASE_URL = process.env.AI_BASE_URL ?? "https://openrouter.ai/api/v1";

// active model id, overridable per request in getModel.
export const MODEL = process.env.AI_MODEL ?? "cohere/north-mini-code:free";

const provider = createOpenAICompatible({
  name: "openrouter",
  baseURL: AI_BASE_URL,
  apiKey: process.env.AI_API_KEY ?? "",
  // Optional OpenRouter attribution headers.
  headers: {
    "HTTP-Referer": process.env.AI_SITE_URL ?? "http://localhost:3000",
    "X-Title": "ZooperChat",
  },
});

// resolve a language model, optionally overriding the model id per request.
export function getModel(modelId?: string): LanguageModel {
  return provider(modelId || MODEL);
}
