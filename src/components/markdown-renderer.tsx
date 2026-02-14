"use client";

import React, { useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      aria-label="Copy code"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (React.isValidElement(children) && children.props) {
    return extractText(
      (children.props as { children?: React.ReactNode }).children
    );
  }
  return String(children ?? "");
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        pre({ children, ...props }) {
          const code = extractText(children);
          return (
            <div className="relative group my-3">
              <CopyButton code={code} />
              <pre
                className="overflow-x-auto rounded-lg bg-[#f6f8fa] dark:bg-zinc-900 p-4 text-sm leading-relaxed"
                {...props}
              >
                {children}
              </pre>
            </div>
          );
        },
        code({ className, children, ...props }) {
          const isInline = !className;
          if (isInline) {
            return (
              <code
                className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          }
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
        },
        ul({ children }) {
          return <ul className="mb-3 ml-6 list-disc space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return (
            <ol className="mb-3 ml-6 list-decimal space-y-1">{children}</ol>
          );
        },
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>;
        },
        h1({ children }) {
          return (
            <h1 className="mb-3 mt-4 text-xl font-semibold">{children}</h1>
          );
        },
        h2({ children }) {
          return (
            <h2 className="mb-2 mt-4 text-lg font-semibold">{children}</h2>
          );
        },
        h3({ children }) {
          return (
            <h3 className="mb-2 mt-3 text-base font-semibold">{children}</h3>
          );
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-muted-foreground/30 pl-4 italic text-muted-foreground my-3">
              {children}
            </blockquote>
          );
        },
        table({ children }) {
          return (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border border-border px-3 py-2 text-left font-semibold bg-muted">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="border border-border px-3 py-2">{children}</td>
          );
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              {children}
            </a>
          );
        },
        hr() {
          return <hr className="my-4 border-border" />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
