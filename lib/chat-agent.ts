// one-tap "agent" actions for a normal chat. each runs over the current
// conversation by sending a short, expert-phrased instruction through the usual
// streaming chat pipeline — the model already has the full thread as context, so
// the reply streams inline and is saved like any other message. this mirrors the
// live-room Facilitator's tools, adapted for a single-player chat (no extra
// route, tables, or paid services).

export type ChatAgentActionId = "summarize" | "actions" | "risks" | "nextsteps";

export interface ChatAgentAction {
  id: ChatAgentActionId;
  label: string;
  /** One-line description shown under the label in the menu. */
  hint: string;
  /** Sent as the user's message; it doubles as the visible prompt. */
  prompt: string;
}

export const CHAT_AGENT_ACTIONS: ChatAgentAction[] = [
  {
    id: "summarize",
    label: "Summarize",
    hint: "A TL;DR and the key points so far",
    prompt:
      "Summarize our conversation so far: a one-line TL;DR, then the key points as bullets.",
  },
  {
    id: "actions",
    label: "Action items",
    hint: "Pull out concrete to-dos as a checklist",
    prompt:
      "List the action items and next tasks from our conversation as a Markdown checklist. Note any owner or deadline that is clear; if there are none, say so briefly.",
  },
  {
    id: "risks",
    label: "Risks & blind spots",
    hint: "A devil's-advocate pass on the discussion",
    prompt:
      "Act as a constructive devil's advocate on what we've discussed: the biggest risks, blind spots, and shaky assumptions, as short bullets.",
  },
  {
    id: "nextsteps",
    label: "Next steps",
    hint: "A concrete plan to move forward",
    prompt:
      "Based on our conversation, propose concrete next steps as a short numbered plan.",
  },
];
