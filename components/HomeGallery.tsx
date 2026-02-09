"use client";

import { useState, useMemo } from "react";
import { workRegistry } from "@/registry/workRegistry";
import { WorkCard } from "@/components/ui/WorkCard";
import { FilterBar } from "@/components/ui/FilterBar";
import type { WorkCategory } from "@/types/work";

export function HomeGallery() {
  const [category, setCategory] = useState<WorkCategory | "all">("all");
  const [search, setSearch] = useState("");

  const filteredWorks = useMemo(() => {
    return workRegistry.filter((work) => {
      const matchesCategory =
        category === "all" || work.category === category;
      const matchesSearch =
        !search ||
        work.title.toLowerCase().includes(search.toLowerCase()) ||
        work.description.toLowerCase().includes(search.toLowerCase()) ||
        work.tags.some((t) =>
          t.toLowerCase().includes(search.toLowerCase())
        );
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  return (
    <div>
      <FilterBar
        activeCategory={category}
        onCategoryChange={setCategory}
        searchQuery={search}
        onSearchChange={setSearch}
      />

      {filteredWorks.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-muted-foreground text-sm">
            {"未找到符合条件的作品。"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {filteredWorks.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>
      )}
    </div>
  );
}
