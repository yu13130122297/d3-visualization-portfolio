"use client";

import { useEffect, useRef, useState } from "react";

interface TeachNode {
  id: string;
  label: string;
  text: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
}

interface LabelData {
  label: string;
  count: number;
  color: string;
  duration: number;
  nodes: TeachNode[]; // 该标签对应的所有节点
}

// 阶段定义
const PHASES = [
  { id: 1, name: "旧知回顾", subtitle: "引出新知" },
  { id: 2, name: "新知探究", subtitle: "梳理方法" },
  { id: 3, name: "知识应用", subtitle: "深化拓展" },
  { id: 4, name: "课堂总结", subtitle: "梳理升华" },
];

// 颜色映射 - 与 TeachTree 保持一致
const labelColors: Record<string, string> = {
  "学生发言": "#5B8DEE",
  "教师讲授": "#FFB347",
  "课堂沉寂": "#E0E0E0",
  "教师提问": "#FF8C00",
  "教师板书": "#A8A8A8",
  "教师巡视": "#C0C0C0",
  "教师指令": "#95E1D3",
  "教师反馈": "#4ECDC4",
  "学生讨论": "#7FB3D5",
  "技术操作": "#DDA0DD",
};

const defaultColors = [
  "#FF8C00", "#FFB347", "#4ECDC4", "#95E1D3", "#A8A8A8",
  "#C0C0C0", "#5B8DEE", "#7FB3D5", "#E0E0E0", "#DDA0DD"
];

// 共享的 describeArc 函数
const describeArc = (
  cx: number, cy: number, innerR: number, outerR: number,
  startAngle: number, endAngle: number
) => {
  const x1 = cx + outerR * Math.cos(startAngle);
  const y1 = cy + outerR * Math.sin(startAngle);
  const x2 = cx + outerR * Math.cos(endAngle);
  const y2 = cy + outerR * Math.sin(endAngle);
  const x3 = cx + innerR * Math.cos(endAngle);
  const y3 = cy + innerR * Math.sin(endAngle);
  const x4 = cx + innerR * Math.cos(startAngle);
  const y4 = cy + innerR * Math.sin(startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${x1.toFixed(4)} ${y1.toFixed(4)}`,
    `A ${outerR.toFixed(4)} ${outerR.toFixed(4)} 0 ${largeArc} 1 ${x2.toFixed(4)} ${y2.toFixed(4)}`,
    `L ${x3.toFixed(4)} ${y3.toFixed(4)}`,
    `A ${innerR.toFixed(4)} ${innerR.toFixed(4)} 0 ${largeArc} 0 ${x4.toFixed(4)} ${y4.toFixed(4)}`,
    "Z",
  ].join(" ");
};

// 缩略图玫瑰图组件
function MiniRingChart({ labelData, size, isSelected, onClick }: {
  labelData: LabelData[];
  size: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const config = {
    innerRadius: size * 0.15,
    maxOuterRadius: size * 0.45,
    sliceGap: 0.1,
    sliceHeight: size * 0.035,
  };

  const sectorCount = labelData.length;
  const slicesPerLayer = 4;

  // 计算总持续时间
  const totalDuration = labelData.reduce((sum, d) => sum + d.duration, 0);

  // 根据持续时间分配角度
  let currentAngle = -Math.PI / 2;
  const sectorsWithAngles = labelData.map((data) => {
    const startAngle = currentAngle;
    // 该扇区的角度 = 该标签总持续时间 / 总持续时间 * 2π
    const sectorAngle = (data.duration / totalDuration) * Math.PI * 2;
    const endAngle = startAngle + sectorAngle;
    currentAngle = endAngle;

    const maxLayers = Math.ceil((config.maxOuterRadius - config.innerRadius) / config.sliceHeight);
    const neededLayers = Math.min(Math.ceil(data.nodes.length / slicesPerLayer), maxLayers);
    const outerRadius = config.innerRadius + neededLayers * config.sliceHeight;
    return { ...data, startAngle, endAngle, outerRadius };
  });

  const nodePositions = labelData.flatMap((data, dataIndex) => {
    const sector = sectorsWithAngles[dataIndex];
    const sectorAngle = sector.endAngle - sector.startAngle;
    const totalNodes = data.nodes.length;

    return data.nodes.map((node, nodeIndex) => {
      const layer = Math.floor(nodeIndex / slicesPerLayer);
      const indexInLayer = nodeIndex % slicesPerLayer;
      const layerStartIndex = layer * slicesPerLayer;
      const layerEndIndex = Math.min(layerStartIndex + slicesPerLayer, totalNodes);
      const nodesInLayer = data.nodes.slice(layerStartIndex, layerEndIndex);
      const layerTotalDuration = nodesInLayer.reduce((sum, n) => sum + (n.duration || 0), 0);
      const prevNodesInLayerDuration = nodesInLayer.slice(0, indexInLayer).reduce((sum, n) => sum + (n.duration || 0), 0);
      const nodeStartAngle = sector.startAngle + (prevNodesInLayerDuration / layerTotalDuration) * sectorAngle;
      const nodeEndAngle = nodeStartAngle + ((node.duration || 0) / layerTotalDuration) * sectorAngle;
      const innerR = config.innerRadius + layer * config.sliceHeight;
      const outerR = innerR + config.sliceHeight;
      return { node, startAngle: nodeStartAngle, endAngle: nodeEndAngle, innerRadius: innerR, outerRadius: outerR, color: data.color, layer };
    });
  });

  const paths: React.ReactNode[] = [];
  sectorsWithAngles.forEach((sector, sectorIndex) => {
    const sectorNodes = nodePositions.filter(np =>
      sector.nodes.some(n => n.id === np.node.id)
    );
    sectorNodes.forEach((nodePos, index) => {
      const alpha = 1 - (nodePos.layer / Math.ceil((sector.outerRadius - config.innerRadius) / config.sliceHeight)) * 0.3;
      paths.push(
        <path
          key={`${sectorIndex}-slice-${index}`}
          d={describeArc(
            size / 2,
            size / 2,
            nodePos.innerRadius + config.sliceGap,
            nodePos.outerRadius - config.sliceGap,
            nodePos.startAngle,
            nodePos.endAngle
          )}
          fill={nodePos.color}
          fillOpacity={alpha}
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="0.5"
        />
      );
    });
  });

  return (
    <button
      onClick={onClick}
      className={`
        p-2 rounded-xl transition-all duration-300 flex items-center justify-center
        ${isSelected
          ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-white shadow-lg shadow-cyan-500/20 scale-105'
          : 'bg-slate-800/30 border-2 border-transparent hover:border-white hover:bg-slate-800/50'
        }
      `}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {paths}
      </svg>
    </button>
  );
}

// 放大的玫瑰图组件
function LargeRingChart({ labelData, size }: { labelData: LabelData[]; size: number }) {
  const [hoverNode, setHoverNode] = useState<TeachNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const config = {
    innerRadius: size * 0.05,
    maxOuterRadius: size * 0.45,
    sliceGap: 0.2,
    sliceHeight: size * 0.02, // 固定的切片高度
  };

  // 计算扇区数量和每个扇区的角度（根据持续时间比例）
  const sectorCount = labelData.length;
  const slicesPerLayer = 5; // 每层的切片数量优先值

  // 根据持续时间计算每个扇形的数据
  const totalDuration = labelData.reduce((sum, d) => sum + d.duration, 0);

  // 根据持续时间分配角度
  let currentAngle = -Math.PI / 2;
  const sectorsWithAngles = labelData.map((data) => {
    const startAngle = currentAngle;
    // 该扇区的角度 = 该标签总持续时间 / 总持续时间 * 2π
    const sectorAngle = (data.duration / totalDuration) * Math.PI * 2;
    const endAngle = startAngle + sectorAngle;
    currentAngle = endAngle;

    // 根据数据量计算需要的层数（每层优先放5个切片）
    const maxLayers = Math.ceil((config.maxOuterRadius - config.innerRadius) / config.sliceHeight);
    const neededLayers = Math.min(Math.ceil(data.nodes.length / slicesPerLayer), maxLayers);
    const outerRadius = config.innerRadius + neededLayers * config.sliceHeight;

    return { ...data, startAngle, endAngle, outerRadius };
  });

  // 计算每个节点在扇区内的位置
  const nodePositions = labelData.flatMap((data, dataIndex) => {
    const sector = sectorsWithAngles[dataIndex];
    const sectorDuration = data.duration;
    const totalNodes = data.nodes.length;

    // 计算该扇区的总宽度（基于角度和半径）
    const sectorAngle = sector.endAngle - sector.startAngle;

    return data.nodes.map((node, nodeIndex) => {
      // 计算该节点应该在第几层（从内到外）
      const layer = Math.floor(nodeIndex / slicesPerLayer);
      const indexInLayer = nodeIndex % slicesPerLayer;

      // 计算该层实际有多少个节点
      const layerStartIndex = layer * slicesPerLayer;
      const layerEndIndex = Math.min(layerStartIndex + slicesPerLayer, totalNodes);
      const nodesInLayer = data.nodes.slice(layerStartIndex, layerEndIndex);
      const nodesInThisLayer = nodesInLayer.length;

      // 计算该层所有节点的总持续时间
      const layerTotalDuration = nodesInLayer.reduce((sum, n) => sum + (n.duration || 0), 0);

      // 计算该节点在该层中的角度位置（基于持续时间）
      const prevNodesInLayerDuration = nodesInLayer.slice(0, indexInLayer).reduce((sum, n) => sum + (n.duration || 0), 0);
      const nodeStartAngle = sector.startAngle + (prevNodesInLayerDuration / layerTotalDuration) * sectorAngle;
      const nodeEndAngle = nodeStartAngle + ((node.duration || 0) / layerTotalDuration) * sectorAngle;

      const innerR = config.innerRadius + layer * config.sliceHeight;
      const outerR = innerR + config.sliceHeight;

      return {
        node,
        startAngle: nodeStartAngle,
        endAngle: nodeEndAngle,
        innerRadius: innerR,
        outerRadius: outerR,
        color: data.color,
        layer
      };
    });
  });

  const describeArc = (
    cx: number, cy: number, innerR: number, outerR: number,
    startAngle: number, endAngle: number
  ) => {
    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return [
      `M ${x1.toFixed(4)} ${y1.toFixed(4)}`,
      `A ${outerR.toFixed(4)} ${outerR.toFixed(4)} 0 ${largeArc} 1 ${x2.toFixed(4)} ${y2.toFixed(4)}`,
      `L ${x3.toFixed(4)} ${y3.toFixed(4)}`,
      `A ${innerR.toFixed(4)} ${innerR.toFixed(4)} 0 ${largeArc} 0 ${x4.toFixed(4)} ${y4.toFixed(4)}`,
      "Z",
    ].join(" ");
  };

  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = size / 2;
    const cy = size / 2;
    const dx = x - cx;
    const dy = y - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 检查是否在环形区域内
    if (distance < config.innerRadius || distance > config.maxOuterRadius) {
      setHoverNode(null);
      return;
    }

    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;
    const adjustedAngle = angle;

    // 查找对应的节点
    const hoveredNode = nodePositions.find(np => {
      // 检查距离是否在该节点的半径范围内
      if (distance < np.innerRadius || distance > np.outerRadius) return false;

      let start = np.startAngle;
      let end = np.endAngle;
      if (start < -Math.PI / 2) start += Math.PI * 2;
      if (end < -Math.PI / 2) end += Math.PI * 2;

      if (start > end) {
        return adjustedAngle >= start || adjustedAngle <= end;
      }
      return adjustedAngle >= start && adjustedAngle <= end;
    });

    if (hoveredNode) {
      setHoverNode(hoveredNode.node);
      setMousePos({ x: e.clientX, y: e.clientY });
    } else {
      setHoverNode(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverNode(null);
  };

  const renderSector = (
    sectorIndex: number, startAngle: number, endAngle: number,
    outerRadius: number, color: string, _label: string, _count: number, nodes: TeachNode[]
  ) => {
    const paths: React.ReactNode[] = [];

    // 获取该扇区所有节点的位置信息
    const sectorNodes = nodePositions.filter(np =>
      nodes.some(n => n.id === np.node.id)
    );

    // 为每个节点绘制一个切片（小矩形）
    sectorNodes.forEach((nodePos, index) => {
      const maxLayers = Math.ceil((outerRadius - config.innerRadius) / config.sliceHeight);
      const alpha = maxLayers > 0 ? 1 - (nodePos.layer / maxLayers) * 0.4 : 1;

      paths.push(
        <path
          key={`${sectorIndex}-slice-${index}`}
          d={describeArc(
            size / 2,
            size / 2,
            nodePos.innerRadius + config.sliceGap,
            nodePos.outerRadius - config.sliceGap,
            nodePos.startAngle,
            nodePos.endAngle
          )}
          fill={color}
          fillOpacity={Math.max(0.6, Math.min(1, alpha))}
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth="1"
          style={{ cursor: 'pointer' }}
        />
      );
    });

    return <g key={`sector-${sectorIndex}`}>{paths}</g>;
  };

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 处理鼠标滚轮缩放
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(3, transform.scale * delta));
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  // 处理拖拽开始
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0) { // 只处理左键
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  // 处理拖拽移动
  const handleMouseMoveWithDrag = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
    handleMouseMove(e);
  };

  // 处理拖拽结束
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col items-center relative">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onMouseMove={handleMouseMoveWithDrag}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseLeave();
          setIsDragging(false);
        }}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale}) translate(${size / 2}, ${size / 2})`}>
          <g transform={`translate(${-size / 2}, ${-size / 2})`}>
            {sectorsWithAngles.map((sector, index) =>
              renderSector(index, sector.startAngle, sector.endAngle, sector.outerRadius, sector.color, sector.label, sector.count, sector.nodes)
            )}
          </g>
        </g>
      </svg>

      {/* 悬停提示 */}
      {hoverNode && (
        <div
          className="fixed z-50 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl max-w-xs pointer-events-none"
          style={{
            left: mousePos.x + 15,
            top: mousePos.y + 15,
            transform: mousePos.x > window.innerWidth / 2 ? 'translateX(-100%)' : 'translateX(0)',
          }}
        >
          <div className="text-cyan-400 font-semibold text-sm mb-1">{hoverNode.label}</div>
          <div className="text-slate-300 text-xs mb-1">
            {formatTime(hoverNode.startTime || 0)} - {formatTime(hoverNode.endTime || 0)}
          </div>
          <div className="text-slate-400 text-xs leading-relaxed">
            {hoverNode.text}
          </div>
        </div>
      )}
    </div>
  );
}

export function RingChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phaseData, setPhaseData] = useState<LabelData[][]>([[], [], [], []]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // 监听容器大小变化
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    fetch("/TeachTree.jsonl")
      .then((res) => res.text())
      .then((text) => {
        const lines = text.trim().split("\n");
        const nodes: TeachNode[] = lines
          .filter((line) => line.trim())
          .map((line) => JSON.parse(line))
          .map((node) => {
            const match = node.id.match(/T\d+_(\d+)_(\d+)/);
            const startTime = match ? parseInt(match[1], 10) : 0;
            const endTime = match ? parseInt(match[2], 10) : 0;
            const duration = endTime - startTime;
            return { ...node, startTime, endTime, duration };
          })
          .sort((a, b) => a.id.localeCompare(b.id));

        const phases: Record<number, Record<string, { count: number; duration: number; nodes: TeachNode[] }>> = [1, 2, 3, 4].reduce((acc, phaseId) => {
          acc[phaseId] = {};
          return acc;
        }, {} as Record<number, Record<string, { count: number; duration: number; nodes: TeachNode[] }>>);

        nodes.forEach((node, index) => {
          const phaseIndex = Math.floor((index / nodes.length) * 4);
          const phaseId = Math.min(phaseIndex, 3) + 1;
          if (!phases[phaseId][node.label]) {
            phases[phaseId][node.label] = { count: 0, duration: 0, nodes: [] };
          }
          phases[phaseId][node.label].count += 1;
          phases[phaseId][node.label].duration += node.duration || 0;
          phases[phaseId][node.label].nodes.push(node);
        });

        const allPhaseData = Object.values(phases).map((phaseCounts) => {
          const allLabels = Object.keys(phases).reduce<Set<string>>((acc, phaseId) => {
            Object.keys(phases[+phaseId as keyof typeof phases]).forEach(label => acc.add(label));
            return acc;
          }, new Set());

          return Array.from(allLabels).map((label, index) => ({
            label,
            count: phaseCounts[label]?.count || 0,
            duration: phaseCounts[label]?.duration || 0,
            nodes: phaseCounts[label]?.nodes || [],
            color: labelColors[label] || defaultColors[index % defaultColors.length],
          })).filter(d => d.count > 0 && d.duration > 0).sort((a, b) => b.duration - a.duration);
        });

        setPhaseData(allPhaseData);
      })
      .catch(console.error);
  }, []);

  // 计算每个图表的尺寸 - 横向排列4个
  const chartSize = Math.min(containerSize.width / 4 - 16, containerSize.height - 16) * 2.5;

  return (
    <div ref={containerRef} className="h-full w-full bg-white p-2 overflow-hidden">
      {phaseData.some(d => d.length > 0) ? (
        <div className="flex flex-row gap-2 w-full h-full items-center justify-center">
          {PHASES.map((phase, index) => (
            <div key={phase.id} className="flex-1 flex items-center justify-center min-w-0 min-h-0 overflow-hidden">
              <LargeRingChart
                labelData={phaseData[index]}
                size={chartSize}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-slate-500 flex items-center justify-center h-full">加载中...</div>
      )}
    </div>
  );
}

// ==================== Prompt for recreating this Visualization ====================

export const ringChartPrompt = `# 教学阶段玫瑰图 - 多阶段环形时序可视化

请创建一个多阶段玫瑰图（Ring Chart）组件，用于展示教学过程中不同阶段的行为分布。使用纯 TypeScript 和 SVG 实现。

## 一、功能概述
- 从 JSONL 数据源加载教学行为序列数据
- 将数据按时间顺序分配到 4 个教学阶段
- 每个阶段使用环形玫瑰图展示各行为类型的分布
- 根据持续时间计算扇区角度
- 支持悬停显示详细信息（标签、时间、文本内容）
- 支持缩放和拖拽交互

## 二、数据结构

### 教学节点接口
\`\`\`typescript
interface TeachNode {
  id: string;         // 如 "T01_0000_0004"
  label: string;      // 行为类型："教师提问"、"学生发言" 等
  text: string;       // 具体文本内容
  startTime?: number; // 开始时间（秒）
  endTime?: number;   // 结束时间（秒）
  duration?: number;  // 持续时间（秒）
}
\`\`\`

### 标签数据接口
\`\`\`typescript
interface LabelData {
  label: string;      // 行为标签
  count: number;      // 该标签的节点数量
  color: string;      // 颜色
  duration: number;   // 该标签的总持续时间
  nodes: TeachNode[]; // 该标签对应的所有节点
}
\`\`\`

## 三、阶段定义

\`\`\`typescript
const PHASES = [
  { id: 1, name: "旧知回顾", subtitle: "引出新知" },
  { id: 2, name: "新知探究", subtitle: "梳理方法" },
  { id: 3, name: "知识应用", subtitle: "深化拓展" },
  { id: 4, name: "课堂总结", subtitle: "梳理升华" },
];
\`\`\`

## 四、颜色映射（与 TeachTree 保持一致）

\`\`\`typescript
const labelColors: Record<string, string> = {
  "学生发言": "#5B8DEE",
  "教师讲授": "#FFB347",
  "课堂沉寂": "#E0E0E0",
  "教师提问": "#FF8C00",
  "教师板书": "#A8A8A8",
  "教师巡视": "#C0C0C0",
  "教师指令": "#95E1D3",
  "教师反馈": "#4ECDC4",
  "学生讨论": "#7FB3D5",
  "技术操作": "#DDA0DD",
};
\`\`\`

## 五、数据处理

### 1. 从 JSONL 加载并解析数据

\`\`\`typescript
fetch("/TeachTree.jsonl")
  .then((res) => res.text())
  .then((text) => {
    const lines = text.trim().split("\\n");
    const nodes: TeachNode[] = lines
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line))
      .map((node) => {
        // 从 id 提取时间：T01_0000_0004 -> 起始=0, 结束=4, 持续时间=4
        const match = node.id.match(/T\\d+_(\\d+)_(\\d+)/);
        const startTime = match ? parseInt(match[1], 10) : 0;
        const endTime = match ? parseInt(match[2], 10) : 0;
        const duration = endTime - startTime;
        return { ...node, startTime, endTime, duration };
      })
      .sort((a, b) => a.id.localeCompare(b.id));
    // ... 处理数据
  });
\`\`\`

### 2. 分配到 4 个阶段

\`\`\`typescript
const phases: Record<number, Record<string, { count: number; duration: number; nodes: TeachNode[] }>> =
  [1, 2, 3, 4].reduce((acc, phaseId) => {
    acc[phaseId] = {};
    return acc;
  }, {} as Record<number, Record<string, { count: number; duration: number; nodes: TeachNode[] }>>);

nodes.forEach((node, index) => {
  // 根据位置均匀分配到 4 个阶段
  const phaseIndex = Math.floor((index / nodes.length) * 4);
  const phaseId = Math.min(phaseIndex, 3) + 1;

  if (!phases[phaseId][node.label]) {
    phases[phaseId][node.label] = { count: 0, duration: 0, nodes: [] };
  }
  phases[phaseId][node.label].count += 1;
  phases[phaseId][node.label].duration += node.duration || 0;
  phases[phaseId][node.label].nodes.push(node);
});

// 转换为 LabelData 数组
const allPhaseData = Object.values(phases).map((phaseCounts) => {
  return Array.from(allLabels).map((label, index) => ({
    label,
    count: phaseCounts[label]?.count || 0,
    duration: phaseCounts[label]?.duration || 0,
    nodes: phaseCounts[label]?.nodes || [],
    color: labelColors[label] || defaultColors[index % defaultColors.length],
  })).filter(d => d.count > 0 && d.duration > 0).sort((a, b) => b.duration - a.duration);
});
\`\`\`

## 六、SVG 弧形路径生成

\`\`\`typescript
function describeArc(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
): string {
  const x1 = cx + outerR * Math.cos(startAngle);
  const y1 = cy + outerR * Math.sin(startAngle);
  const x2 = cx + outerR * Math.cos(endAngle);
  const y2 = cy + outerR * Math.sin(endAngle);
  const x3 = cx + innerR * Math.cos(endAngle);
  const y3 = cy + innerR * Math.sin(endAngle);
  const x4 = cx + innerR * Math.cos(startAngle);
  const y4 = cy + innerR * Math.sin(startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    \`M \${x1.toFixed(4)} \${y1.toFixed(4)}\`,
    \`A \${outerR.toFixed(4)} \${outerR.toFixed(4)} 0 \${largeArc} 1 \${x2.toFixed(4)} \${y2.toFixed(4)}\`,
    \`L \${x3.toFixed(4)} \${y3.toFixed(4)}\`,
    \`A \${innerR.toFixed(4)} \${innerR.toFixed(4)} 0 \${largeArc} 0 \${x4.toFixed(4)} \${y4.toFixed(4)}\`,
    "Z",
  ].join(" ");
}
\`\`\`

## 七、玫瑰图渲染组件

\`\`\`typescript
function LargeRingChart({ labelData, size }: { labelData: LabelData[]; size: number }) {
  const [hoverNode, setHoverNode] = useState<TeachNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const config = {
    innerRadius: size * 0.05,
    maxOuterRadius: size * 0.45,
    sliceGap: 0.2,
    sliceHeight: size * 0.02,  // 固定的切片高度
  };

  // 根据持续时间计算每个扇形的角度
  const totalDuration = labelData.reduce((sum, d) => sum + d.duration, 0);

  let currentAngle = -Math.PI / 2;
  const sectorsWithAngles = labelData.map((data) => {
    const startAngle = currentAngle;
    // 扇区角度 = 该标签总持续时间 / 总持续时间 * 2π
    const sectorAngle = (data.duration / totalDuration) * Math.PI * 2;
    const endAngle = startAngle + sectorAngle;
    currentAngle = endAngle;

    // 根据数据量计算需要的层数
    const slicesPerLayer = 5;
    const maxLayers = Math.ceil((config.maxOuterRadius - config.innerRadius) / config.sliceHeight);
    const neededLayers = Math.min(Math.ceil(data.nodes.length / slicesPerLayer), maxLayers);
    const outerRadius = config.innerRadius + neededLayers * config.sliceHeight;

    return { ...data, startAngle, endAngle, outerRadius };
  });

  // 计算每个节点在扇区内的位置
  const nodePositions = labelData.flatMap((data, dataIndex) => {
    const sector = sectorsWithAngles[dataIndex];
    const sectorAngle = sector.endAngle - sector.startAngle;
    const totalNodes = data.nodes.length;

    return data.nodes.map((node, nodeIndex) => {
      const layer = Math.floor(nodeIndex / slicesPerLayer);
      const indexInLayer = nodeIndex % slicesPerLayer;

      // 计算该层实际有多少个节点
      const layerStartIndex = layer * slicesPerLayer;
      const layerEndIndex = Math.min(layerStartIndex + slicesPerLayer, totalNodes);
      const nodesInLayer = data.nodes.slice(layerStartIndex, layerEndIndex);
      const layerTotalDuration = nodesInLayer.reduce((sum, n) => sum + (n.duration || 0), 0);

      // 基于持续时间计算节点角度位置
      const prevNodesInLayerDuration = nodesInLayer.slice(0, indexInLayer)
        .reduce((sum, n) => sum + (n.duration || 0), 0);
      const nodeStartAngle = sector.startAngle + (prevNodesInLayerDuration / layerTotalDuration) * sectorAngle;
      const nodeEndAngle = nodeStartAngle + ((node.duration || 0) / layerTotalDuration) * sectorAngle;

      const innerR = config.innerRadius + layer * config.sliceHeight;
      const outerR = innerR + config.sliceHeight;

      return {
        node,
        startAngle: nodeStartAngle,
        endAngle: nodeEndAngle,
        innerRadius: innerR,
        outerRadius: outerR,
        color: data.color,
        layer
      };
    });
  });

  // 鼠标悬停检测
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = size / 2;
    const cy = size / 2;
    const dx = x - cx;
    const dy = y - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 检查是否在环形区域内
    if (distance < config.innerRadius || distance > config.maxOuterRadius) {
      setHoverNode(null);
      return;
    }

    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;
    const adjustedAngle = angle;

    // 查找对应的节点
    const hoveredNode = nodePositions.find(np => {
      // 检查距离
      if (distance < np.innerRadius || distance > np.outerRadius) return false;

      let start = np.startAngle;
      let end = np.endAngle;
      if (start < -Math.PI / 2) start += Math.PI * 2;
      if (end < -Math.PI / 2) end += Math.PI * 2;

      if (start > end) {
        return adjustedAngle >= start || adjustedAngle <= end;
      }
      return adjustedAngle >= start && adjustedAngle <= end;
    });

    if (hoveredNode) {
      setHoverNode(hoveredNode.node);
      setMousePos({ x: e.clientX, y: e.clientY });
    } else {
      setHoverNode(null);
    }
  };

  // 滚轮缩放
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(3, transform.scale * delta));
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  // 拖拽
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMoveWithDrag = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
    handleMouseMove(e);
  };

  // 渲染扇区
  const renderSector = (
    sectorIndex: number,
    startAngle: number,
    endAngle: number,
    outerRadius: number,
    color: string,
    nodes: TeachNode[]
  ) => {
    const paths: React.ReactNode[] = [];

    const sectorNodes = nodePositions.filter(np =>
      nodes.some(n => n.id === np.node.id)
    );

    sectorNodes.forEach((nodePos, index) => {
      const maxLayers = Math.ceil((outerRadius - config.innerRadius) / config.sliceHeight);
      const alpha = maxLayers > 0 ? 1 - (nodePos.layer / maxLayers) * 0.4 : 1;

      paths.push(
        <path
          key={\`\${sectorIndex}-slice-\${index}\`}
          d={describeArc(
            size / 2,
            size / 2,
            nodePos.innerRadius + config.sliceGap,
            nodePos.outerRadius - config.sliceGap,
            nodePos.startAngle,
            nodePos.endAngle
          )}
          fill={color}
          fillOpacity={Math.max(0.6, Math.min(1, alpha))}
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth="1"
          style={{ cursor: 'pointer' }}
        />
      );
    });

    return <g key={\`sector-\${sectorIndex}\`}>{paths}</g>;
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return \`\${mins}:\${secs.toString().padStart(2, '0')}\`;
  };

  return (
    <div className="flex flex-col items-center relative">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={\`0 0 \${size} \${size}\`}
        onMouseMove={handleMouseMoveWithDrag}
        onMouseDown={handleMouseDown}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => {
          setHoverNode(null);
          setIsDragging(false);
        }}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <g transform={\`translate(\${transform.x}, \${transform.y}) scale(\${transform.scale}) translate(\${size / 2}, \${size / 2})\`}>
          <g transform={\`translate(\${-size / 2}, \${-size / 2})\`}>
            {sectorsWithAngles.map((sector, index) =>
              renderSector(index, sector.startAngle, sector.endAngle, sector.outerRadius, sector.color, sector.nodes)
            )}
          </g>
        </g>
      </svg>

      {/* 悬停提示 */}
      {hoverNode && (
        <div
          className="fixed z-50 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl max-w-xs pointer-events-none"
          style={{
            left: mousePos.x + 15,
            top: mousePos.y + 15,
            transform: mousePos.x > window.innerWidth / 2 ? 'translateX(-100%)' : 'translateX(0)',
          }}
        >
          <div className="text-cyan-400 font-semibold text-sm mb-1">{hoverNode.label}</div>
          <div className="text-slate-300 text-xs mb-1">
            {formatTime(hoverNode.startTime || 0)} - {formatTime(hoverNode.endTime || 0)}
          </div>
          <div className="text-slate-400 text-xs leading-relaxed">
            {hoverNode.text}
          </div>
        </div>
      )}
    </div>
  );
}
\`\`\`

## 八、主组件

\`\`\`typescript
export function RingChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phaseData, setPhaseData] = useState<LabelData[][]>([[], [], [], []]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // 监听容器大小变化
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 加载数据
  useEffect(() => {
    fetch("/TeachTree.jsonl")
      .then((res) => res.text())
      .then((text) => {
        // ... 数据处理（见上文）
        setPhaseData(allPhaseData);
      });
  }, []);

  // 计算每个图表的尺寸 - 横向排列 4 个
  const chartSize = Math.min(containerSize.width / 4 - 16, containerSize.height - 16) * 2.5;

  return (
    <div ref={containerRef} className="h-full w-full bg-white p-2 overflow-hidden">
      {phaseData.some(d => d.length > 0) ? (
        <div className="flex flex-row gap-2 w-full h-full items-center justify-center">
          {PHASES.map((phase, index) => (
            <div key={phase.id} className="flex-1 flex items-center justify-center min-w-0 min-h-0 overflow-hidden">
              <LargeRingChart
                labelData={phaseData[index]}
                size={chartSize}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-slate-500 flex items-center justify-center h-full">加载中...</div>
      )}
    </div>
  );
}
\`\`\`

## 九、样式要点
1. **环形布局**：使用 SVG path 绘制环形扇区
2. **角度计算**：根据持续时间比例分配角度
3. **多层排列**：节点按层排列，每层固定 5 个切片
4. **透明度渐变**：外层节点透明度降低
5. **悬停交互**：显示节点详细信息（标签、时间范围、文本内容）
6. **缩放拖拽**：支持鼠标滚轮缩放、左键拖拽
7. **响应式布局**：使用 ResizeObserver 监听容器大小

---

技术要点：
1. 使用 SVG path 和 describeArc 函数绘制环形扇区
2. 基于持续时间计算角度和节点位置
3. 极坐标到直角坐标的转换
4. 鼠标位置到极坐标的转换（用于悬停检测）
5. 滚轮缩放和拖拽平移
6. 4 个教学阶段并列展示
`;

