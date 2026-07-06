// the Facilitator agent endpoint. it reads a room conversation transcript and
// returns a structured recap (tldr, decisions, action items, open questions).
//
// like /api/room-reply it spends the provider api key, so it requires a
// signed-in user. the proxy does not cover /api, so the auth check lives here.
import { generateText } from "ai";
import { getModel } from "@/lib/provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export interface Recap {
  tldr: string;
  decisions: string[];
  actionItems: { task: string; owner: string | null }[];
  openQuestions: string[];
}

const SYSTEM_PROMPT = [
  "You are a meeting facilitator. You are given a transcript of a group chat",
  "between several people (and sometimes an AI). Read it and produce a concise,",
  "useful recap.",
  "",
  "Respond with a SINGLE JSON object and nothing else, in exactly this shape:",
  '{ "tldr": string, "decisions": string[], "actionItems": [{ "task": string, "owner": string | null }], "openQuestions": string[] }',
  "",
  "- tldr: 1-3 sentence summary of the discussion.",
  "- decisions: concrete decisions the group reached (empty array if none).",
  "- actionItems: things someone should do; owner is the person's name if it is",
  "  clear from the transcript, otherwise null.",
  "- openQuestions: unresolved questions or things still to decide.",
  "Keep entries short. Do not invent content that is not in the transcript.",
].join("\n");

// pull the first {...} block out of the model text and parse it. free models
// sometimes wrap JSON in prose or code fences, so we extract defensively.
function parseRecap(text: string): Recap {
  const fallback: Recap = {
    tldr: text.trim().slice(0, 2000),
    decisions: [],
    actionItems: [],
    openQuestions: [],
  };
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return fallback;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<Recap>;
    return {
      tldr: typeof parsed.tldr === "string" ? parsed.tldr : "",
      decisions: Array.isArray(parsed.decisions)
        ? parsed.decisions.filter((d): d is string => typeof d === "string")
        : [],
      actionItems: Array.isArray(parsed.actionItems)
        ? parsed.actionItems
            .filter(
              (a): a is { task: string; owner: string | null } =>
                !!a && typeof (a as { task?: unknown }).task === "string",
            )
            .map((a) => ({
              task: a.task,
              owner: typeof a.owner === "string" && a.owner ? a.owner : null,
            }))
        : [],
      openQuestions: Array.isArray(parsed.openQuestions)
        ? parsed.openQuestions.filter((q): q is string => typeof q === "string")
        : [],
    };
  } catch {
    return fallback;
  }
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  let transcript: string;
  try {
    ({ transcript } = (await req.json()) as { transcript: string });
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof transcript !== "string" || !transcript.trim()) {
    return Response.json({ error: "No transcript provided." }, { status: 400 });
  }

  try {
    const { text } = await generateText({
      model: getModel(),
      system: SYSTEM_PROMPT,
      prompt: `Transcript:\n\n${transcript}\n\nRecap (JSON only):`,
      temperature: 0.3,
      maxRetries: 1,
    });
    return Response.json({ recap: parseRecap(text) });
  } catch (error) {
    console.error("[facilitator] error:", error);
    return Response.json(
      { error: "The model provider could not be reached." },
      { status: 503 },
    );
  }
}
