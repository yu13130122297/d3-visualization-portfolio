/**
 * 滞后序列分析 (Lag Sequential Analysis) 类型定义
 */

// 原始数据项（从 TeachTree.jsonl 加载）
export interface RawDataItem {
  id: string;
  label: string;
  text: string;
}

// LSA 观测矩阵单元格
export interface ObservationCell {
  from: string;  // 来源行为（行，时间 t）
  to: string;    // 目标行为（列，时间 t+1）
  count: number; // 观测次数
}

// LSA 期望矩阵单元格
export interface ExpectedCell {
  from: string;
  to: string;
  expected: number; // 期望频次
}

// LSA Z-Score 矩阵单元格
export interface ZScoreCell {
  from: string;
  to: string;
  observed: number;   // 观测值
  expected: number;   // 期望值
  zScore: number;     // Z-Score
  significance: 'positive' | 'negative' | 'none'; // 显著性
}

// LSA 分析结果
export interface LSAAnalysisResult {
  behaviors: string[];          // 所有的行为类型
  observationMatrix: number[][];  // 观测矩阵 (O)
  expectedMatrix: number[][];    // 期望矩阵 (E)
  zScoreMatrix: number[][];      // Z-Score 矩阵
  cells: ZScoreCell[];           // 所有单元格数据
  totalTransitions: number;      // 总转移次数
  rowTotals: number[];           // 每行的总次数
  colTotals: number[];           // 每列的总次数
}

// 显著模式（用于分析面板）
export interface SignificantPattern {
  from: string;
  to: string;
  observed: number;
  expected: number;
  zScore: number;
  rank: number; // 排名
}

// 悬停提示信息
export interface TooltipInfo {
  from: string;
  to: string;
  observed: number;
  expected: number;
  zScore: number;
  x: number;
  y: number;
}

// 比例类型
export type AspectRatio = "1:1" | "16:9" | "9:16" | "3:4" | "4:3" | "auto";

// 组件配置
export interface HeatmapConfig {
  threshold: number;      // 显著性阈值（默认 1.96）
  cellSize: number;       // 单元格大小
  padding: number;        // 内边距
}
