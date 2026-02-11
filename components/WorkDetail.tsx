"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  Calendar,
  Database,
  Wrench,
  Lightbulb,
  FileText,
} from "lucide-react";
import type { VisualizationWork } from "@/types/work";
import { categoryLabelsCN } from "@/types/work";
import { PromptViewer } from "@/components/ui/PromptViewer";
import { cn } from "@/lib/utils";

interface WorkDetailProps {
  work: VisualizationWork;
  prev: VisualizationWork | null;
  next: VisualizationWork | null;
}

type RightPanelView = "info" | "prompt";

export type CanvasRatio = "fill" | "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

interface CanvasRatioOption {
  label: string;
  value: CanvasRatio;
  width: number;
  height: number;
}

const canvasRatioOptions: CanvasRatioOption[] = [
  { label: "自适应", value: "fill", width: 100, height: 100 },
  { label: "1:1", value: "1:1", width: 1, height: 1 },
  { label: "16:9", value: "16:9", width: 16, height: 9 },
  { label: "9:16", value: "9:16", width: 9, height: 16 },
  { label: "4:3", value: "4:3", width: 4, height: 3 },
  { label: "3:4", value: "3:4", width: 3, height: 4 },
];

export function WorkDetail({ work, prev, next }: WorkDetailProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [rightView, setRightView] = useState<RightPanelView>("info");
  const [canvasRatio, setCanvasRatio] = useState<CanvasRatio>("fill");

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[hsl(var(--viz-bg))]">
        <div className="w-full h-full">
          <work.component />
        </div>
        <button
          type="button"
          onClick={() => setFullscreen(false)}
          className="absolute top-4 right-4 p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground transition-colors z-10"
          aria-label="退出全屏"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {"返回作品集"}
          </Link>
          <div className="flex items-center gap-3">
            {prev && (
              <Link
                href={`/work/${prev.id}`}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                {"上一个"}
              </Link>
            )}
            {prev && next && (
              <span className="text-border">{"/"}</span>
            )}
            {next && (
              <Link
                href={`/work/${next.id}`}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {"下一个"}
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main content: left-right layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Visualization */}
        <div className="relative lg:flex-1 lg:min-w-0 bg-[hsl(var(--viz-bg))] border-b lg:border-b-0 lg:border-r border-border">
          {/* Canvas Ratio Selector */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-background/80 backdrop-blur-sm border border-border rounded-lg p-1">
            {canvasRatioOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCanvasRatio(option.value)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors",
                  canvasRatio === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Canvas Container */}
          <div className="w-full h-[50vh] lg:h-[calc(100vh-49px)] lg:sticky lg:top-[49px] flex items-center justify-center p-4">
            <div
              className={cn(
                "relative bg-background/50 border border-border/50 rounded-lg overflow-hidden shadow-sm transition-all duration-300",
                canvasRatio === "fill" ? "w-full h-full" : "max-w-full max-h-full"
              )}
              style={
                canvasRatio === "fill"
                  ? {}
                  : {
                      aspectRatio: `${canvasRatioOptions.find((o) => o.value === canvasRatio)!.width} / ${canvasRatioOptions.find((o) => o.value === canvasRatio)!.height}`,
                      maxHeight: "calc(100vh - 80px)",
                      maxWidth: "calc(100% - 32px)",
                    }
              }
            >
              <work.component />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground transition-colors z-10"
            aria-label="全屏"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {/* Category badge */}
          <div className="absolute top-4 left-4 z-10">
            <span className="text-[10px] uppercase tracking-wider font-medium px-2.5 py-1 rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm border border-border">
              {categoryLabelsCN[work.category]}
            </span>
          </div>
        </div>

        {/* Right: Info / Code panel */}
        <div className="w-full lg:w-[420px] xl:w-[480px] shrink-0 flex flex-col">
          {/* Panel toggle tabs */}
          <div className="flex border-b border-border bg-card">
            <button
              type="button"
              onClick={() => setRightView("info")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
                rightView === "info"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="w-4 h-4" />
              {"作品介绍"}
              {rightView === "info" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setRightView("prompt")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
                rightView === "prompt"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="w-4 h-4" />
              {"提示词"}
              {rightView === "prompt" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">
            {rightView === "info" ? (
              <div className="p-6">
                <h1 className="text-xl font-bold tracking-tight text-foreground text-balance">
                  {work.title}
                </h1>
                {work.subtitle && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {work.subtitle}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 mt-4">
                  {work.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-6">
                  <h2 className="text-sm font-semibold text-foreground mb-2">
                    {"设计说明"}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {work.fullDescription || work.description}
                  </p>
                </div>

                {/* Metadata */}
                {work.metadata && (
                  <div className="mt-6 flex flex-col gap-3">
                    {work.metadata.createdAt && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs text-muted-foreground/70 w-14 shrink-0">
                          {"创建日期"}
                        </span>
                        <span>{work.metadata.createdAt}</span>
                      </div>
                    )}
                    {work.metadata.dataSource && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Database className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs text-muted-foreground/70 w-14 shrink-0">
                          {"数据来源"}
                        </span>
                        <span>{work.metadata.dataSource}</span>
                      </div>
                    )}
                    {work.metadata.tools && work.metadata.tools.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Wrench className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs text-muted-foreground/70 w-14 shrink-0">
                          {"技术栈"}
                        </span>
                        <span>{work.metadata.tools.join(", ")}</span>
                      </div>
                    )}
                    {work.metadata.inspiration && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground/70 w-14 shrink-0">
                          {"灵感"}
                        </span>
                        <span>{work.metadata.inspiration}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick nav to prompt */}
                <button
                  type="button"
                  onClick={() => setRightView("prompt")}
                  className="mt-8 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  {"查看提示词"}
                </button>
              </div>
            ) : (
              <div className="p-4">
                <PromptViewer prompt={work.prompt} filename={`${work.id}-prompt.md`} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
