"use client";

import { useEffect, useRef, useCallback } from "react";

interface DataPoint {
  date: number;
  values: number[];
}

function generateStreamData(
  layers: number,
  points: number
): { data: DataPoint[]; labels: string[] } {
  const labels = [
    "TypeScript",
    "Python",
    "Rust",
    "Go",
    "JavaScript",
    "Java",
    "C++",
  ].slice(0, layers);

  const data: DataPoint[] = [];
  const baseAmplitudes = labels.map(() => 20 + Math.random() * 40);
  const phases = labels.map(() => Math.random() * Math.PI * 2);

  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const values = labels.map((_, li) => {
      const wave1 = Math.sin(t * Math.PI * 2 + phases[li]) * baseAmplitudes[li] * 0.5;
      const wave2 = Math.sin(t * Math.PI * 4 + phases[li] * 2) * baseAmplitudes[li] * 0.25;
      const trend = Math.sin(t * Math.PI) * baseAmplitudes[li] * 0.3;
      return Math.max(2, baseAmplitudes[li] + wave1 + wave2 + trend);
    });
    data.push({ date: 2018 + t * 7, values });
  }

  return { data, labels };
}

const streamColors = [
  "#3b82f6",
  "#22d3ee",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#f97316",
];

export function StreamGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const dataRef = useRef<ReturnType<typeof generateStreamData> | null>(null);
  const hoveredLayerRef = useRef<number>(-1);
  const mouseXRef = useRef<number>(-1);
  const sizeRef = useRef({ width: 0, height: 0 });
  const progressRef = useRef(0);

  const getLayerAt = useCallback(
    (x: number, y: number): number => {
      if (!dataRef.current) return -1;
      const { data } = dataRef.current;
      const w = sizeRef.current.width;
      const h = sizeRef.current.height;
      const margin = { top: 40, right: 20, bottom: 40, left: 20 };
      const innerW = w - margin.left - margin.right;
      const innerH = h - margin.top - margin.bottom;

      const xIdx = Math.round(
        ((x - margin.left) / innerW) * (data.length - 1)
      );
      if (xIdx < 0 || xIdx >= data.length) return -1;

      const point = data[xIdx];
      const total = point.values.reduce((a, b) => a + b, 0);
      const centerY = margin.top + innerH / 2;
      const scale = innerH / (total * 1.2);

      let currentY = centerY - (total * scale) / 2;

      for (let li = 0; li < point.values.length; li++) {
        const layerH = point.values[li] * scale;
        if (y >= currentY && y <= currentY + layerH) return li;
        currentY += layerH;
      }
      return -1;
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      sizeRef.current = { width: rect.width, height: rect.height };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const generated = generateStreamData(7, 120);
    dataRef.current = generated;
    progressRef.current = 0;

    function draw() {
      const { data, labels } = dataRef.current!;
      const w = sizeRef.current.width;
      const h = sizeRef.current.height;
      const margin = { top: 40, right: 20, bottom: 40, left: 20 };
      const innerW = w - margin.left - margin.right;
      const innerH = h - margin.top - margin.bottom;

      ctx.clearRect(0, 0, w, h);

      // Animate reveal
      progressRef.current = Math.min(1, progressRef.current + 0.015);
      const progress = progressRef.current;
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const visiblePoints = Math.ceil(data.length * easedProgress);

      const hoveredLayer = hoveredLayerRef.current;
      const mouseX = mouseXRef.current;

      // Compute stacked positions
      const layers = labels.length;
      const stackedTop: number[][] = [];
      const stackedBottom: number[][] = [];

      for (let li = 0; li < layers; li++) {
        stackedTop.push([]);
        stackedBottom.push([]);
      }

      for (let i = 0; i < visiblePoints; i++) {
        const point = data[i];
        const total = point.values.reduce((a, b) => a + b, 0);
        const centerY = margin.top + innerH / 2;
        const scale = innerH / (total * 1.2);
        let y = centerY - (total * scale) / 2;

        for (let li = 0; li < layers; li++) {
          const layerH = point.values[li] * scale;
          stackedTop[li].push(y);
          stackedBottom[li].push(y + layerH);
          y += layerH;
        }
      }

      // Draw layers
      for (let li = 0; li < layers; li++) {
        const isHovered = hoveredLayer === li;
        const dimmed = hoveredLayer >= 0 && !isHovered;
        const color = streamColors[li % streamColors.length];

        ctx.beginPath();
        for (let i = 0; i < visiblePoints; i++) {
          const x = margin.left + (i / (data.length - 1)) * innerW;
          if (i === 0) ctx.moveTo(x, stackedTop[li][i]);
          else ctx.lineTo(x, stackedTop[li][i]);
        }
        for (let i = visiblePoints - 1; i >= 0; i--) {
          const x = margin.left + (i / (data.length - 1)) * innerW;
          ctx.lineTo(x, stackedBottom[li][i]);
        }
        ctx.closePath();

        ctx.globalAlpha = dimmed ? 0.15 : isHovered ? 1 : 0.75;
        ctx.fillStyle = color;
        ctx.fill();

        if (isHovered) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 1;
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;

      // X axis labels
      ctx.fillStyle = "rgba(160,160,160,0.6)";
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
      for (const yr of years) {
        const t = (yr - 2018) / 7;
        const x = margin.left + t * innerW;
        if (x >= margin.left && x <= w - margin.right) {
          ctx.fillText(yr.toString(), x, h - margin.bottom + 20);
        }
      }

      // Tooltip
      if (hoveredLayer >= 0 && mouseX >= margin.left && mouseX <= w - margin.right) {
        const xIdx = Math.round(
          ((mouseX - margin.left) / innerW) * (data.length - 1)
        );
        if (xIdx >= 0 && xIdx < data.length) {
          const point = data[xIdx];
          const val = point.values[hoveredLayer];
          const label = labels[hoveredLayer];
          const year = point.date.toFixed(1);
          const tooltipY = (stackedTop[hoveredLayer][xIdx] + stackedBottom[hoveredLayer][xIdx]) / 2;

          // Vertical line
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mouseX, margin.top);
          ctx.lineTo(mouseX, h - margin.bottom);
          ctx.stroke();
          ctx.setLineDash([]);

          // Tooltip box
          const text1 = label;
          const text2 = `${year} : ${val.toFixed(1)}`;
          ctx.font = "bold 12px Inter, system-ui, sans-serif";
          const tw1 = ctx.measureText(text1).width;
          ctx.font = "11px Inter, system-ui, sans-serif";
          const tw2 = ctx.measureText(text2).width;
          const boxW = Math.max(tw1, tw2) + 20;
          let tx = mouseX + 15;
          let ty = tooltipY - 25;
          if (tx + boxW > w - 10) tx = mouseX - boxW - 15;
          if (ty < 10) ty = 10;

          ctx.fillStyle = "rgba(0,0,0,0.9)";
          ctx.beginPath();
          ctx.roundRect(tx, ty, boxW, 42, 6);
          ctx.fill();

          ctx.fillStyle = streamColors[hoveredLayer % streamColors.length];
          ctx.beginPath();
          ctx.arc(tx + 10, ty + 15, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#fff";
          ctx.font = "bold 12px Inter, system-ui, sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(text1, tx + 20, ty + 18);
          ctx.fillStyle = "#aaa";
          ctx.font = "11px Inter, system-ui, sans-serif";
          ctx.fillText(text2, tx + 20, ty + 34);
        }
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(draw);
      }
    }

    animationRef.current = requestAnimationFrame(draw);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseXRef.current = x;
      hoveredLayerRef.current = getLayerAt(x, y);
      canvas.style.cursor = hoveredLayerRef.current >= 0 ? "pointer" : "default";
      cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(draw);
    };

    const onMouseLeave = () => {
      hoveredLayerRef.current = -1;
      mouseXRef.current = -1;
      cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(draw);
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("resize", () => {
      resize();
      cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(draw);
    });

    return () => {
      cancelAnimationFrame(animationRef.current);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [getLayerAt]);

  return (
    <div ref={containerRef} className="w-full h-full" style={{ minHeight: 400 }}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

export const streamGraphCode = {
  core: `// Stream Graph Core Rendering
// Stacked area chart with wiggle offset (stream layout)

function draw() {
  const { data, labels } = dataRef.current;
  const layers = labels.length;

  // Compute stacked positions (wiggle baseline)
  for (let i = 0; i < visiblePoints; i++) {
    const point = data[i];
    const total = point.values.reduce((a, b) => a + b, 0);
    const centerY = margin.top + innerH / 2;
    const scale = innerH / (total * 1.2);
    let y = centerY - (total * scale) / 2;

    for (let li = 0; li < layers; li++) {
      const layerH = point.values[li] * scale;
      stackedTop[li].push(y);
      stackedBottom[li].push(y + layerH);
      y += layerH;
    }
  }

  // Draw each stream layer as filled path
  for (let li = 0; li < layers; li++) {
    ctx.beginPath();
    // Top edge (left to right)
    for (let i = 0; i < visiblePoints; i++) {
      const x = margin.left + (i / (data.length - 1)) * innerW;
      if (i === 0) ctx.moveTo(x, stackedTop[li][i]);
      else ctx.lineTo(x, stackedTop[li][i]);
    }
    // Bottom edge (right to left)
    for (let i = visiblePoints - 1; i >= 0; i--) {
      const x = margin.left + (i / (data.length - 1)) * innerW;
      ctx.lineTo(x, stackedBottom[li][i]);
    }
    ctx.closePath();
    ctx.globalAlpha = hoveredLayer === li ? 1 : 0.75;
    ctx.fillStyle = streamColors[li];
    ctx.fill();
  }
}`,
  data: `// Stream Data Generation
interface DataPoint {
  date: number;
  values: number[];
}

function generateStreamData(layers: number, points: number) {
  const labels = [
    "TypeScript", "Python", "Rust", "Go",
    "JavaScript", "Java", "C++"
  ].slice(0, layers);

  const data: DataPoint[] = [];
  const baseAmplitudes = labels.map(() => 20 + Math.random() * 40);
  const phases = labels.map(() => Math.random() * Math.PI * 2);

  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const values = labels.map((_, li) => {
      // Combine multiple sine waves for organic appearance
      const wave1 = Math.sin(t * Math.PI * 2 + phases[li])
                     * baseAmplitudes[li] * 0.5;
      const wave2 = Math.sin(t * Math.PI * 4 + phases[li] * 2)
                     * baseAmplitudes[li] * 0.25;
      const trend = Math.sin(t * Math.PI) * baseAmplitudes[li] * 0.3;
      return Math.max(2, baseAmplitudes[li] + wave1 + wave2 + trend);
    });
    data.push({ date: 2018 + t * 7, values });
  }

  return { data, labels };
}`,
  styles: `// Hover & Tooltip Interaction
const streamColors = [
  "#3b82f6", "#22d3ee", "#a78bfa",
  "#f472b6", "#34d399", "#fbbf24", "#f97316"
];

// Layer detection from mouse position
function getLayerAt(x: number, y: number): number {
  const xIdx = Math.round(((x - margin.left) / innerW) * (data.length - 1));
  if (xIdx < 0 || xIdx >= data.length) return -1;

  const point = data[xIdx];
  const total = point.values.reduce((a, b) => a + b, 0);
  const scale = innerH / (total * 1.2);
  let currentY = centerY - (total * scale) / 2;

  for (let li = 0; li < point.values.length; li++) {
    const layerH = point.values[li] * scale;
    if (y >= currentY && y <= currentY + layerH) return li;
    currentY += layerH;
  }
  return -1;
}

// Tooltip rendering
if (hoveredLayer >= 0) {
  // Vertical crosshair line
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.moveTo(mouseX, margin.top);
  ctx.lineTo(mouseX, h - margin.bottom);
  ctx.stroke();

  // Info box
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  ctx.roundRect(tx, ty, boxW, 42, 6);
  ctx.fill();

  // Color indicator + label + value
  ctx.fillStyle = streamColors[hoveredLayer];
  ctx.arc(tx + 10, ty + 15, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillText(label, tx + 20, ty + 18);
  ctx.fillText(year + " : " + value, tx + 20, ty + 34);
}`,
  full: `"use client";

import { useEffect, useRef, useCallback } from "react";

// Full component source - see StreamGraph.tsx
// Contains: data generation with sine wave composition,
// stacked area rendering, hover layer detection,
// tooltip display, and entrance animation.
// ~220 lines of TypeScript + Canvas2D code.`,
};
