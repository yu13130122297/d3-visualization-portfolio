"use client";

import { useState, useCallback, useRef } from "react";
import { Copy, Check, Download, ChevronDown, ChevronUp } from "lucide-react";

interface PromptViewerProps {
  prompt: string;
  filename?: string;
}

export function PromptViewer({ prompt, filename }: PromptViewerProps) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const copyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, [prompt]);

  const downloadPrompt = useCallback(() => {
    const blob = new Blob([prompt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "prompt.md";
    a.click();
    URL.revokeObjectURL(url);
  }, [prompt, filename]);

  return (
    <div className="rounded-lg overflow-hidden border border-border bg-[hsl(var(--code-bg))]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-[hsl(var(--code-bg))]">
        <span className="text-xs font-medium text-neutral-200">提示词 Prompt</span>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={copyPrompt}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50 transition-colors"
            aria-label={copied ? "已复制" : "复制提示词"}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={downloadPrompt}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50 transition-colors"
            aria-label="下载提示词"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50 transition-colors md:hidden"
            aria-label={collapsed ? "展开提示词" : "折叠提示词"}
          >
            {collapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Prompt content */}
      {!collapsed && (
        <div className="overflow-auto max-h-[500px] code-scrollbar">
          <div className="p-4 text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap font-mono">
            {prompt}
          </div>
        </div>
      )}
    </div>
  );
}
