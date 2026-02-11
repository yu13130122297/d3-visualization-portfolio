import type { VisualizationWork } from "@/types/work";
import { ForceGraph, forceGraphPrompt } from "@/components/works/ForceGraph";
import { StreamGraph, streamGraphPrompt } from "@/components/works/StreamGraph";
import { TeachTree, teachTreePrompt } from "@/components/works/TeachTree";
import { RingChart, ringChartPrompt } from "@/components/works/RingChart";
import { LagSequentialAnalysis, lagSequentialAnalysisPrompt } from "@/components/works/LagSequentialAnalysis";

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
    prompt: forceGraphPrompt,
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
    prompt: streamGraphPrompt,
    metadata: {
      dataSource: "模拟趋势数据（正弦波合成）",
      tools: ["Canvas2D", "自定义堆叠算法"],
      createdAt: "2024-05-20",
      inspiration:
        "灵感来源于 Lee Byron 的 StreamGraph 和纽约时报的可视化。",
    },
  },
  {
    id: "teach-tree",
    title: "教学交互模式分析",
    subtitle: "课堂互动行为的模式挖掘与树形可视化",
    description:
      "一个教学交互模式分析系统，包含模式挖掘表和交互树。支持从课堂实录中挖掘教师与学生的行为模式，并以树形结构可视化展示。",
    fullDescription:
      "该系统通过分析课堂实录数据，将连续的相同行为合并，然后使用 N-gram 算法（N=2~15）挖掘所有出现的行为链模式。左侧的模式挖掘表展示所有发现的模式，按链长度和出现频次排序。右侧的交互树使用 D3.js 树形布局将模式组织成层次结构，节点大小表示该行为在模式中出现的聚合计数。用户可以点击表格中的模式，在树形图中高亮显示对应的路径，非相关节点会自动淡化。教师行为使用暖色系（橙色系），学生行为使用冷色系（蓝色系），沉默使用灰色，实现直观的行为类型区分。",
    category: "network",
    tags: ["D3.js", "Pattern Mining", "Hierarchical Data", "Interactive"],
    component: TeachTree,
    prompt: teachTreePrompt,
    metadata: {
      dataSource: "课堂实录 JSONL 数据",
      tools: ["D3.js", "N-gram 算法", "树形布局"],
      createdAt: "2024-06-01",
      inspiration:
        "基于课堂行为分析研究，将文本化的课堂实录转换为可视化的行为模式图谱。",
    },
  },
  {
    id: "ring-chart",
    title: "教学阶段玫瑰图",
    subtitle: "课堂教学四阶段交互行为可视化",
    description:
      "一个环形玫瑰图系统，展示课堂教学的四个阶段（旧知回顾、新知探究、知识应用、课堂总结）中各类教学行为的持续时间和分布情况。",
    fullDescription:
      "该玫瑰图将整堂课按时间顺序划分为四个教学阶段，每个阶段占据圆环的一个扇形区域。扇形的角度范围基于该阶段的教学时间比例动态分配。每个扇区内部按教学行为类型（教师讲授、学生发言、教师提问、课堂沉寂等）进行分层展示，层级数量由该行为出现的频次决定。切片的长度对应单个教学行为的持续时间，采用白色半透明边框增强视觉区分度。支持鼠标滚轮缩放和拖拽平移，悬停时显示详细的教学行为信息（行为类型、时间段、具体内容）。该可视化帮助教师直观分析课堂互动模式在时间维度上的分布特征。",
    category: "timeline",
    tags: ["SVG", "Rose Chart", "Polar Coordinates", "Teaching Analytics"],
    component: RingChart,
    prompt: ringChartPrompt,
    metadata: {
      dataSource: "课堂实录 JSONL 数据",
      tools: ["SVG", "极坐标系统", "交互式缩放/拖拽"],
      createdAt: "2024-06-15",
      inspiration:
        "基于课堂教学研究，将线性时间轴转换为环形结构，直观展示不同阶段的教学行为分布。",
    },
  },
  {
    id: "lag-sequential-analysis",
    title: "滞后序列分析热力图",
    subtitle: "基于 Z-Score 的课堂行为模式显著性分析",
    description:
      "一个基于滞后序列分析 (Lag Sequential Analysis, LSA) 的热力图可视化，识别教学行为转移的显著模式。使用调整后标准化残差 (Z-Score) 区分显著正负相关与随机噪音。",
    fullDescription:
      "该可视化通过分析课堂实录数据的时间序列，构建观测矩阵（实际转移次数）和期望矩阵（随机情况下的理论频次），然后计算调整后标准化残差 (Z-Score) 来判断行为转移模式的显著性。热力图中，行表示前一行为 (t)，列表示后一行为 (t+1)，单元格显示 Z-Score 值。Z > 1.96 用红色表示显著正相关，说明该行为模式显著存在；Z < -1.96 用蓝色表示显著负相关，说明该行为模式被抑制；灰色区域表示无显著性的随机噪音。右侧智能分析面板自动列出 Z-Score 最高和最低的前 3 个模式，帮助教师快速识别课堂中的核心互动模式。支持多种图表比例切换，适应不同屏幕尺寸。",
    category: "network",
    tags: ["SVG", "LSA Algorithm", "Heatmap", "Statistical Analysis", "Interactive"],
    component: LagSequentialAnalysis,
    prompt: lagSequentialAnalysisPrompt,
    metadata: {
      dataSource: "课堂实录 JSONL 数据",
      tools: ["SVG", "滞后序列分析算法", "Z-Score 计算"],
      createdAt: "2024-06-20",
      inspiration:
        "基于 Bakeman 和 Gottman 的序列分析理论，将传统的统计学方法应用于课堂行为分析，识别非随机的教学互动模式。",
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
