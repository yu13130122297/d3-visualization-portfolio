"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { VisualizationWork } from "@/types/work";
import { categoryLabelsCN } from "@/types/work";

interface WorkCardProps {
  work: VisualizationWork;
}

export function WorkCard({ work }: WorkCardProps) {
  return (
    <Link
      href={`/work/${work.id}`}
      className="group block rounded-lg overflow-hidden border border-border bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Preview area */}
      <div className="relative aspect-[16/10] bg-[hsl(var(--viz-bg))] overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <work.component />
        </div>
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground border border-border rounded-full px-4 py-2 bg-card/80">
            {"查看详情"}
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>
        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-1 rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm">
            {categoryLabelsCN[work.category]}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-balance">
          {work.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
          {work.description}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {work.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
