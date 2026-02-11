"use client";

import { useEffect, useRef, useCallback } from "react";

interface Node {
    id: string;
    group: number;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
}

interface Link {
    source: string | Node;
    target: string | Node;
    value: number;
}

function generateData(): { nodes: Node[]; links: Link[] } {
    const groups = 6;
    const nodesPerGroup = 8;
    const nodes: Node[] = [];
    const links: Link[] = [];

    for (let g = 0; g < groups; g++) {
        for (let i = 0; i < nodesPerGroup; i++) {
            nodes.push({ id: `g${g}-n${i}`, group: g });
        }
    }

    // Intra-group links
    for (let g = 0; g < groups; g++) {
        for (let i = 0; i < nodesPerGroup; i++) {
            for (let j = i + 1; j < nodesPerGroup; j++) {
                if (Math.random() < 0.4) {
                    links.push({
                        source: `g${g}-n${i}`,
                        target: `g${g}-n${j}`,
                        value: 1,
                    });
                }
            }
        }
    }

    // Inter-group links
    for (let g = 0; g < groups; g++) {
        for (let h = g + 1; h < groups; h++) {
            const count = Math.floor(Math.random() * 3) + 1;
            for (let c = 0; c < count; c++) {
                const ni = Math.floor(Math.random() * nodesPerGroup);
                const nj = Math.floor(Math.random() * nodesPerGroup);
                links.push({
                    source: `g${g}-n${ni}`,
                    target: `g${h}-n${nj}`,
                    value: 2,
                });
            }
        }
    }

    return { nodes, links };
}

const groupColors = [
    "#3b82f6",
    "#22d3ee",
    "#a78bfa",
    "#f472b6",
    "#34d399",
    "#fbbf24",
];

export function ForceGraph() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>(0);
    const dataRef = useRef<{ nodes: Node[]; links: Link[] } | null>(null);
    const dragRef = useRef<{
        node: Node | null;
        active: boolean;
    }>({ node: null, active: false });
    const hoveredRef = useRef<Node | null>(null);
    const sizeRef = useRef({ width: 0, height: 0 });

    const getNodeAt = useCallback((x: number, y: number): Node | null => {
        if (!dataRef.current) return null;
        const { nodes } = dataRef.current;
        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i];
            const dx = (node.x || 0) - x;
            const dy = (node.y || 0) - y;
            const r = 5 + (node.group === 0 ? 2 : 0);
            if (dx * dx + dy * dy < (r + 3) * (r + 3)) return node;
        }
        return null;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;

        const resize = () => {
            const rect = container.getBoundingClientRect();
            const w = rect.width;
            const h = rect.height;
            sizeRef.current = { width: w, height: h };
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        resize();

        // Generate data
        const data = generateData();
        const { nodes, links } = data;
        dataRef.current = data;

        // Build link index map
        const nodeMap = new Map<string, Node>();
        for (const n of nodes) {
            n.x = sizeRef.current.width / 2 + (Math.random() - 0.5) * 200;
            n.y = sizeRef.current.height / 2 + (Math.random() - 0.5) * 200;
            n.vx = 0;
            n.vy = 0;
            nodeMap.set(n.id, n);
        }

        // Resolve links
        const resolvedLinks = links.map((l) => ({
            source: nodeMap.get(l.source as string)!,
            target: nodeMap.get(l.target as string)!,
            value: l.value,
        }));

        // Simple force simulation
        const alpha = { current: 1 };
        const alphaDecay = 0.0228;
        const alphaMin = 0.001;
        const velocityDecay = 0.6;

        function tick() {
            if (alpha.current < alphaMin) {
                alpha.current = alphaMin;
            }

            const w = sizeRef.current.width;
            const h = sizeRef.current.height;
            const cx = w / 2;
            const cy = h / 2;

            // Center force
            for (const node of nodes) {
                node.vx = (node.vx || 0) + (cx - (node.x || 0)) * 0.01 * alpha.current;
                node.vy = (node.vy || 0) + (cy - (node.y || 0)) * 0.01 * alpha.current;
            }

            // Charge force (repulsion)
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i];
                    const b = nodes[j];
                    let dx = (b.x || 0) - (a.x || 0);
                    let dy = (b.y || 0) - (a.y || 0);
                    let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const strength = -150 * alpha.current / (dist * dist);
                    const fx = dx / dist * strength;
                    const fy = dy / dist * strength;
                    a.vx = (a.vx || 0) - fx;
                    a.vy = (a.vy || 0) - fy;
                    b.vx = (b.vx || 0) + fx;
                    b.vy = (b.vy || 0) + fy;
                }
            }

            // Link force
            for (const link of resolvedLinks) {
                const s = link.source;
                const t = link.target;
                let dx = (t.x || 0) - (s.x || 0);
                let dy = (t.y || 0) - (s.y || 0);
                let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const desiredDist = 40;
                const strength = (dist - desiredDist) / dist * 0.3 * alpha.current;
                const fx = dx * strength;
                const fy = dy * strength;
                s.vx = (s.vx || 0) + fx;
                s.vy = (s.vy || 0) + fy;
                t.vx = (t.vx || 0) - fx;
                t.vy = (t.vy || 0) - fy;
            }

            // Update positions
            for (const node of nodes) {
                if (node.fx != null) {
                    node.x = node.fx;
                    node.vx = 0;
                } else {
                    node.vx = (node.vx || 0) * velocityDecay;
                    node.x = (node.x || 0) + (node.vx || 0);
                }
                if (node.fy != null) {
                    node.y = node.fy;
                    node.vy = 0;
                } else {
                    node.vy = (node.vy || 0) * velocityDecay;
                    node.y = (node.y || 0) + (node.vy || 0);
                }
                // Constrain to bounds
                node.x = Math.max(10, Math.min(w - 10, node.x || 0));
                node.y = Math.max(10, Math.min(h - 10, node.y || 0));
            }

            alpha.current *= (1 - alphaDecay);
        }

        function draw() {
            const w = sizeRef.current.width;
            const h = sizeRef.current.height;
            ctx.clearRect(0, 0, w, h);

            const hovered = hoveredRef.current;
            const connectedIds = new Set<string>();
            if (hovered) {
                connectedIds.add(hovered.id);
                for (const link of resolvedLinks) {
                    if (link.source.id === hovered.id) connectedIds.add(link.target.id);
                    if (link.target.id === hovered.id) connectedIds.add(link.source.id);
                }
            }

            // Draw links
            for (const link of resolvedLinks) {
                const isHighlighted =
                    hovered &&
                    (link.source.id === hovered.id || link.target.id === hovered.id);
                ctx.beginPath();
                ctx.moveTo(link.source.x || 0, link.source.y || 0);
                ctx.lineTo(link.target.x || 0, link.target.y || 0);
                ctx.strokeStyle = isHighlighted
                    ? "rgba(59, 130, 246, 0.6)"
                    : hovered
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(255,255,255,0.08)";
                ctx.lineWidth = isHighlighted ? 1.5 : 0.5;
                ctx.stroke();
            }

            // Draw nodes
            for (const node of nodes) {
                const isHovered = hovered && node.id === hovered.id;
                const isConnected = hovered && connectedIds.has(node.id);
                const dimmed = hovered && !isConnected;
                const r = isHovered ? 7 : 5;
                const color = groupColors[node.group % groupColors.length];

                ctx.beginPath();
                ctx.arc(node.x || 0, node.y || 0, r, 0, Math.PI * 2);
                ctx.fillStyle = dimmed ? `${color}33` : color;
                ctx.fill();

                if (isHovered) {
                    ctx.beginPath();
                    ctx.arc(node.x || 0, node.y || 0, r + 3, 0, Math.PI * 2);
                    ctx.strokeStyle = `${color}88`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }

            // Tooltip
            if (hovered) {
                const x = (hovered.x || 0) + 12;
                const y = (hovered.y || 0) - 12;
                const label = `Node ${hovered.id}`;
                const groupLabel = `Group ${hovered.group + 1}`;
                ctx.font = "12px Inter, system-ui, sans-serif";
                const textWidth = Math.max(
                    ctx.measureText(label).width,
                    ctx.measureText(groupLabel).width
                );

                ctx.fillStyle = "rgba(0,0,0,0.85)";
                ctx.beginPath();
                ctx.roundRect(x - 6, y - 18, textWidth + 16, 38, 4);
                ctx.fill();

                ctx.fillStyle = "#fff";
                ctx.fillText(label, x, y - 2);
                ctx.fillStyle = "#999";
                ctx.font = "11px Inter, system-ui, sans-serif";
                ctx.fillText(groupLabel, x, y + 14);
            }
        }

        function animate() {
            tick();
            draw();
            animationRef.current = requestAnimationFrame(animate);
        }

        animate();

        // Mouse events
        const getPos = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        const onMouseMove = (e: MouseEvent) => {
            const pos = getPos(e);
            if (dragRef.current.active && dragRef.current.node) {
                dragRef.current.node.fx = pos.x;
                dragRef.current.node.fy = pos.y;
                alpha.current = 0.3;
            } else {
                const node = getNodeAt(pos.x, pos.y);
                hoveredRef.current = node;
                canvas.style.cursor = node ? "pointer" : "default";
            }
        };

        const onMouseDown = (e: MouseEvent) => {
            const pos = getPos(e);
            const node = getNodeAt(pos.x, pos.y);
            if (node) {
                dragRef.current = { node, active: true };
                node.fx = pos.x;
                node.fy = pos.y;
                alpha.current = 0.3;
            }
        };

        const onMouseUp = () => {
            if (dragRef.current.node) {
                dragRef.current.node.fx = null;
                dragRef.current.node.fy = null;
            }
            dragRef.current = { node: null, active: false };
        };

        const onMouseLeave = () => {
            hoveredRef.current = null;
            if (dragRef.current.node) {
                dragRef.current.node.fx = null;
                dragRef.current.node.fy = null;
            }
            dragRef.current = { node: null, active: false };
        };

        canvas.addEventListener("mousemove", onMouseMove);
        canvas.addEventListener("mousedown", onMouseDown);
        canvas.addEventListener("mouseup", onMouseUp);
        canvas.addEventListener("mouseleave", onMouseLeave);
        window.addEventListener("resize", resize);

        return () => {
            cancelAnimationFrame(animationRef.current);
            canvas.removeEventListener("mousemove", onMouseMove);
            canvas.removeEventListener("mousedown", onMouseDown);
            canvas.removeEventListener("mouseup", onMouseUp);
            canvas.removeEventListener("mouseleave", onMouseLeave);
            window.removeEventListener("resize", resize);
        };
    }, [getNodeAt]);

    return (
        <div ref={containerRef} className="w-full h-full" style={{ minHeight: 400 }}>
            <canvas ref={canvasRef} className="block w-full h-full" />
        </div>
    );
}

// --- Prompt for recreating this Force Graph visualization ---
// 请将以下提示词发送给 Cursor 或其他 AI 工具来复现此可视化图表

export const forceGraphPrompt = `# 社交网络图谱 - 交互式力导向网络可视化

请创建一个交互式力导向网络可视化组件，使用纯 TypeScript 和 Canvas 2D API 实现（不依赖 D3.js）。

## 一、功能概述
- 力导向布局模拟（自定义物理引擎）
- 节点分组着色（6种颜色）
- 悬停高亮：显示节点及其连接的邻居节点
- 拖拽交互：可拖动节点重新定位
- 响应式画布

## 二、数据结构

### 节点接口
\`\`\`typescript
interface Node {
  id: string;        // 节点唯一标识
  group: number;     // 分组号（0-5）
  x?: number;        // X坐标
  y?: number;        // Y坐标
  vx?: number;       // X方向速度
  vy?: number;       // Y方向速度
  fx?: number | null; // 固定X坐标（拖拽时使用）
  fy?: number | null; // 固定Y坐标（拖拽时使用）
}
\`\`\`

### 连接接口
\`\`\`typescript
interface Link {
  source: string | Node;
  target: string | Node;
  value: number;     // 连接权重
}
\`\`\`

## 三、颜色配置
\`\`\`typescript
const groupColors = [
  "#3b82f6",  // 蓝色
  "#22d3ee",  // 青色
  "#a78bfa",  // 紫色
  "#f472b6",  // 粉色
  "#34d399",  // 绿色
  "#fbbf24",  // 黄色
];
\`\`\`

## 四、数据生成函数
生成6个分组，每组8个节点：
- 组内连接概率 40%
- 组间连接：1-3条桥接边

\`\`\`typescript
function generateData(): { nodes: Node[]; links: Link[] } {
  const groups = 6;
  const nodesPerGroup = 8;
  const nodes: Node[] = [];
  const links: Link[] = [];

  // 创建节点
  for (let g = 0; g < groups; g++) {
    for (let i = 0; i < nodesPerGroup; i++) {
      nodes.push({ id: \`g\${g}-n\${i}\`, group: g });
    }
  }

  // 组内连接
  for (let g = 0; g < groups; g++) {
    for (let i = 0; i < nodesPerGroup; i++) {
      for (let j = i + 1; j < nodesPerGroup; j++) {
        if (Math.random() < 0.4) {
          links.push({
            source: \`g\${g}-n\${i}\`,
            target: \`g\${g}-n\${j}\`,
            value: 1,
          });
        }
      }
    }
  }

  // 组间连接
  for (let g = 0; g < groups; g++) {
    for (let h = g + 1; h < groups; h++) {
      const count = Math.floor(Math.random() * 3) + 1;
      for (let c = 0; c < count; c++) {
        const ni = Math.floor(Math.random() * nodesPerGroup);
        const nj = Math.floor(Math.random() * nodesPerGroup);
        links.push({
          source: \`g\${g}-n\${ni}\`,
          target: \`g\${h}-n\${nj}\`,
          value: 2,
        });
      }
    }
  }

  return { nodes, links };
}
\`\`\`

## 五、力导向模拟核心

### 模拟参数
\`\`\`typescript
const alpha = { current: 1 };    // 模拟强度
const alphaDecay = 0.0228;        // 强度衰减率
const alphaMin = 0.001;           // 最小强度
const velocityDecay = 0.6;        // 速度衰减率
\`\`\`

### 核心 tick 函数
每帧计算一次位置更新：

\`\`\`typescript
function tick() {
  if (alpha.current < alphaMin) {
    alpha.current = alphaMin;
  }

  const w = sizeRef.current.width;
  const h = sizeRef.current.height;
  const cx = w / 2;
  const cy = h / 2;

  // 1. 中心力：将节点拉向画布中心
  for (const node of nodes) {
    node.vx = (node.vx || 0) + (cx - (node.x || 0)) * 0.01 * alpha.current;
    node.vy = (node.vy || 0) + (cy - (node.y || 0)) * 0.01 * alpha.current;
  }

  // 2. 斥力：节点之间互相排斥
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = (b.x || 0) - (a.x || 0);
      let dy = (b.y || 0) - (a.y || 0);
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const strength = -150 * alpha.current / (dist * dist);
      const fx = dx / dist * strength;
      const fy = dy / dist * strength;
      a.vx = (a.vx || 0) - fx;
      a.vy = (a.vy || 0) - fy;
      b.vx = (b.vx || 0) + fx;
      b.vy = (b.vy || 0) + fy;
    }
  }

  // 3. 连接力：连接的节点互相吸引（弹簧）
  for (const link of resolvedLinks) {
    const s = link.source;
    const t = link.target;
    let dx = (t.x || 0) - (s.x || 0);
    let dy = (t.y || 0) - (s.y || 0);
    let dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const desiredDist = 40;
    const strength = (dist - desiredDist) / dist * 0.3 * alpha.current;
    const fx = dx * strength;
    const fy = dy * strength;
    s.vx = (s.vx || 0) + fx;
    s.vy = (s.vy || 0) + fy;
    t.vx = (t.vx || 0) - fx;
    t.vy = (t.vy || 0) - fy;
  }

  // 4. 更新位置并衰减速度
  for (const node of nodes) {
    if (node.fx != null) {
      node.x = node.fx;
      node.vx = 0;
    } else {
      node.vx = (node.vx || 0) * velocityDecay;
      node.x = (node.x || 0) + (node.vx || 0);
    }
    if (node.fy != null) {
      node.y = node.fy;
      node.vy = 0;
    } else {
      node.vy = (node.vy || 0) * velocityDecay;
      node.y = (node.y || 0) + (node.vy || 0);
    }
    // 边界约束
    node.x = Math.max(10, Math.min(w - 10, node.x || 0));
    node.y = Math.max(10, Math.min(h - 10, node.y || 0));
  }

  alpha.current *= (1 - alphaDecay);
}
\`\`\`

## 六、Canvas 渲染

### 绘制函数
\`\`\`typescript
function draw() {
  const w = sizeRef.current.width;
  const h = sizeRef.current.height;
  ctx.clearRect(0, 0, w, h);

  const hovered = hoveredRef.current;
  const connectedIds = new Set<string>();
  if (hovered) {
    connectedIds.add(hovered.id);
    for (const link of resolvedLinks) {
      if (link.source.id === hovered.id) connectedIds.add(link.target.id);
      if (link.target.id === hovered.id) connectedIds.add(link.source.id);
    }
  }

  // 绘制连线
  for (const link of resolvedLinks) {
    const isHighlighted =
      hovered &&
      (link.source.id === hovered.id || link.target.id === hovered.id);
    ctx.beginPath();
    ctx.moveTo(link.source.x || 0, link.source.y || 0);
    ctx.lineTo(link.target.x || 0, link.target.y || 0);
    ctx.strokeStyle = isHighlighted
      ? "rgba(59, 130, 246, 0.6)"
      : hovered
        ? "rgba(255,255,255,0.03)"
        : "rgba(255,255,255,0.08)";
    ctx.lineWidth = isHighlighted ? 1.5 : 0.5;
    ctx.stroke();
  }

  // 绘制节点
  for (const node of nodes) {
    const isHovered = hovered && node.id === hovered.id;
    const isConnected = hovered && connectedIds.has(node.id);
    const dimmed = hovered && !isConnected;
    const r = isHovered ? 7 : 5;
    const color = groupColors[node.group % groupColors.length];

    ctx.beginPath();
    ctx.arc(node.x || 0, node.y || 0, r, 0, Math.PI * 2);
    ctx.fillStyle = dimmed ? \`\${color}33\` : color;
    ctx.fill();

    // 悬停节点显示光环
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(node.x || 0, node.y || 0, r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = \`\${color}88\`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // 悬停提示框
  if (hovered) {
    const x = (hovered.x || 0) + 12;
    const y = (hovered.y || 0) - 12;
    const label = \`Node \${hovered.id}\`;
    const groupLabel = \`Group \${hovered.group + 1}\`;
    ctx.font = "12px Inter, system-ui, sans-serif";
    const textWidth = Math.max(
      ctx.measureText(label).width,
      ctx.measureText(groupLabel).width
    );

    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.beginPath();
    ctx.roundRect(x - 6, y - 18, textWidth + 16, 38, 4);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.fillText(label, x, y - 2);
    ctx.fillStyle = "#999";
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.fillText(groupLabel, x, y + 14);
  }
}
\`\`\`

## 七、交互事件

### 鼠标事件处理
\`\`\`typescript
// 获取鼠标相对于画布的位置
const getPos = (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

// 检测点击位置的节点
const getNodeAt = (x: number, y: number): Node | null => {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const dx = (node.x || 0) - x;
    const dy = (node.y || 0) - y;
    const r = 5 + (node.group === 0 ? 2 : 0);
    if (dx * dx + dy * dy < (r + 3) * (r + 3)) return node;
  }
  return null;
};

// 鼠标移动：拖拽或悬停
const onMouseMove = (e: MouseEvent) => {
  const pos = getPos(e);
  if (dragRef.current.active && dragRef.current.node) {
    dragRef.current.node.fx = pos.x;
    dragRef.current.node.fy = pos.y;
    alpha.current = 0.3;  // 重新激活模拟
  } else {
    const node = getNodeAt(pos.x, pos.y);
    hoveredRef.current = node;
    canvas.style.cursor = node ? "pointer" : "default";
  }
};

// 鼠标按下：开始拖拽
const onMouseDown = (e: MouseEvent) => {
  const pos = getPos(e);
  const node = getNodeAt(pos.x, pos.y);
  if (node) {
    dragRef.current = { node, active: true };
    node.fx = pos.x;
    node.fy = pos.y;
    alpha.current = 0.3;
  }
};

// 鼠标松开：结束拖拽
const onMouseUp = () => {
  if (dragRef.current.node) {
    dragRef.current.node.fx = null;
    dragRef.current.node.fy = null;
  }
  dragRef.current = { node: null, active: false };
};

// 鼠标离开：清理状态
const onMouseLeave = () => {
  hoveredRef.current = null;
  if (dragRef.current.node) {
    dragRef.current.node.fx = null;
    dragRef.current.node.fy = null;
  }
  dragRef.current = { node: null, active: false };
};
\`\`\`

## 八、响应式处理
\`\`\`typescript
const resize = () => {
  const rect = container.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  sizeRef.current = { width: w, height: h };
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = \`\${w}px\`;
  canvas.style.height = \`\${h}px\`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};
\`\`\`

## 九、使用 React Hooks
- \`useRef\` 存储画布引用、动画帧 ID、数据引用、交互状态
- \`useCallback\` 缓存 getNodeAt 函数
- \`useEffect\` 初始化组件，返回清理函数

## 十、返回组件
\`\`\`typescript
return (
  <div ref={containerRef} className="w-full h-full" style={{ minHeight: 400 }}>
    <canvas ref={canvasRef} className="block w-full h-full" />
  </div>
);
\`\`\`

---

技术要点：
1. 使用 requestAnimationFrame 实现流畅动画
2. 自定义物理引擎（不依赖 D3.js）
3. 四种力的组合：中心力 + 斥力 + 连接力 + 边界约束
4. Canvas 2D API 高性能渲染
5. 完整的拖拽和悬停交互
`;

