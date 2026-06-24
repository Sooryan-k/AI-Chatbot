"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

// stable no-op subscription: support is constant per session, so the snapshot
// never changes after mount. used with useSyncExternalStore to read it without
// setState-in-effect and without a hydration mismatch (server reads false).
const noopSubscribe = () => () => {};

// thin wrapper over the browser web speech api (speech to text). it is feature
// detected and chrome/edge/safari only; firefox returns supported=false so the
// ui can hide the mic. the api is not in the dom typings, so the shapes we use
// are declared minimally below.

interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechRecognitionState {
  supported: boolean;
  listening: boolean;
  /** Live transcript (interim + final) for the current dictation. */
  transcript: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(options?: {
  continuous?: boolean;
  /** Fired on every result (interim + final) with the full live transcript. */
  onTranscript?: (text: string) => void;
  /** Fired when a final result arrives, with just that segment. */
  onFinal?: (text: string) => void;
  /** Fired when recognition stops (silence, stop(), or error). */
  onEnd?: () => void;
}): SpeechRecognitionState {
  const { continuous = false, onTranscript, onFinal, onEnd } = options ?? {};
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => getCtor() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  // keep the latest callbacks without re-creating the recognition instance.
  const onTranscriptRef = useRef(onTranscript);
  const onFinalRef = useRef(onFinal);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onFinalRef.current = onFinal;
    onEndRef.current = onEnd;
  });

  useEffect(() => {
    const Ctor = getCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang =
      typeof navigator !== "undefined" ? navigator.language : "en-US";
    recognition.continuous = continuous;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalRef.current += text;
          onFinalRef.current?.(text.trim());
        } else {
          interim += text;
        }
      }
      const full = (finalRef.current + interim).trim();
      setTranscript(full);
      onTranscriptRef.current?.(full);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => {
      setListening(false);
      onEndRef.current?.();
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [continuous]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    finalRef.current = "";
    setTranscript("");
    try {
      recognition.start();
      setListening(true);
    } catch {
      // start() throws if already started; ignore.
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    finalRef.current = "";
    setTranscript("");
  }, []);

  return { supported, listening, transcript, start, stop, reset };
}
