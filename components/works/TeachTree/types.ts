// ==================== 数据类型定义 ====================

export interface RawDataItem {
    id: string;
    label: string;
    text: string;
}

export interface MergedItem {
    label: string;
    abbr: string;
    count: number;
}

export interface PatternResult {
    pattern: string;
    length: number;
    count: number;
    avgScore?: number;
}

export interface TableRow {
    length: number;
    pattern: string;
    count: number;
    avgScore: number;
}

export interface TreeNode {
    id: string;
    abbr: string;
    label: string;
    count: number;
    children: TreeNode[];
    depth: number;
    avgScore?: number; // 平均质量评分
    childDistribution?: { abbr: string; count: number; percentage: number }[]; // 子节点类型分布
}

export interface PatternDetailItem {
    id: string;
    label: string;
    abbr: string;
    text: string;
    startTime: number;
    endTime: number;
}
