"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, ImageIcon, Paperclip, Square, X, FileText } from "lucide-react";

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  isBusy,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: (files: File[]) => void;
  onStop: () => void;
  isBusy: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  // Auto-grow textarea up to max height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    if (isBusy) return;
    onSend(files);
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...picked.filter((f) => !names.has(f.name))];
    });
    e.target.value = "";
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  const canSend = value.trim().length > 0 || files.length > 0;

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur">
      <div className="mx-auto w-full max-w-3xl px-4 py-3">
        <div className="rounded-2xl border border-border bg-card shadow-sm transition-colors focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
          {/* File attachment chips */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-b border-border px-3 pt-2.5 pb-2">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                >
                  {file.type.startsWith("image/") ? (
                    <ImageIcon size={12} />
                  ) : (
                    <FileText size={12} />
                  )}
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(file.name)}
                    className="ml-0.5 rounded-full hover:text-foreground"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end gap-2 px-3 py-2">
            {/* Attach file button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
              className="mb-0.5 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Paperclip size={18} />
            </button>

            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Message VedantChat…"
              className="max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-[0.95rem] outline-none placeholder:text-muted-foreground"
            />

            {isBusy ? (
              <button
                type="button"
                onClick={onStop}
                title="Stop generating"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700"
              >
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                title="Send"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.csv,.json,.ts,.tsx,.js,.jsx,.py,.html,.css"
          className="hidden"
          onChange={handleFileChange}
        />

        <p className="mt-2 text-center text-xs text-muted-foreground">
          Powered by OpenRouter · Enter to send, Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}
