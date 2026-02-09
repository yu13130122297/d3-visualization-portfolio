import type { VisualizationWork } from "@/types/work";
import { ForceGraph, forceGraphCode } from "@/components/works/ForceGraph";
import { StreamGraph, streamGraphCode } from "@/components/works/StreamGraph";

export const workRegistry: VisualizationWork[] = [
  {
    id: "force-network",
    title: "社交网络图谱",
    subtitle: "交互式力导向网络可视化",
    description:
      "一个交互式力导向图，可视化展示 6 组用户之间的社交网络连接。支持拖拽交互、悬停高亮和平滑的物理模拟。",
    fullDescription:
      "该可视化使用自定义力模拟引擎来建模社交网络关系。节点按社区分组并用颜色编码。物理引擎实现了三种核心力：保持图谱居中的中心引力、所有节点对之间基于反平方定律的电荷斥力、以及沿链接维持连接距离的弹簧力。用户可以拖拽节点重新排列布局，悬停时高亮节点的直接连接并弱化网络中不相关的部分。",
    category: "network",
    tags: ["Canvas", "Force Layout", "Physics Simulation", "Interactive"],
    component: ForceGraph,
    sourceCode: {
      core: forceGraphCode.core,
      data: forceGraphCode.data,
      styles: forceGraphCode.styles,
      full: forceGraphCode.full,
    },
    metadata: {
      dataSource: "程序化生成的网络数据",
      tools: ["Canvas2D", "自定义力引擎"],
      createdAt: "2024-03-15",
      inspiration:
        "灵感来源于 D3.js 力导向图示例和社交网络分析研究。",
    },
  },
  {
    id: "stream-graph",
    title: "编程语言趋势",
    subtitle: "语言流行度随时间变化的流图",
    description:
      "一个流图（主题河流），展示 2018 至 2025 年编程语言的相对流行度变化，具有平滑的有机曲线和悬停交互。",
    fullDescription:
      "该流图使用摆动基线偏移来创建视觉上平衡的有机流动形状。每一层代表一种编程语言随时间的相对流行度。数据通过具有不同振幅和相位的复合正弦波生成，以模拟真实的趋势模式。该可视化具有从左到右逐步揭示数据的入场动画、基于悬停的图层高亮显示（带十字线提示框），以及弱化未悬停图层以聚焦。",
    category: "timeline",
    tags: ["Canvas", "Stream Graph", "Time Series", "Animation"],
    component: StreamGraph,
    sourceCode: {
      core: streamGraphCode.core,
      data: streamGraphCode.data,
      styles: streamGraphCode.styles,
      full: streamGraphCode.full,
    },
    metadata: {
      dataSource: "模拟趋势数据（正弦波合成）",
      tools: ["Canvas2D", "自定义堆叠算法"],
      createdAt: "2024-05-20",
      inspiration:
        "灵感来源于 Lee Byron 的 StreamGraph 和纽约时报的可视化。",
    },
  },
];

export function getWorkById(id: string): VisualizationWork | undefined {
  return workRegistry.find((w) => w.id === id);
}

export function getAdjacentWorks(id: string): {
  prev: VisualizationWork | null;
  next: VisualizationWork | null;
} {
  const idx = workRegistry.findIndex((w) => w.id === id);
  return {
    prev: idx > 0 ? workRegistry[idx - 1] : null,
    next: idx < workRegistry.length - 1 ? workRegistry[idx + 1] : null,
  };
}
