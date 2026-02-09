"use client";

import { Search } from "lucide-react";
import type { WorkCategory } from "@/types/work";
import { categoryLabelsCN } from "@/types/work";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  activeCategory: WorkCategory | "all";
  onCategoryChange: (category: WorkCategory | "all") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const allCategories: (WorkCategory | "all")[] = [
  "all",
  "network",
  "timeline",
  "interactive",
  "geo",
  "infographic",
  "experiment",
];

export function FilterBar({
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {allCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryChange(cat)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-200",
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            )}
          >
            {cat === "all" ? "全部" : categoryLabelsCN[cat]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜索作品..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full sm:w-56 pl-9 pr-4 py-2 text-sm rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>
    </div>
  );
}
