/**
 * LSA 分析面板组件
 * 显示显著的正向和负向行为模式
 */

"use client";

import type { LSAAnalysisResult, SignificantPattern } from "./types";
import { getTopPatterns } from "./utils";
import { TOP_PATTERNS_COUNT, COLORS } from "./constants";
import { TrendingUp, TrendingDown, Info } from "lucide-react";

interface AnalysisPanelProps {
  result: LSAAnalysisResult;
  topCount?: number;
}

export function AnalysisPanel({ result, topCount = TOP_PATTERNS_COUNT }: AnalysisPanelProps) {
  // 获取显著正相关模式（Z-Score 最高的）
  const topPositivePatterns = getTopPatterns(result.cells, topCount, "positive");

  // 获取显著负相关模式（Z-Score 最低的）
  const topNegativePatterns = getTopPatterns(result.cells, topCount, "negative");

  // 计算统计信息
  const positiveCount = result.cells.filter((c) => c.significance === "positive").length;
  const negativeCount = result.cells.filter((c) => c.significance === "negative").length;
  const noneCount = result.cells.filter((c) => c.significance === "none").length;
  const totalCells = result.cells.length;

  return (
    <div className="space-y-6">
      {/* 统计摘要 */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4" />
          分析摘要
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">总转移次数：</span>
              <span className="font-mono font-medium">{result.totalTransitions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">行为类型数：</span>
              <span className="font-mono font-medium">{result.behaviors.length}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">显著正相关：</span>
              <span className="font-mono font-medium text-red-600">{positiveCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">显著负相关：</span>
              <span className="font-mono font-medium text-blue-600">{negativeCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 显著正相关模式 */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-red-500" />
          显著正相关模式 (Top {topCount})
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          以下行为转移模式显著高于随机期望，表示它们之间存在较强的关联性。
        </p>
        {topPositivePatterns.length > 0 ? (
          <div className="space-y-2">
            {topPositivePatterns.map((pattern) => (
              <PatternCard key={`pos-${pattern.rank}`} pattern={pattern} type="positive" />
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400 italic">未发现显著正相关模式</div>
        )}
      </div>

      {/* 显著负相关模式 */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-blue-500" />
          显著负相关模式 (Top {topCount})
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          以下行为转移模式显著低于随机期望，表示它们之间被抑制或避免。
        </p>
        {topNegativePatterns.length > 0 ? (
          <div className="space-y-2">
            {topNegativePatterns.map((pattern) => (
              <PatternCard key={`neg-${pattern.rank}`} pattern={pattern} type="negative" />
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400 italic">未发现显著负相关模式</div>
        )}
      </div>
    </div>
  );
}

interface PatternCardProps {
  pattern: SignificantPattern;
  type: "positive" | "negative";
}

function PatternCard({ pattern, type }: PatternCardProps) {
  const isPositive = type === "positive";
  const accentColor = isPositive ? COLORS.positive.dark : COLORS.negative.dark;
  const bgColor = isPositive ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200";
  const textColor = isPositive ? "text-red-700" : "text-blue-700";

  return (
    <div className={`rounded-lg p-3 border ${bgColor}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPositive ? "bg-red-200" : "bg-blue-200"}`}
          >
            #{pattern.rank}
          </span>
          <span className="font-semibold text-sm text-gray-800">
            {pattern.from} → {pattern.to}
          </span>
        </div>
        <span className={`text-lg font-mono font-bold ${textColor}`}>
          {pattern.zScore > 0 ? "+" : ""}
          {pattern.zScore.toFixed(2)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">观测值：</span>
          <span className="font-mono text-gray-700">{pattern.observed}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">期望值：</span>
          <span className="font-mono text-gray-700">{pattern.expected.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
