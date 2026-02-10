"use client";

import { WorkSelector } from "@/components/playground/WorkSelector";
import { ComponentCanvas } from "@/components/playground/ComponentCanvas";
import { useState, useRef, useEffect } from "react";
import type { VisualizationWork } from "@/types/work";
import { ArrowLeft, ShieldCheck, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { workRegistry } from "@/registry/workRegistry";

export default function PlaygroundPage() {
  const STORAGE_KEY = 'playground-selected-works';

  const [selectedWorks, setSelectedWorks] = useState<VisualizationWork[]>([]);
  const [preventCollision, setPreventCollision] = useState(true);
  const saveRef = useRef<(() => void) | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  // 在客户端挂载后从缓存加载
  useEffect(() => {
    try {
      const cachedIds = localStorage.getItem(STORAGE_KEY);
      if (cachedIds) {
        const ids = JSON.parse(cachedIds);
        // 从 workRegistry 中重建完整的 work 对象
        const works = ids.map((id: string) => workRegistry.find(w => w.id === id)).filter(Boolean) as VisualizationWork[];
        setSelectedWorks(works);
      }
    } catch {
      // 忽略存储错误
    }
  }, []);

  // 保存已添加的组件 ID 列表
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // 只保存 ID，因为组件函数无法序列化
      const ids = selectedWorks.map(w => w.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // 忽略存储错误
    }
  }, [selectedWorks]);

  const handleSave = () => {
    if (saveRef.current) {
      saveRef.current();
      setSaveMessage("已暂存");
      setTimeout(() => setSaveMessage(""), 2000);
    }
  };

  const handleClearAll = () => {
    setSelectedWorks([]);
    // 清空缓存
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('playground-component-states');
    }
  };

  const handleAddWork = (work: VisualizationWork) => {
    setSelectedWorks((prev) => [...prev, work]);
  };

  const handleRemoveWork = (workId: string) => {
    setSelectedWorks((prev) => prev.filter((w) => w.id !== workId));
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    setSelectedWorks((prev) => {
      const newWorks = [...prev];
      const [removed] = newWorks.splice(fromIndex, 1);
      newWorks.splice(toIndex, 0, removed);
      return newWorks;
    });
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="返回首页"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-primary-foreground"
                >
                  <circle cx="4" cy="4" r="2" fill="currentColor" />
                  <circle cx="12" cy="4" r="2" fill="currentColor" />
                  <circle cx="8" cy="12" r="2" fill="currentColor" />
                  <line
                    x1="4"
                    y1="4"
                    x2="12"
                    y2="4"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <line
                    x1="4"
                    y1="4"
                    x2="8"
                    y2="12"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <line
                    x1="12"
                    y1="4"
                    x2="8"
                    y2="12"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </svg>
              </div>
              <span className="font-semibold text-foreground tracking-tight">
                DataViz Studio
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground">实验台</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              className="gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              暂存
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空
            </Button>
            {saveMessage && (
              <span className="text-sm text-green-600">{saveMessage}</span>
            )}
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm text-muted-foreground cursor-pointer" htmlFor="collision-switch">
                防碰撞模式
              </label>
              <Switch
                id="collision-switch"
                checked={preventCollision}
                onCheckedChange={setPreventCollision}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              已添加 {selectedWorks.length} 个组件
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Component Selector */}
        <aside className="w-80 border-r border-border flex flex-col">
          <WorkSelector onAddWork={handleAddWork} selectedIds={selectedWorks.map(w => w.id)} />
        </aside>

        {/* Right - Canvas Area */}
        <section className="flex-1 overflow-auto bg-muted/30">
          <ComponentCanvas
            works={selectedWorks}
            onRemoveWork={handleRemoveWork}
            onReorder={handleReorder}
            preventCollision={preventCollision}
            saveRef={saveRef}
          />
        </section>
      </div>
    </main>
  );
}
