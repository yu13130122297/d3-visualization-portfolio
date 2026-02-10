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
  Code2,
  FileText,
} from "lucide-react";
import type { VisualizationWork } from "@/types/work";
import { categoryLabelsCN } from "@/types/work";
import { CodeViewer } from "@/components/ui/CodeViewer";
import { cn } from "@/lib/utils";

interface WorkDetailProps {
  work: VisualizationWork;
  prev: VisualizationWork | null;
  next: VisualizationWork | null;
}


type RightPanelView = "info" | "code";

export function WorkDetail({ work, prev, next }: WorkDetailProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [rightView, setRightView] = useState<RightPanelView>("info");
  const codeTabs = [
    { label: "核心代码", code: work.sourceCode.core },
    ...(work.sourceCode.data
      ? [{ label: "数据处理", code: work.sourceCode.data }]
      : []),
    ...(work.sourceCode.styles
      ? [{ label: "样式/动画", code: work.sourceCode.styles }]
      : []),
    ...(work.sourceCode.full
      ? [{ label: "完整源码", code: work.sourceCode.full }]
      : []),
  ];

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
          <div className="w-full h-[50vh] lg:h-[calc(100vh-49px)] lg:sticky lg:top-[49px]">
            <work.component />
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
              onClick={() => setRightView("code")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
                rightView === "code"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Code2 className="w-4 h-4" />
              {"源代码"}
              {rightView === "code" && (
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

                {/* Quick nav to code */}
                <button
                  type="button"
                  onClick={() => setRightView("code")}
                  className="mt-8 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Code2 className="w-4 h-4" />
                  {"查看源代码"}
                </button>
              </div>
            ) : (
              <div className="p-4">
                <CodeViewer tabs={codeTabs} filename={`${work.id}.ts`} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
