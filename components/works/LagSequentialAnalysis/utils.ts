/**
 * 滞后序列分析 (Lag Sequential Analysis) 工具函数
 *
 * 核心算法：
 * 1. 构建观测矩阵 (O_{ij})
 * 2. 构建期望矩阵 (E_{ij})
 * 3. 计算调整后标准化残差 (Z-Score)
 */

import type {
  RawDataItem,
  LSAAnalysisResult,
  ZScoreCell,
  SignificantPattern,
  AspectRatio,
} from "./types";
import { SIGNIFICANCE_THRESHOLD } from "./constants";

/**
 * 从原始数据提取行为标签序列
 */
export function extractBehaviorSequence(data: RawDataItem[]): string[] {
  return data.map((item) => item.label);
}

/**
 * 构建观测矩阵 (Observation Matrix)
 * O_{ij} = 从行为 i 转移到行为 j 的实际次数
 */
export function buildObservationMatrix(
  sequence: string[]
): { behaviors: string[]; matrix: number[][]; rowTotals: number[]; colTotals: number[] } {
  // 获取所有唯一的行为类型
  const behaviors = Array.from(new Set(sequence));
  const behaviorIndex = new Map(behaviors.map((b, i) => [b, i]));

  const n = behaviors.length;
  const matrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));
  const rowTotals: number[] = Array(n).fill(0);
  const colTotals: number[] = Array(n).fill(0);

  // 统计转移次数
  for (let i = 0; i < sequence.length - 1; i++) {
    const from = sequence[i];
    const to = sequence[i + 1];
    const fromIdx = behaviorIndex.get(from)!;
    const toIdx = behaviorIndex.get(to)!;

    matrix[fromIdx][toIdx]++;
    rowTotals[fromIdx]++;
    colTotals[toIdx]++;
  }

  return { behaviors, matrix, rowTotals, colTotals };
}

/**
 * 构建期望矩阵 (Expected Matrix)
 * E_{ij} = (行 i 总次数 * 列 j 总次数) / 总转移次数
 */
export function buildExpectedMatrix(
  observationMatrix: number[][],
  rowTotals: number[],
  colTotals: number[],
  totalTransitions: number
): number[][] {
  const n = observationMatrix.length;
  const expectedMatrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      expectedMatrix[i][j] = (rowTotals[i] * colTotals[j]) / totalTransitions;
    }
  }

  return expectedMatrix;
}

/**
 * 计算调整后标准化残差 (Z-Score)
 *
 * Z_{ij} = (O_{ij} - E_{ij}) / sqrt(E_{ij} * (1 - 行比例_i) * (1 - 列比例_j))
 *
 * 其中：
 *   行比例_i = 行 i 总次数 / 总转移次数
 *   列比例_j = 列 j 总次数 / 总转移次数
 */
export function calculateZScoreMatrix(
  observationMatrix: number[][],
  expectedMatrix: number[][],
  rowTotals: number[],
  colTotals: number[],
  totalTransitions: number,
  threshold: number = SIGNIFICANCE_THRESHOLD
): number[][] {
  const n = observationMatrix.length;
  const zScoreMatrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const observed = observationMatrix[i][j];
      const expected = expectedMatrix[i][j];

      if (expected === 0) {
        zScoreMatrix[i][j] = 0;
        continue;
      }

      const rowProportion = rowTotals[i] / totalTransitions;
      const colProportion = colTotals[j] / totalTransitions;

      const denominator = Math.sqrt(
        expected * (1 - rowProportion) * (1 - colProportion)
      );

      if (denominator === 0) {
        zScoreMatrix[i][j] = 0;
      } else {
        zScoreMatrix[i][j] = (observed - expected) / denominator;
      }
    }
  }

  return zScoreMatrix;
}

/**
 * 执行完整的 LSA 分析
 */
export function runLSAAnalysis(
  data: RawDataItem[],
  threshold: number = SIGNIFICANCE_THRESHOLD
): LSAAnalysisResult {
  // 1. 提取行为序列
  const sequence = extractBehaviorSequence(data);

  // 2. 构建观测矩阵
  const { behaviors, matrix: observationMatrix, rowTotals, colTotals } =
    buildObservationMatrix(sequence);

  // 3. 计算总转移次数
  const totalTransitions = sequence.length - 1;

  // 4. 构建期望矩阵
  const expectedMatrix = buildExpectedMatrix(
    observationMatrix,
    rowTotals,
    colTotals,
    totalTransitions
  );

  // 5. 计算 Z-Score 矩阵
  const zScoreMatrix = calculateZScoreMatrix(
    observationMatrix,
    expectedMatrix,
    rowTotals,
    colTotals,
    totalTransitions,
    threshold
  );

  // 6. 构建单元格数据
  const cells: ZScoreCell[] = [];
  for (let i = 0; i < behaviors.length; i++) {
    for (let j = 0; j < behaviors.length; j++) {
      const zScore = zScoreMatrix[i][j];
      let significance: "positive" | "negative" | "none";

      if (zScore > threshold) {
        significance = "positive";
      } else if (zScore < -threshold) {
        significance = "negative";
      } else {
        significance = "none";
      }

      cells.push({
        from: behaviors[i],
        to: behaviors[j],
        observed: observationMatrix[i][j],
        expected: expectedMatrix[i][j],
        zScore,
        significance,
      });
    }
  }

  return {
    behaviors,
    observationMatrix,
    expectedMatrix,
    zScoreMatrix,
    cells,
    totalTransitions,
    rowTotals,
    colTotals,
  };
}

/**
 * 获取显著模式（Z-Score 最高的 N 个）
 */
export function getTopPatterns(
  cells: ZScoreCell[],
  count: number,
  type: "positive" | "negative"
): SignificantPattern[] {
  const filtered = cells.filter((c) => c.significance === type);
  const sorted =
    type === "positive"
      ? filtered.sort((a, b) => b.zScore - a.zScore)
      : filtered.sort((a, b) => a.zScore - b.zScore);

  return sorted.slice(0, count).map((c, i) => ({
    from: c.from,
    to: c.to,
    observed: c.observed,
    expected: c.expected,
    zScore: c.zScore,
    rank: i + 1,
  }));
}

/**
 * 根据容器尺寸和目标比例计算绘制区域
 */
export function calculateDrawArea(
  containerWidth: number,
  containerHeight: number,
  targetRatio: AspectRatio,
  padding = 16
): { width: number; height: number; offsetX: number; offsetY: number } {
  const effectiveWidth = containerWidth - padding * 2;
  const effectiveHeight = containerHeight - padding * 2;

  if (targetRatio === "auto") {
    return {
      width: effectiveWidth,
      height: effectiveHeight,
      offsetX: padding,
      offsetY: padding,
    };
  }

  const ratioMap: Record<AspectRatio, number> = {
    "1:1": 1,
    "16:9": 16 / 9,
    "9:16": 9 / 16,
    "3:4": 3 / 4,
    "4:3": 4 / 3,
    "auto": 0,
  };

  const targetRatioValue = ratioMap[targetRatio];
  const containerRatio = effectiveWidth / effectiveHeight;

  let drawWidth: number;
  let drawHeight: number;

  if (containerRatio > targetRatioValue) {
    drawHeight = effectiveHeight;
    drawWidth = drawHeight * targetRatioValue;
  } else {
    drawWidth = effectiveWidth;
    drawHeight = drawWidth / targetRatioValue;
  }

  const offsetX = (containerWidth - drawWidth) / 2;
  const offsetY = (containerHeight - drawHeight) / 2;

  return { width: drawWidth, height: drawHeight, offsetX, offsetY };
}

/**
 * 根据 Z-Score 计算颜色
 */
export function getZScoreColor(
  zScore: number,
  threshold: number,
  maxZScore: number
): { bg: string; text: string } {
  if (zScore > threshold) {
    // 显著正相关 - 橙色渐变 (TeachTree: #FF8C00)
    const intensity = Math.min((zScore - threshold) / (maxZScore - threshold), 1);
    // 从 #FFD699 (light) 到 #FF8C00 (medium) 到 #CC7000 (dark)
    const r = Math.round(204 + (255 - 204) * (1 - intensity)); // 204 -> 255
    const g = Math.round(112 + (214 - 112) * (1 - intensity)); // 112 -> 214
    const b = Math.round(0 + (153 - 0) * (1 - intensity));     // 0 -> 153
    return {
      bg: `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.7})`,
      text: intensity > 0.5 ? "#fff" : "#7f1d1d",
    };
  } else if (zScore < -threshold) {
    // 显著负相关 - 蓝色渐变 (TeachTree: #5B8DEE)
    const intensity = Math.min((Math.abs(zScore) - threshold) / (maxZScore - threshold), 1);
    // 从 #A8C5FF (light) 到 #5B8DEE (medium) 到 #3A6BC2 (dark)
    const r = Math.round(58 + (168 - 58) * (1 - intensity));  // 58 -> 168
    const g = Math.round(107 + (197 - 107) * (1 - intensity)); // 107 -> 197
    const b = Math.round(194 + (255 - 194) * (1 - intensity)); // 194 -> 255
    return {
      bg: `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.7})`,
      text: intensity > 0.5 ? "#fff" : "#1e3a8a",
    };
  } else {
    // 无显著性 - 灰色
    return {
      bg: "#f9fafb",
      text: "#9ca3af",
    };
  }
}
