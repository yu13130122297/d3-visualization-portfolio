"use client";

import type { VisualizationWork } from "@/types/work";
import { GripVertical, Trash2, Maximize2, Minimize2, Lock, Unlock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface ComponentCanvasProps {
  works: VisualizationWork[];
  onRemoveWork: (workId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  preventCollision: boolean;
  saveRef?: React.RefObject<(() => void) | null>;
}

interface ComponentState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isLocked: boolean;
}

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const DEFAULT_SIZE = { width: 400, height: 300 };
const MIN_SIZE = { width: 200, height: 150 };
const STORAGE_KEY = 'playground-component-states';

// 从 localStorage 读取缓存的状态
const loadCachedStates = (): ComponentState[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

// 保存状态到 localStorage
const saveCachedStates = (states: ComponentState[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch {
    // 忽略存储错误
  }
};

export function ComponentCanvas({ works, onRemoveWork, preventCollision, saveRef }: ComponentCanvasProps) {
  const initialCachedStates = useRef<ComponentState[] | null>(null);

  // 只在第一次获取缓存
  if (initialCachedStates.current === null) {
    initialCachedStates.current = loadCachedStates();
  }

  const [componentStates, setComponentStates] = useState<ComponentState[]>(() => {
    return initialCachedStates.current || [];
  });
  const setComponentStatesRef = useRef(setComponentStates);
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef<{ id: string; startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const resizingRef = useRef<{
    id: string;
    direction: ResizeDirection;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    canvasWidth: number;
    canvasHeight: number;
  } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // 暴露保存函数给父组件
  useEffect(() => {
    if (saveRef) {
      (saveRef as any).current = () => saveCachedStates(componentStates);
    }
  }, [componentStates, saveRef]);

  // 保存状态到 localStorage
  useEffect(() => {
    saveCachedStates(componentStates);
  }, [componentStates]);

  // 保持 setComponentStatesRef 与最新的 setComponentStates 同步
  useEffect(() => {
    setComponentStatesRef.current = setComponentStates;
  }, [setComponentStates]);

  // 碰撞检测函数 - 检查两个矩形是否重叠
  const checkCollision = (
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number }
  ): boolean => {
    return !(
      rect1.x + rect1.width <= rect2.x ||
      rect2.x + rect2.width <= rect1.x ||
      rect1.y + rect1.height <= rect2.y ||
      rect2.y + rect2.height <= rect1.y
    );
  };

  // 获取有效的位置（碰撞时阻止移动）
  const getValidPosition = (
    id: string,
    targetX: number,
    targetY: number,
    width: number,
    height: number,
    canvasWidth: number,
    canvasHeight: number,
    currentStates: ComponentState[] = componentStates,
    originalX: number,
    originalY: number
  ): { x: number; y: number } => {
    // 限制在画布边界内
    let x = Math.max(0, Math.min(targetX, canvasWidth - width));
    let y = Math.max(0, Math.min(targetY, canvasHeight - height));

    if (!preventCollision) {
      return { x, y };
    }

    // 检查当前位置是否碰撞
    const wouldCollide = (testX: number, testY: number): boolean => {
      for (const state of currentStates) {
        if (state.id === id) continue;

        if (checkCollision({ x: testX, y: testY, width, height }, {
          x: state.x,
          y: state.y,
          width: state.width,
          height: state.height,
        })) {
          return true;
        }
      }
      return false;
    };

    // 如果目标位置没有碰撞，直接返回
    if (!wouldCollide(x, y)) {
      return { x, y };
    }

    // 如果碰撞了，分别尝试只移动 X 轴或只移动 Y 轴
    const onlyXValid = !wouldCollide(x, originalY);
    const onlyYValid = !wouldCollide(originalX, y);

    if (onlyXValid) {
      // 只有 X 轴移动有效
      y = originalY;
    } else if (onlyYValid) {
      // 只有 Y 轴移动有效
      x = originalX;
    } else {
      // 都无效，返回原始位置
      x = originalX;
      y = originalY;
    }

    return { x, y };
  };

  // 初始化组件位置（网格布局）
  useEffect(() => {
    setComponentStates(prev => {
      const currentIds = works.map(w => w.id);
      const existingIds = prev.map(s => s.id);

      // 找出新增的组件
      const newWorks = works.filter(w => !existingIds.includes(w.id));

      // 如果没有新组件且没有需要删除的组件，直接返回
      if (newWorks.length === 0 && !prev.some(s => !currentIds.includes(s.id))) {
        return prev;
      }

      // 只保留当前存在的组件状态，保持它们的位置不变
      const validStates = prev.filter(s => currentIds.includes(s.id));

      // 只为真正新增的组件分配网格位置
      const gridColumns = 2;
      const newStates = newWorks.map((work, idx) => {
        // 检查缓存中是否有这个组件的状态
        const cachedState = initialCachedStates.current?.find(s => s.id === work.id);
        if (cachedState) {
          // 如果缓存中有，使用缓存的位置
          return cachedState;
        }
        // 否则分配新的网格位置
        return {
          id: work.id,
          x: (validStates.length + idx) % gridColumns * (DEFAULT_SIZE.width + 20) + 20,
          y: Math.floor((validStates.length + idx) / gridColumns) * (DEFAULT_SIZE.height + 120) + 20,
          width: DEFAULT_SIZE.width,
          height: DEFAULT_SIZE.height,
          isMinimized: false,
          isLocked: false,
        };
      });

      return [...validStates, ...newStates];
    });
  }, [works]);

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    const state = componentStates.find(s => s.id === id);
    if (state?.isLocked) return;

    setActiveId(id);
    draggedRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: state!.x,
      initialY: state!.y,
    };
  };

  const handleResizeStart = (e: React.MouseEvent, id: string, direction: ResizeDirection) => {
    e.stopPropagation();
    const state = componentStates.find(s => s.id === id);
    if (state?.isLocked) return;

    resizingRef.current = {
      id,
      direction,
      startX: e.clientX,
      startY: e.clientY,
      initialX: state!.x,
      initialY: state!.y,
      initialWidth: state!.width,
      initialHeight: state!.height,
      canvasWidth: canvasRef.current?.clientWidth || 0,
      canvasHeight: canvasRef.current?.clientHeight || 0,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const canvasWidth = canvasRef.current?.clientWidth || 0;
      const canvasHeight = canvasRef.current?.clientHeight || 0;

      if (draggedRef.current) {
        const { id, startX, startY, initialX, initialY } = draggedRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        setComponentStatesRef.current(prev => {
          const state = prev.find(s => s.id === id);
          if (!state) return prev;

          const targetX = initialX + dx;
          const targetY = initialY + dy;
          const width = state.width;
          const height = state.height;
          const currentX = state.x;
          const currentY = state.y;

          // 使用 getValidPosition 避免碰撞，传入当前状态和当前位置
          const validPos = getValidPosition(id, targetX, targetY, width, height, canvasWidth, canvasHeight, prev, currentX, currentY);

          return prev.map(s =>
            s.id === id ? { ...s, x: validPos.x, y: validPos.y } : s
          );
        });
      }

      if (resizingRef.current) {
        const { id, direction, startX, startY, initialX, initialY, initialWidth, initialHeight, canvasWidth, canvasHeight } = resizingRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        setComponentStatesRef.current(prev =>
          prev.map(s => {
            if (s.id !== id) return s;

            let newX = initialX;
            let newY = initialY;
            let newWidth = initialWidth;
            let newHeight = initialHeight;

            // 北边调整
            if (direction.includes("n")) {
              const heightChange = dy;
              if (initialHeight - heightChange >= MIN_SIZE.height) {
                newY = initialY + heightChange;
                newHeight = initialHeight - heightChange;
              }
            }

            // 南边调整 - 限制在画布底部边界和避免碰撞
            if (direction.includes("s")) {
              let maxHeight = canvasHeight - initialY;
              if (preventCollision) {
                // 检查下方是否有其他组件
                for (const other of prev) {
                  // 只跳过自己，不跳过锁定的组件
                  if (other.id === id) continue;
                  // 检查是否在当前组件下方
                  if (initialX < other.x + other.width && initialX + newWidth > other.x && initialY + initialHeight < other.y) {
                    maxHeight = Math.min(maxHeight, other.y - initialY);
                  }
                }
              }
              newHeight = Math.min(Math.max(MIN_SIZE.height, initialHeight + dy), maxHeight);
            }

            // 东边调整 - 限制在画布右侧边界和避免碰撞
            if (direction.includes("e")) {
              let maxWidth = canvasWidth - initialX;
              if (preventCollision) {
                // 检查右侧是否有其他组件
                for (const other of prev) {
                  // 只跳过自己，不跳过锁定的组件
                  if (other.id === id) continue;
                  // 检查是否在当前组件右侧
                  if (initialY < other.y + other.height && initialY + newHeight > other.y && initialX + initialWidth < other.x) {
                    maxWidth = Math.min(maxWidth, other.x - initialX);
                  }
                }
              }
              newWidth = Math.min(Math.max(MIN_SIZE.width, initialWidth + dx), maxWidth);
            }

            // 西边调整
            if (direction.includes("w")) {
              const widthChange = dx;
              if (initialWidth - widthChange >= MIN_SIZE.width) {
                newX = initialX + widthChange;
                newWidth = initialWidth - widthChange;
              }
            }

            return {
              ...s,
              x: Math.max(0, newX),
              y: Math.max(0, newY),
              width: newWidth,
              height: newHeight,
            };
          })
        );
      }
    };

    const handleMouseUp = () => {
      if (draggedRef.current || resizingRef.current) {
        setActiveId(null);
      }
      draggedRef.current = null;
      resizingRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleToggleMinimize = (id: string) => {
    setComponentStates(prev =>
      prev.map(s => (s.id === id ? { ...s, isMinimized: !s.isMinimized } : s))
    );
  };

  const handleToggleLock = (id: string) => {
    setComponentStates(prev =>
      prev.map(s => (s.id === id ? { ...s, isLocked: !s.isLocked } : s))
    );
  };

  const handleRemoveWork = (id: string) => {
    onRemoveWork(id);
    setComponentStates(prev => prev.filter(s => s.id !== id));
  };

  if (works.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 16 16"
              fill="none"
              className="text-muted-foreground"
            >
              <circle cx="4" cy="4" r="2" fill="currentColor" opacity="0.3" />
              <circle cx="12" cy="4" r="2" fill="currentColor" opacity="0.3" />
              <circle cx="8" cy="12" r="2" fill="currentColor" opacity="0.3" />
              <line
                x1="4"
                y1="4"
                x2="12"
                y2="4"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.3"
              />
              <line
                x1="4"
                y1="4"
                x2="8"
                y2="12"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.3"
              />
              <line
                x1="12"
                y1="4"
                x2="8"
                y2="12"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.3"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            画布为空
          </h3>
          <p className="text-sm text-muted-foreground">
            从左侧组件库中选择组件，点击添加按钮将其添加到画布中
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        ref={canvasRef}
        className="relative w-full h-full"
      >
        {/* 背景网格 */}
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(to right, #888 1px, transparent 1px),
              linear-gradient(to bottom, #888 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }}
        />

        {works.map((work) => {
          const state = componentStates.find((s) => s.id === work.id);
          if (!state) return null;

          const WorkComponent = work.component;
          const isActive = activeId === work.id;

          return (
            <div
              key={work.id}
              className={`absolute bg-background border overflow-hidden shadow-sm ${isActive ? "ring-2 ring-primary z-50" : "z-10"
                } ${state.isLocked ? "border-primary/50" : ""}`}
              style={{
                left: state.x,
                top: state.y,
                width: state.width,
                height: state.isMinimized ? "auto" : state.height,
                transition: "box-shadow 0.2s, border-color 0.2s",
              }}
              onMouseDown={() => setActiveId(work.id)}
            >
              {/* Header */}
              <div
                className={`flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 select-none ${state.isLocked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
                  }`}
                onMouseDown={(e) => !state.isLocked && handleMouseDown(e, work.id)}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground text-sm truncate">{work.title}</h3>
                    <Badge variant="outline" className="text-xs h-5 px-1">
                      {work.category}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleLock(work.id)}
                  className={`p-1 rounded transition-colors flex-shrink-0 ${state.isLocked
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  aria-label={state.isLocked ? "解锁" : "锁定"}
                >
                  {state.isLocked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => handleToggleMinimize(work.id)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                  aria-label={state.isMinimized ? "展开" : "收起"}
                >
                  {state.isMinimized ? (
                    <Maximize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Minimize2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => handleRemoveWork(work.id)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                  aria-label={`移除 ${work.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Content */}
              {!state.isMinimized && (
                <div className="absolute inset-0 top-[44px]">
                  <div className="absolute inset-0 p-2">
                    <div className="w-full h-full bg-muted/30 rounded-lg border border-border overflow-hidden">
                      <WorkComponent />
                    </div>
                  </div>

                  {/* Resize Handles - 四个边 */}
                  <div
                    className="absolute top-0 left-2 right-2 h-[10px] cursor-n-resize hover:bg-primary/20 -mt-2"
                    onMouseDown={(e) => handleResizeStart(e, work.id, "n")}
                  />
                  <div
                    className="absolute bottom-0 left-2 right-2 h-[10px] cursor-s-resize hover:bg-primary/20 -mb-2"
                    onMouseDown={(e) => handleResizeStart(e, work.id, "s")}
                  />
                  <div
                    className="absolute top-2 bottom-2 left-0 w-[10px] cursor-w-resize hover:bg-primary/20 -ml-2"
                    onMouseDown={(e) => handleResizeStart(e, work.id, "w")}
                  />
                  <div
                    className="absolute top-2 bottom-2 right-0 w-[10px] cursor-e-resize hover:bg-primary/20 -mr-2"
                    onMouseDown={(e) => handleResizeStart(e, work.id, "e")}
                  />

                  {/* Resize Handles - 四个角 */}
                  <div
                    className="absolute top-0 left-0 w-8 h-8 cursor-nw-resize hover:bg-primary/20 rounded-br-lg -mt-2 -ml-2 z-50"
                    onMouseDown={(e) => handleResizeStart(e, work.id, "nw")}
                  />
                  <div
                    className="absolute top-0 right-0 w-8 h-8 cursor-ne-resize hover:bg-primary/20 rounded-bl-lg -mt-2 -mr-2 z-50"
                    onMouseDown={(e) => handleResizeStart(e, work.id, "ne")}
                  />
                  <div
                    className="absolute bottom-0 left-0 w-8 h-8 cursor-sw-resize hover:bg-primary/20 rounded-tr-lg -mb-2 -ml-2 z-50"
                    onMouseDown={(e) => handleResizeStart(e, work.id, "sw")}
                  />
                  <div
                    className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize hover:bg-primary/20 rounded-tl-lg -mb-2 -mr-2 z-50 flex items-end justify-end pb-1 pr-1"
                    onMouseDown={(e) => handleResizeStart(e, work.id, "se")}
                  >
                    <div className="w-4 h-4 flex flex-col justify-end items-end gap-0.5">
                      <div className="w-1 h-1 bg-foreground/80 rounded-full" />
                      <div className="w-1 h-1 bg-foreground/80 rounded-full" />
                      <div className="w-1 h-1 bg-foreground/80 rounded-full" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
