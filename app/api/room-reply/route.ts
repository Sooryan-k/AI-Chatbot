// non-streaming reply endpoint for collaborative rooms. it takes the room's
// message history and returns the assistant text in one shot; the caller then
// persists it so every participant receives it via realtime. streaming to all
// participants is a future enhancement (see the plan).
//
// like /api/chat this spends the provider api key, so it requires a signed-in
// user. the proxy does not cover /api, so the auth check lives here.
import { generateText, type ModelMessage } from "ai";
import { getModel } from "@/lib/provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT =
  "You are a helpful, friendly AI assistant in a group chat with multiple " +
  "people. Format responses using Markdown when it improves clarity, and use " +
  "fenced code blocks with a language tag for any code.";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  let messages: ModelMessage[];
  try {
    ({ messages } = (await req.json()) as { messages: ModelMessage[] });
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "No messages provided." }, { status: 400 });
  }

  try {
    const { text } = await generateText({
      model: getModel(),
      system: SYSTEM_PROMPT,
      messages,
      temperature: 0.7,
      maxRetries: 1,
    });
    return Response.json({ text });
  } catch (error) {
    console.error("[room-reply] error:", error);
    return Response.json(
      { error: "The model provider could not be reached." },
      { status: 503 },
    );
  }
}
