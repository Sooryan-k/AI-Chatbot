"use client";

import { isValidElement, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

/** Recursively extract plain text from a (possibly nested) React node tree. */
function nodeToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (isValidElement(node)) {
    return nodeToText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

/** Pull the language tag + raw text out of the inner <code> element. */
function inspect(children: ReactNode): { code: string; lang: string } {
  const child = Array.isArray(children) ? children[0] : children;
  let lang = "";
  if (isValidElement(child)) {
    const className =
      (child.props as { className?: string }).className ?? "";
    const match = className.match(/language-([\w-]+)/);
    if (match) lang = match[1];
  }
  return { code: nodeToText(children), lang };
}

/** A fenced code block with a language label and a copy button.
 *  Used as the `pre` renderer for react-markdown; `children` is the highlighted
 *  <code> element produced by rehype-highlight. */
export function CodeBlock({ children }: { children?: ReactNode }) {
  const { code, lang } = inspect(children);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-[#1f2d27] bg-[#0d1117] text-[#c9d1d9]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-1.5 text-xs text-white/60">
        <span className="font-mono">{lang || "text"}</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:text-emerald-300"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-[0.85rem] leading-relaxed">
        {children}
      </pre>
    </div>
  );
}
