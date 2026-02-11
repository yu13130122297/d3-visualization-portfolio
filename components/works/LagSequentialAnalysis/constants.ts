/**
 * 滞后序列分析 (Lag Sequential Analysis) 常量配置
 */

import { HeatmapConfig } from "./types";

// 显著性阈值（95% 置信区间）
export const SIGNIFICANCE_THRESHOLD = 1.96;

// Z-Score 最大值（用于颜色缩放）
export const MAX_Z_SCORE = 5;

// 行为类型缩写映射（与 TeachTree 保持一致）
export const BEHAVIOR_ABBR: Record<string, string> = {
  "教师提问": "TQ",
  "教师讲授": "TL",
  "教师反馈": "TF",
  "教师指令": "TI",
  "教师板书": "TB",
  "教师巡视": "TP",
  "学生发言": "SS",
  "学生讨论": "SD",
  "课堂沉寂": "CS",
  "技术操作": "TO",
};

// 行为类型颜色映射（与 TeachTree 保持一致）
export const BEHAVIOR_COLORS: Record<string, string> = {
  "TQ": "#FF8C00",  // 橙色 - 教师提问
  "TL": "#FFB347",  // 浅橙 - 教师讲授
  "TF": "#4ECDC4",  // 青色 - 教师反馈
  "TI": "#95E1D3",  // 浅青 - 教师指令
  "TB": "#A8A8A8",  // 灰色 - 教师板书
  "TP": "#C0C0C0",  // 浅灰 - 教师巡视
  "SS": "#5B8DEE",  // 蓝色 - 学生发言
  "SD": "#7FB3D5",  // 浅蓝 - 学生讨论
  "CS": "#E0E0E0",  // 淡灰 - 课堂沉寂
  "TO": "#DDA0DD",  // 紫色 - 技术操作
};

// 颜色配置
export const COLORS = {
  // 显著正相关（橙色系 - 对应教师提问的暖色调）
  positive: {
    light: "#FFD699",  // Z 接近 1.96
    medium: "#FF8C00",
    dark: "#CC7000",   // Z 最大
  },
  // 显著负相关（蓝色系 - 对应学生发言的冷色调）
  negative: {
    light: "#A8C5FF",  // Z 接近 -1.96
    medium: "#5B8DEE",
    dark: "#3A6BC2",   // Z 最小
  },
  // 无显著性（灰色系）
  none: {
    bg: "#f9fafb",
    text: "#9ca3af",
  },
  // 其他
  grid: "#e5e7eb",
  tooltip: {
    bg: "#1f2937",
    text: "#ffffff",
    border: "#374151",
  },
} as const;

// 热力图默认配置
export const DEFAULT_CONFIG: HeatmapConfig = {
  threshold: SIGNIFICANCE_THRESHOLD,
  cellSize: 60,
  padding: 16,
};

// 分析面板显示数量
export const TOP_PATTERNS_COUNT = 3;
