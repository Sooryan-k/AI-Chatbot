import { HEALTH } from "@/lib/provider";

export const runtime = "nodejs";

/** Lightweight health check — reports whether the provider is reachable and
 *  which models are available. Always returns 200 so the client can read `ok`. */
export async function GET() {
  const { model, baseURL, apiKey } = HEALTH;

  try {
    const res = await fetch(`${baseURL}/models`, {
      cache: "no-store",
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { data?: { id: string }[] };
    const models = (data.data ?? []).map((m) => m.id);
    return Response.json({ ok: true, model, models });
  } catch {
    return Response.json({ ok: false, model, models: [] });
  }
}
