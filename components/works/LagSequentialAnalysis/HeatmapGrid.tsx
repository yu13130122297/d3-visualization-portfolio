/**
 * LSA 热力图核心组件
 * 显示行为转移的 Z-Score 热力图矩阵
 */

"use client";

import { useMemo, useState } from "react";
import type { LSAAnalysisResult, TooltipInfo } from "./types";
import { SIGNIFICANCE_THRESHOLD, MAX_Z_SCORE, COLORS, BEHAVIOR_ABBR } from "./constants";
import { getZScoreColor } from "./utils";

interface HeatmapGridProps {
  result: LSAAnalysisResult;
  cellSize?: number;
  onCellHover?: (info: TooltipInfo | null) => void;
}

export function HeatmapGrid({ result, cellSize = 60, onCellHover }: HeatmapGridProps) {
  const { behaviors, zScoreMatrix, observationMatrix, expectedMatrix } = result;

  // 获取英文标签
  const behaviorLabels = behaviors.map(b => BEHAVIOR_ABBR[b] || b);

  // 计算网格尺寸
  const n = behaviors.length;
  const gridSize = n * cellSize;
  const labelWidth = 50;
  const labelHeight = 40;

  // 当前悬停的单元格
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  // 生成矩阵网格
  const cells = useMemo(() => {
    return zScoreMatrix.map((row, i) =>
      row.map((zScore, j) => {
        const color = getZScoreColor(zScore, SIGNIFICANCE_THRESHOLD, MAX_Z_SCORE);
        return {
          row: i,
          col: j,
          x: j * cellSize,
          y: i * cellSize,
          from: behaviors[i],
          to: behaviors[j],
          zScore,
          observed: observationMatrix[i][j],
          expected: expectedMatrix[i][j],
          significance:
            zScore > SIGNIFICANCE_THRESHOLD
              ? ("positive" as const)
              : zScore < -SIGNIFICANCE_THRESHOLD
                ? ("negative" as const)
                : ("none" as const),
          color,
        };
      })
    );
  }, [zScoreMatrix, behaviors, observationMatrix, expectedMatrix, cellSize]);

  const handleCellEnter = (cell: typeof cells[0][0], event: React.MouseEvent) => {
    setHoveredCell({ row: cell.row, col: cell.col });
    onCellHover?.({
      from: cell.from,
      to: cell.to,
      observed: cell.observed,
      expected: cell.expected,
      zScore: cell.zScore,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleCellLeave = () => {
    setHoveredCell(null);
    onCellHover?.(null);
  };

  return (
    <>
      <g transform={`translate(${-gridSize / 2 - labelWidth / 2}, ${-gridSize / 2 - labelHeight / 2})`}>
        {/* 背景网格 */}
        <rect
          x={labelWidth + 10}
          y={labelHeight + 10}
          width={gridSize}
          height={gridSize}
          fill="white"
          stroke={COLORS.grid}
          strokeWidth={1}
        />

        {/* 行标签（左侧，来源行为） */}
        <g className="text-xs font-medium">
          {behaviorLabels.map((label, i) => (
            <text
              key={`row-${i}`}
              x={labelWidth - 8}
              y={labelHeight + 10 + i * cellSize + cellSize / 2 + 4}
              textAnchor="end"
              fill="#374151"
              dominantBaseline="middle"
              className="pointer-events-none"
            >
              {label}
            </text>
          ))}
        </g>

        {/* 列标签（顶部，目标行为） */}
        <g className="text-xs font-medium">
          {behaviorLabels.map((label, j) => {
            const x = labelWidth + 10 + j * cellSize + cellSize / 2;
            return (
              <text
                key={`col-${j}`}
                x={x}
                y={labelHeight + 5}
                textAnchor="middle"
                fill="#374151"
                className="pointer-events-none"
              >
                {label}
              </text>
            );
          })}
        </g>

        {/* 热力图单元格 */}
        <g>
          {cells.flat().map((cell) => (
            <g
              key={`${cell.row}-${cell.col}`}
              transform={`translate(${labelWidth + 10 + cell.x}, ${labelHeight + 10 + cell.y})`}
              className="cursor-pointer transition-opacity"
              style={{
                opacity: hoveredCell
                  ? hoveredCell.row === cell.row || hoveredCell.col === cell.col
                    ? 1
                    : 0.3
                  : 1,
              }}
              onMouseEnter={(e) => handleCellEnter(cell, e)}
              onMouseLeave={handleCellLeave}
            >
              <rect
                width={cellSize}
                height={cellSize}
                fill={cell.color.bg}
              />
              <text
                x={cellSize / 2}
                y={cellSize / 2 + 4}
                textAnchor="middle"
                fill={cell.color.text}
                className={`text-xs font-bold ${cell.significance === "none" ? "opacity-50" : ""}`}
              >
                {cell.zScore.toFixed(2)}
              </text>
            </g>
          ))}
        </g>
      </g>

      {/* 图例 */}
      <g transform={`translate(${-gridSize / 2}, ${gridSize / 2 + 50})`}>
        <rect x={0} y={0} width={200} height={80} fill="white" stroke="#e5e7eb" rx={4} opacity={0.9} />

        {/* 渐变图例 */}
        <defs>
          <linearGradient id="legendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5B8DEE" />
            <stop offset="50%" stopColor="#f9fafb" />
            <stop offset="100%" stopColor="#FF8C00" />
          </linearGradient>
        </defs>
        <rect x={20} y={15} width={160} height={12} fill="url(#legendGradient)" stroke="#e5e7eb" />
        <text x={20} y={40} fill="#6b7280" fontSize={10} textAnchor="start">
          Z: -{MAX_Z_SCORE}
        </text>
        <text x={100} y={40} fill="#6b7280" fontSize={10} textAnchor="middle">
          0
        </text>
        <text x={180} y={40} fill="#6b7280" fontSize={10} textAnchor="end">
          +{MAX_Z_SCORE}
        </text>

        {/* 显著性说明 */}
        <g transform="translate(10, 50)">
          <rect x={0} y={0} width={8} height={8} fill="#FF8C00" rx={1} />
          <text x={12} y={8} fill="#374151" fontSize={9}>
            Z &gt; {SIGNIFICANCE_THRESHOLD}
          </text>
          <rect x={70} y={0} width={8} height={8} fill="#5B8DEE" rx={1} />
          <text x={82} y={8} fill="#374151" fontSize={9}>
            Z &lt; -{SIGNIFICANCE_THRESHOLD}
          </text>
          <rect x={140} y={0} width={8} height={8} fill="#f9fafb" stroke="#e5e7eb" rx={1} />
          <text x={152} y={8} fill="#374151" fontSize={9}>
            无显著
          </text>
        </g>
      </g>
    </>
  );
}
