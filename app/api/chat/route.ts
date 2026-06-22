// streaming chat endpoint. it receives the full message history from the
// browser, forwards it to the configured openai compatible provider and streams
// the reply back token by token. it stores nothing itself; the client persists
// chats to supabase. runs on the node runtime so the provider sdk works.
//
// this endpoint spends the provider api key, so it requires a signed-in user.
// the proxy does not cover /api, so the auth check lives here.
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { getModel, MODEL } from "@/lib/provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT =
  "You are a helpful, friendly AI assistant. Format your responses using " +
  "Markdown when it improves clarity, and always use fenced code blocks with " +
  "a language tag for any code.";

const CONNECTION_HINT =
  "Could not reach the model provider. Check that AI_API_KEY is set and valid, " +
  "AI_BASE_URL is correct, and the model name exists.";

export async function POST(req: Request) {
  // require a signed-in user before spending the provider api key.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: "You must be signed in to chat." },
      { status: 401 },
    );
  }

  let body: { messages?: UIMessage[]; model?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { messages, model } = body;
  if (!Array.isArray(messages)) {
    return Response.json({ error: "No messages provided." }, { status: 400 });
  }

  try {
    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
      model: getModel(model),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      temperature: 0.7,
      maxRetries: 1, // fail fast when the provider is unreachable
      abortSignal: req.signal, // wired to the client's Stop button
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error("[chat] stream error:", error);
        const message = error instanceof Error ? error.message : String(error);
        if (/not found|no such model|model .* not/i.test(message)) {
          return `Model "${model || MODEL}" isn't available. Check the AI_MODEL value.`;
        }
        if (/unauthorized|invalid api key|401|forbidden|403|credit/i.test(message)) {
          return "The provider rejected the request. Check that AI_API_KEY is valid (and has free credits for this model).";
        }
        if (
          /cannot connect|connect to api|fetch failed|econnrefused|enotfound|terminated|failed after/i.test(
            message,
          )
        ) {
          return CONNECTION_HINT;
        }
        return message || "Something went wrong while generating the response.";
      },
    });
  } catch (error) {
    console.error("[chat] route error:", error);
    return Response.json({ error: CONNECTION_HINT }, { status: 503 });
  }
}
