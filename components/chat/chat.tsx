"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { ChatMessage } from "@/lib/types";
import { getMessageText } from "@/lib/utils";
import { saveMessages } from "@/lib/use-conversations";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { useSpeechSynthesis } from "@/lib/use-speech-synthesis";
import { MessageList } from "./message-list";
import { Composer } from "./composer";
import { EmptyState } from "./empty-state";
import { MicButton, VoiceModeButton } from "./voice-button";
import { AgentMenu } from "./agent-menu";

// core chat surface for one conversation. it wires the ai sdk useChat hook to
// our composer and message list, and persists messages to supabase as the
// status changes. initialMessages seeds the thread on first mount only.
//
// voice: the mic dictates into the composer; voice mode reads replies aloud and,
// when speech recognition is available, runs a hands-free loop (speak reply ->
// listen -> auto-send on pause). all voice work is driven from event callbacks
// and refs so nothing calls setState during render.
export function Chat({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: ChatMessage[];
}) {
  const [input, setInput] = useState("");
  const [voiceMode, setVoiceMode] = useState(false);

  // refs hold the latest values for use inside speech event callbacks. they are
  // synced from an effect (writing ref.current during render is disallowed).
  const inputRef = useRef(input);
  const voiceModeRef = useRef(voiceMode);
  const lastTranscriptRef = useRef("");
  const submitVoiceRef = useRef<(text: string) => void>(() => {});
  const isBusyRef = useRef(false);
  const spokenIdRef = useRef<string | null>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";

  const recognition = useSpeechRecognition({
    continuous: false,
    onTranscript: (text) => {
      lastTranscriptRef.current = text;
      setInput(text);
    },
    onEnd: () => {
      // voice mode: once the speaker pauses, auto-send what was dictated.
      if (!voiceModeRef.current) return;
      const text = lastTranscriptRef.current.trim();
      if (text) submitVoiceRef.current(text);
    },
  });

  const synth = useSpeechSynthesis({
    onEnd: () => {
      // hands-free: after reading a reply, resume listening for the next turn.
      if (voiceModeRef.current && recognition.supported) {
        try {
          recognition.start();
        } catch {
          // start() throws if already running; ignore.
        }
      }
    },
  });

  // Persist on submit (so the chat appears in the sidebar immediately) and on
  // completion / error. Per-token streaming writes are intentionally skipped.
  useEffect(() => {
    if (messages.length === 0) return;
    if (status === "ready" || status === "submitted" || status === "error") {
      saveMessages(conversationId, messages);
    }
  }, [status, messages, conversationId]);

  // Read the finished reply aloud when voice mode is on (speak each message once).
  useEffect(() => {
    if (status !== "ready" || !voiceMode) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (spokenIdRef.current === last.id) return;
    spokenIdRef.current = last.id;
    synth.speak(getMessageText(last));
  }, [status, voiceMode, messages, synth]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusyRef.current) return;
    synth.cancel();
    recognition.stop();
    setInput("");
    lastTranscriptRef.current = "";
    sendMessage({ text: trimmed });
  }

  // sync render values into refs so the async speech callbacks read fresh state.
  useEffect(() => {
    inputRef.current = input;
    voiceModeRef.current = voiceMode;
    isBusyRef.current = isBusy;
    submitVoiceRef.current = send;
  });

  function handleSend() {
    send(input);
  }

  function handleMicToggle() {
    if (recognition.listening) {
      recognition.stop();
    } else {
      synth.cancel();
      recognition.start();
    }
  }

  function handleVoiceModeToggle() {
    const next = !voiceMode;
    setVoiceMode(next);
    if (next) {
      // toggling on is a user gesture, so it is safe to begin listening.
      if (recognition.supported) {
        try {
          recognition.start();
        } catch {
          /* ignore */
        }
      }
    } else {
      recognition.stop();
      synth.cancel();
    }
  }

  // the agent menu (one-tap actions over the whole conversation) plus, where the
  // browser supports them, the voice controls.
  const composerControls = (
    <div className="flex items-end gap-1">
      <AgentMenu
        disabled={isBusy || messages.length === 0}
        onRun={(prompt) => send(prompt)}
      />
      {synth.supported && (
        <VoiceModeButton active={voiceMode} onToggle={handleVoiceModeToggle} />
      )}
      {recognition.supported && (
        <MicButton
          listening={recognition.listening}
          onToggle={handleMicToggle}
        />
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {messages.length === 0 ? (
        <EmptyState onPick={(prompt) => send(prompt)} />
      ) : (
        <MessageList
          messages={messages}
          status={status}
          error={error}
          onRetry={() => regenerate()}
          onRegenerate={() => regenerate()}
        />
      )}
      <Composer
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onStop={stop}
        isBusy={isBusy}
        leftAccessory={composerControls}
      />
    </div>
  );
}
