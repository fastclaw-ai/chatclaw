"use client";

import React, { useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy, Download, FileIcon } from "lucide-react";

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

const IMAGE_EXT_RE = /\.(?:png|jpg|jpeg|gif|webp|svg)$/i;
const AUDIO_EXTS = ["mp3", "wav", "ogg", "flac", "m4a"];
const VIDEO_EXTS = ["mp4", "webm"];
const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
const ALL_MEDIA_EXTS = [...IMAGE_EXTS, ...AUDIO_EXTS, ...VIDEO_EXTS];
const FILE_PATH_RE = /`(\/[^`\n]+\.[a-zA-Z0-9]+)`|(?:^|[\s—])(\/(?:tmp|home|Users|var|opt)\/[^\s"'<>)]+\.[a-zA-Z0-9]+)/gm;

function getFileExt(path: string): string {
  const match = path.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : "";
}

// Marker format: %%MEDIA|type|name|url%%
function fileToMarker(filePath: string): string {
  const ext = getFileExt(filePath);
  const url = `/api/files?path=${encodeURIComponent(filePath)}`;
  const name = filePath.split("/").pop() || filePath;

  if (IMAGE_EXTS.includes(ext)) {
    return `\n![${name}](${url})\n`;
  }
  if (AUDIO_EXTS.includes(ext)) {
    return `\n%%MEDIA|audio|${name}|${url}%%\n`;
  }
  if (VIDEO_EXTS.includes(ext)) {
    return `\n%%MEDIA|video|${name}|${url}%%\n`;
  }
  return `\n%%MEDIA|file|${name}|${url}%%\n`;
}

function AudioPlayer({ name, src }: { name: string; src: string }) {
  return (
    <div className="my-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium">{name}</span>
        <a href={src} download={name} className="ml-auto text-muted-foreground hover:text-foreground">
          <Download className="h-4 w-4" />
        </a>
      </div>
      <audio controls className="w-full h-8" preload="metadata">
        <source src={src} />
      </audio>
    </div>
  );
}

function VideoPlayer({ name, src }: { name: string; src: string }) {
  return (
    <div className="my-2 rounded-lg border overflow-hidden">
      <video controls className="w-full max-h-80" preload="metadata">
        <source src={src} />
      </video>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30">
        <span className="text-xs text-muted-foreground truncate flex-1">{name}</span>
        <a href={src} download={name} className="text-muted-foreground hover:text-foreground">
          <Download className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

function FileDownload({ name, src }: { name: string; src: string }) {
  return (
    <a
      href={src}
      download={name}
      className="my-2 flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5 hover:bg-muted/50 transition-colors"
    >
      <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />
      <span className="text-sm font-medium truncate flex-1">{name}</span>
      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
    </a>
  );
}

/**
 * Preprocess content to convert file references to rendered media.
 * Handles:
 * - Backtick-wrapped filenames: `filename.png`
 * - Absolute paths: /tmp/filename.mp3, /Users/.../file.pdf
 * - Workspace paths: ~/.openclaw/workspace-xxx/filename.png
 */
function preprocessContent(content: string, agentId?: string): string {
  let result = content;

  // 1. Workspace paths (with or without backticks)
  if (agentId) {
    result = result.replace(
      /`?~?\/?\.openclaw\/workspace[^/]*\/([\w][\w\-. ]*\.(?:png|jpg|jpeg|gif|webp|svg))`?/gi,
      (_match, filename) => {
        const url = `/api/workspace/files?agentId=${encodeURIComponent(agentId)}&file=${encodeURIComponent(filename)}`;
        return `\n![${filename}](${url})\n`;
      }
    );
  }

  // 2. Absolute file paths (backtick-wrapped or bare)
  result = result.replace(FILE_PATH_RE, (match, backtickPath, barePath) => {
    const filePath = backtickPath || barePath;
    if (!filePath) return match;
    const prefix = match.startsWith("`") || match.startsWith("/") ? "" : match[0];
    return prefix + fileToMarker(filePath.trim());
  });

  // 3. Backtick-wrapped image filenames in workspace (agent context only)
  if (agentId) {
    result = result.replace(
      /`([\w][\w\-. ]*\.(?:png|jpg|jpeg|gif|webp|svg))`/gi,
      (_match, filename) => {
        const url = `/api/workspace/files?agentId=${encodeURIComponent(agentId)}&file=${encodeURIComponent(filename)}`;
        return `![${filename}](${url})`;
      }
    );

    // 4. Bare image filenames
    result = result.replace(
      /(?<!\(|!?\[.*?\]\()(?:^|(?<=\s))([\w][\w\-]*\.(?:png|jpg|jpeg|gif|webp|svg))(?=\s|$|[),;:。，])/gim,
      (_match, filename) => {
        const url = `/api/workspace/files?agentId=${encodeURIComponent(agentId)}&file=${encodeURIComponent(filename)}`;
        return `![${filename}](${url})`;
      }
    );
  }

  return result;
}

const MEDIA_MARKER_RE = /%%MEDIA\|(audio|video|file)\|([^|]+)\|((?:[^%]|%(?!%))*)%%/g;

export function MarkdownRenderer({ content, agentId }: { content: string; agentId?: string }) {
  const processed = preprocessContent(content, agentId);

  // Split content by media markers and render each segment
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(MEDIA_MARKER_RE.source, "g");

  while ((match = re.exec(processed)) !== null) {
    // Render markdown text before this marker
    const textBefore = processed.slice(lastIndex, match.index).trim();
    if (textBefore) {
      parts.push(<MarkdownSegment key={`md-${lastIndex}`} content={textBefore} />);
    }
    // Render the media component
    const [, type, name, src] = match;
    if (type === "audio") {
      parts.push(<AudioPlayer key={`media-${match.index}`} name={name} src={src} />);
    } else if (type === "video") {
      parts.push(<VideoPlayer key={`media-${match.index}`} name={name} src={src} />);
    } else {
      parts.push(<FileDownload key={`media-${match.index}`} name={name} src={src} />);
    }
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last marker
  const remaining = processed.slice(lastIndex).trim();
  if (remaining) {
    parts.push(<MarkdownSegment key={`md-${lastIndex}`} content={remaining} />);
  }

  // If no media markers found, render as single markdown
  if (parts.length === 0) {
    return <MarkdownSegment content={processed} />;
  }

  return <>{parts}</>;
}

function MarkdownSegment({ content }: { content: string }) {
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
        img({ src, alt }) {
          const imgSrc = typeof src === "string" ? src : undefined;
          return (
            <img
              src={imgSrc}
              alt={alt || ""}
              className="max-h-80 max-w-full rounded-lg border my-2 cursor-pointer hover:opacity-90"
              onClick={() => imgSrc && window.open(imgSrc, "_blank")}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
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
