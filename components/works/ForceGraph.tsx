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

export const forceGraphCode = {
  core: `// Force Layout Core Simulation
// Custom force simulation implementation (no D3 dependency)

const alpha = { current: 1 };
const alphaDecay = 0.0228;
const velocityDecay = 0.6;

function tick() {
  // Center force - attracts nodes to center
  for (const node of nodes) {
    node.vx += (cx - node.x) * 0.01 * alpha.current;
    node.vy += (cy - node.y) * 0.01 * alpha.current;
  }

  // Charge force (repulsion between all node pairs)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      let dx = nodes[j].x - nodes[i].x;
      let dy = nodes[j].y - nodes[i].y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const strength = -150 * alpha.current / (dist * dist);
      const fx = dx / dist * strength;
      const fy = dy / dist * strength;
      nodes[i].vx -= fx;  nodes[i].vy -= fy;
      nodes[j].vx += fx;  nodes[j].vy += fy;
    }
  }

  // Link force (spring between connected nodes)
  for (const link of resolvedLinks) {
    let dx = link.target.x - link.source.x;
    let dy = link.target.y - link.source.y;
    let dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const strength = (dist - 40) / dist * 0.3 * alpha.current;
    link.source.vx += dx * strength;
    link.target.vx -= dx * strength;
  }

  // Apply velocity & decay
  for (const node of nodes) {
    node.vx *= velocityDecay;
    node.x += node.vx;
    node.vy *= velocityDecay;
    node.y += node.vy;
  }

  alpha.current *= (1 - alphaDecay);
}`,
  data: `// Data Generation
interface Node {
  id: string;
  group: number;
  x?: number; y?: number;
  vx?: number; vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | Node;
  target: string | Node;
  value: number;
}

function generateData() {
  const groups = 6, nodesPerGroup = 8;
  const nodes: Node[] = [];
  const links: Link[] = [];

  // Create nodes for each group
  for (let g = 0; g < groups; g++)
    for (let i = 0; i < nodesPerGroup; i++)
      nodes.push({ id: \`g\${g}-n\${i}\`, group: g });

  // Intra-group links (40% connection probability)
  for (let g = 0; g < groups; g++)
    for (let i = 0; i < nodesPerGroup; i++)
      for (let j = i + 1; j < nodesPerGroup; j++)
        if (Math.random() < 0.4)
          links.push({ source: \`g\${g}-n\${i}\`, target: \`g\${g}-n\${j}\`, value: 1 });

  // Inter-group links (1-3 bridges between groups)
  for (let g = 0; g < groups; g++)
    for (let h = g + 1; h < groups; h++) {
      const count = Math.floor(Math.random() * 3) + 1;
      for (let c = 0; c < count; c++)
        links.push({
          source: \`g\${g}-n\${Math.floor(Math.random() * nodesPerGroup)}\`,
          target: \`g\${h}-n\${Math.floor(Math.random() * nodesPerGroup)}\`,
          value: 2,
        });
    }

  return { nodes, links };
}`,
  styles: `// Canvas Rendering & Hover Interaction
const groupColors = [
  "#3b82f6", "#22d3ee", "#a78bfa",
  "#f472b6", "#34d399", "#fbbf24",
];

function draw() {
  ctx.clearRect(0, 0, w, h);

  // Highlighted connections for hovered node
  const connectedIds = new Set<string>();
  if (hovered) {
    connectedIds.add(hovered.id);
    for (const link of links) {
      if (link.source.id === hovered.id)
        connectedIds.add(link.target.id);
      if (link.target.id === hovered.id)
        connectedIds.add(link.source.id);
    }
  }

  // Draw links with conditional opacity
  for (const link of links) {
    const highlighted = hovered &&
      (link.source.id === hovered.id || link.target.id === hovered.id);
    ctx.strokeStyle = highlighted
      ? "rgba(59,130,246,0.6)"
      : hovered ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.08)";
    ctx.lineWidth = highlighted ? 1.5 : 0.5;
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.stroke();
  }

  // Draw nodes with group-based coloring
  for (const node of nodes) {
    const r = node === hovered ? 7 : 5;
    const color = groupColors[node.group % 6];
    const dimmed = hovered && !connectedIds.has(node.id);

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.fillStyle = dimmed ? color + "33" : color;
    ctx.fill();
  }
}`,
  full: `"use client";

import { useEffect, useRef, useCallback } from "react";

// Full component source - see ForceGraph.tsx
// Contains: data generation, force simulation,
// canvas rendering, drag interaction, hover highlighting,
// and responsive resizing.
// ~280 lines of TypeScript + Canvas2D code.`,
};
