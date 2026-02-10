import { workRegistry } from "@/registry/workRegistry";
import type { VisualizationWork } from "@/types/work";
import { Plus, Check, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WorkSelectorProps {
  onAddWork: (work: VisualizationWork) => void;
  selectedIds: string[];
}

export function WorkSelector({ onAddWork, selectedIds }: WorkSelectorProps) {
  const isAdded = (id: string) => selectedIds.includes(id);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <LayoutGrid className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">组件库</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          点击添加组件到画布
        </p>
      </div>

      {/* Work List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {workRegistry.map((work) => {
          const added = isAdded(work.id);

          return (
            <div
              key={work.id}
              className={`p-3 rounded-lg border transition-all ${
                added
                  ? "border-primary/30 bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground text-sm truncate">
                    {work.title}
                  </h3>
                  {work.subtitle && (
                    <p className="text-xs text-muted-foreground truncate">
                      {work.subtitle}
                    </p>
                  )}
                </div>
                {added ? (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                ) : (
                  <button
                    onClick={() => onAddWork(work)}
                    className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                    aria-label={`添加 ${work.title}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {work.description}
              </p>

              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {work.category}
                </Badge>
                {work.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}

        {workRegistry.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <LayoutGrid className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无可添加的组件</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-border text-xs text-muted-foreground text-center">
        共 {workRegistry.length} 个可用组件
      </div>
    </div>
  );
}
