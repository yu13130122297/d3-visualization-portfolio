"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Copy, Check, Download, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeTab {
  label: string;
  code: string;
}

interface CodeViewerProps {
  tabs: CodeTab[];
  filename?: string;
}

function highlightSyntax(code: string): string {
  // Simple syntax highlighting via HTML
  let html = code
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Comments
  html = html.replace(
    /(\/\/.*$)/gm,
    '<span class="text-emerald-500/70">$1</span>'
  );

  // Strings
  html = html.replace(
    /(&quot;[^&]*&quot;|'[^']*'|`[^`]*`)/g,
    '<span class="text-amber-400">$1</span>'
  );

  // Keywords
  html = html.replace(
    /\b(const|let|var|function|return|if|else|for|while|import|export|from|interface|type|class|new|this|async|await|default)\b/g,
    '<span class="text-blue-400">$1</span>'
  );

  // Types / capitalized words
  html = html.replace(
    /\b(string|number|boolean|void|null|undefined|Node|Link|DataPoint|Math)\b/g,
    '<span class="text-cyan-300">$1</span>'
  );

  // Numbers
  html = html.replace(
    /\b(\d+\.?\d*)\b/g,
    '<span class="text-orange-300">$1</span>'
  );

  // Operators
  html = html.replace(
    /([+\-*/%=<>!&|^~?:]+)/g,
    '<span class="text-sky-300/70">$1</span>'
  );

  return html;
}

export function CodeViewer({ tabs, filename }: CodeViewerProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const currentCode = tabs[activeTab]?.code || "";

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, [currentCode]);

  const downloadCode = useCallback(() => {
    const blob = new Blob([currentCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "code.ts";
    a.click();
    URL.revokeObjectURL(url);
  }, [currentCode, filename]);

  const lines = currentCode.split("\n");
  const highlighted = highlightSyntax(currentCode);
  const highlightedLines = highlighted.split("\n");

  return (
    <div className="rounded-lg overflow-hidden border border-border bg-[hsl(var(--code-bg))]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-[hsl(var(--code-bg))]">
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab, idx) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setActiveTab(idx)}
              className={cn(
                "text-xs px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap",
                activeTab === idx
                  ? "bg-primary/20 text-primary"
                  : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={copyCode}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50 transition-colors"
            aria-label={copied ? "已复制" : "复制代码"}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={downloadCode}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50 transition-colors"
            aria-label="下载代码"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50 transition-colors md:hidden"
            aria-label={collapsed ? "展开代码" : "折叠代码"}
          >
            {collapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Code */}
      {!collapsed && (
        <div className="overflow-auto max-h-[500px] code-scrollbar">
          <pre
            ref={codeRef}
            className="text-[13px] leading-relaxed font-mono p-4"
          >
            <code>
              {highlightedLines.map((line, i) => (
                <div key={i} className="flex">
                  <span className="inline-block w-10 text-right pr-4 text-neutral-600 select-none shrink-0">
                    {i + 1}
                  </span>
                  <span
                    className="text-neutral-200"
                    dangerouslySetInnerHTML={{ __html: line || "&nbsp;" }}
                  />
                </div>
              ))}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}
