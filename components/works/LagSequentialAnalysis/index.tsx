/**
 * 滞后序列分析 (Lag Sequential Analysis, LSA) 可视化组件
 *
 * 基于调整后标准化残差 (Z-Score) 的课堂行为热力图
 *
 * 核心算法：
 * 1. 构建观测矩阵 (O_{ij})：统计从行为 i 转移到行为 j 的实际次数
 * 2. 构建期望矩阵 (E_{ij})：计算随机情况下的理论频次
 * 3. 计算 Z-Score：判断行为转移模式的显著性
 *
 * Z_{ij} = (O_{ij} - E_{ij}) / sqrt(E_{ij} * (1 - 行比例_i) * (1 - 列比例_j))
 */

"use client";

import { useEffect, useRef, useState } from "react";
import type { RawDataItem, LSAAnalysisResult, TooltipInfo } from "./types";
import { runLSAAnalysis } from "./utils";
import { HeatmapGrid } from "./HeatmapGrid";
import { DEFAULT_CONFIG, COLORS } from "./constants";

/**
 * 主组件：滞后序列分析可视化
 */
export function LagSequentialAnalysis() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [data, setData] = useState<RawDataItem[]>([]);
  const [result, setResult] = useState<LSAAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  // 缩放和平移状态
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 监听容器尺寸变化
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

  // 处理滚轮缩放
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(5, transform.scale * delta));
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  // 处理拖拽开始
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  // 处理拖拽移动
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  };

  // 处理拖拽结束
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 加载数据文件
  useEffect(() => {
    setLoading(true);
    fetch("/TeachTree.jsonl")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load data: ${res.status}`);
        return res.text();
      })
      .then((text) => {
        const lines = text.trim().split("\n");
        const parsedData: RawDataItem[] = lines
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter((item): item is RawDataItem => item !== null);

        if (parsedData.length === 0) throw new Error("No valid data found in file");
        setData(parsedData);
      })
      .catch((err) => {
        console.error("Error loading data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // 执行 LSA 分析
  useEffect(() => {
    if (data.length === 0) return;
    try {
      const analysisResult = runLSAAnalysis(data, DEFAULT_CONFIG.threshold);
      setResult(analysisResult);
    } catch (err) {
      console.error("Error running LSA analysis:", err);
    }
  }, [data]);

  // 计算单元格大小（自适应）
  const cellSize = Math.max(40, Math.min(70, Math.floor(containerSize.width / (result?.behaviors.length || 1))));

  return (
    <div ref={containerRef} className="w-full h-full bg-white overflow-hidden">
      {loading && (
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>加载中...</span>
          </div>
        </div>
      )}

      {!loading && result && (
        <div className="w-full h-full flex items-center justify-center">
          <svg
            ref={svgRef}
            width={containerSize.width}
            height={containerSize.height}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setTooltip(null);
              setIsDragging(false);
            }}
            onWheel={handleWheel}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
              <HeatmapGrid
                result={result}
                cellSize={cellSize}
                onCellHover={setTooltip}
              />
            </g>
          </svg>
        </div>
      )}

      {/* 悬停提示框 */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg shadow-lg p-3 text-sm"
          style={{
            left: `${tooltip.x + 12}px`,
            top: `${tooltip.y + 12}px`,
            backgroundColor: COLORS.tooltip.bg,
            color: COLORS.tooltip.text,
            border: `1px solid ${COLORS.tooltip.border}`,
          }}
        >
          <div className="font-semibold mb-1">
            {tooltip.from} → {tooltip.to}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs opacity-90">
            <span>观测值：</span>
            <span className="font-mono">{tooltip.observed}</span>
            <span>期望值：</span>
            <span className="font-mono">{tooltip.expected.toFixed(2)}</span>
            <span>Z-Score：</span>
            <span className={`font-mono font-bold ${
              tooltip.zScore > DEFAULT_CONFIG.threshold ? "text-red-400" :
              tooltip.zScore < -DEFAULT_CONFIG.threshold ? "text-blue-400" : ""
            }`}>
              {tooltip.zScore > 0 ? "+" : ""}{tooltip.zScore.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// 导出提示词（用于 AI 工具复现可视化）
export const lagSequentialAnalysisPrompt = `# 滞后序列分析 (LSA) - 课堂行为热力图可视化

请创建一个基于滞后序列分析 (Lag Sequential Analysis, LSA) 的课堂行为热力图组件，用于分析课堂教学行为序列中的显著转移模式。

## 一、功能概述
- 加载 JSONL 格式的课堂实录数据
- 构建观测矩阵和期望矩阵
- 计算调整后标准化残差 (Z-Score)
- 以热力图形式展示行为转移的显著性
- 提供智能分析面板，列出显著的正向和负向模式

## 二、数据结构

### 原始数据接口
\`\`\`typescript
interface RawDataItem {
  id: string;      // 唯一标识，格式如 "T01_0006_0009"
  label: string;   // 行为类型，如 "教师指令"、"学生发言"
  text: string;    // 具体文本内容
}
\`\`\`

### LSA 分析结果接口
\`\`\`typescript
interface LSAAnalysisResult {
  behaviors: string[];          // 所有的行为类型
  observationMatrix: number[][];  // 观测矩阵 (O)
  expectedMatrix: number[][];    // 期望矩阵 (E)
  zScoreMatrix: number[][];      // Z-Score 矩阵
  cells: ZScoreCell[];           // 所有单元格数据
  totalTransitions: number;      // 总转移次数
  rowTotals: number[];           // 每行的总次数
  colTotals: number[];           // 每列的总次数
}

interface ZScoreCell {
  from: string;
  to: string;
  observed: number;
  expected: number;
  zScore: number;
  significance: 'positive' | 'negative' | 'none';
}
\`\`\`

## 三、颜色配置
\`\`\`typescript
const COLORS = {
  // 显著正相关（红色系）
  positive: {
    light: "#fecaca",
    medium: "#ef4444",
    dark: "#991b1b",
  },
  // 显著负相关（蓝色系）
  negative: {
    light: "#bfdbfe",
    medium: "#3b82f6",
    dark: "#1e3a8a",
  },
  // 无显著性（灰色系）
  none: {
    bg: "#f3f4f6",
    text: "#6b7280",
  },
};
\`\`\`

## 四、核心算法

### 1. 构建观测矩阵
\`\`\`typescript
function buildObservationMatrix(sequence: string[]) {
  // 统计从行为 i 转移到行为 j 的实际次数
  const matrix = [];
  for (let i = 0; i < sequence.length - 1; i++) {
    const from = sequence[i];
    const to = sequence[i + 1];
    matrix[from][to]++;
  }
  return matrix;
}
\`\`\`

### 2. 构建期望矩阵
\`\`\`typescript
function buildExpectedMatrix(observationMatrix, rowTotals, colTotals, total) {
  // E_{ij} = (行 i 总次数 * 列 j 总次数) / 总转移次数
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      expectedMatrix[i][j] = (rowTotals[i] * colTotals[j]) / total;
    }
  }
}
\`\`\`

### 3. 计算 Z-Score（核心）
\`\`\`typescript
function calculateZScore(observed, expected, rowProportion, colProportion) {
  // Z_{ij} = (O_{ij} - E_{ij}) / sqrt(E_{ij} * (1 - 行比例_i) * (1 - 列比例_j))
  const rowProportion = rowTotal / totalTransitions;
  const colProportion = colTotal / totalTransitions;
  const denominator = Math.sqrt(expected * (1 - rowProportion) * (1 - colProportion));
  return (observed - expected) / denominator;
}
\`\`\`

## 五、可视化设计

### 热力图矩阵
- 行：前一个行为 (t)
- 列：后一个行为 (t+1)
- 单元格内容：Z-Score 值（保留2位小数）

### 颜色编码
- Z > 1.96: 深红色（显著正相关，表示该行为模式显著存在）
- Z < -1.96: 深蓝色（显著负相关，表示该行为模式被显著抑制）
- -1.96 ≤ Z ≤ 1.96: 灰色（无显著性，随机噪音）

### 交互功能
- 鼠标悬停显示详细信息
- 高亮相关行列
- 动态计算单元格大小

## 六、智能分析面板

### 显著正相关模式
列出 Z-Score 最高的 3 个模式，显示：
- 行为转移路径
- 观测值 vs 期望值
- Z-Score

### 显著负相关模式
列出 Z-Score 最低的 3 个模式（被抑制的模式）

## 七、使用 React Hooks
\`\`\`typescript
"use client";

import { useEffect, useRef, useState } from "react";

export function LagSequentialAnalysis() {
  // 加载数据
  useEffect(() => {
    fetch('/TeachTree.jsonl')
      .then(res => res.text())
      .then(text => {
        const data = text.split('\\n').map(line => JSON.parse(line));
        // 执行 LSA 分析
      });
  }, []);

  // 比例自适应
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "3:4" | "4:3" | "auto">("16:9");

  return (
    <div className="w-full h-full">
      {/* 热力图和分析面板 */}
    </div>
  );
}
\`\`\`

---

## 技术要点

1. **LSA 算法核心**：使用调整后标准化残差而非简单的卡方检验，更适合序列数据
2. **显著性阈值**：1.96 对应 95% 置信区间
3. **颜色渐变**：Z-Score 越大颜色越深，便于快速识别强相关模式
4. **响应式布局**：支持 1:1、16:9、9:16、3:4、4:3 比例切换
5. **智能分析**：自动提取显著模式，无需手动查找

## 参考文献
- Bakeman, R., & Gottman, J. M. (1997). Observing interaction: An introduction to sequential analysis.
- Sackett, G. P. (1987). Analysis of sequential social development data.
`;
