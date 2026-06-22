"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { CodeBlock } from "./code-block";

// renders assistant answers from markdown to react. it supports github
// flavored markdown (tables, lists) and syntax highlighting, and overrides a
// few elements: code blocks, inline code, links open in a new tab, and tables
// get a horizontal scroll wrapper for mobile.
const components: Components = {
  // block code is wrapped in <pre>; render our code block chrome around it.
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  // Inline code (no language class) gets a subtle pill; block code keeps the
  // hljs classes so syntax highlighting applies inside CodeBlock.
  code: ({ className, children, ...props }) => {
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-emerald-700 dark:text-emerald-300">
        {children}
      </code>
    );
  },
  a: ({ children, ...props }) => (
    <a target="_blank" rel="noreferrer noopener" {...props}>
      {children}
    </a>
  ),
  // Wrap tables so wide ones scroll horizontally within the message instead
  // of overflowing the viewport on mobile.
  table: ({ children }) => (
    <div className="table-scroll">
      <table>{children}</table>
    </div>
  ),
};

function MarkdownImpl({ content }: { content: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** Memoized so streaming re-renders only re-parse when the text actually changes. */
export const Markdown = memo(MarkdownImpl);
