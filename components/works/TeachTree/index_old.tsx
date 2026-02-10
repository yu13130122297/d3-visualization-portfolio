"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";

// ==================== 数据类型定义 ====================

interface RawDataItem {
    id: string;
    label: string;
    text: string;
}

interface MergedItem {
    label: string;
    abbr: string;
    count: number;
}

interface PatternResult {
    pattern: string;
    length: number;
    count: number;
    avgScore?: number;
}

interface TableRow {
    length: number;
    pattern: string;
    count: number;
    avgScore: number;
}

interface TreeNode {
    id: string;
    abbr: string;
    label: string;
    count: number;
    children: TreeNode[];
    depth: number;
    avgScore?: number; // 平均质量评分
    childDistribution?: { abbr: string; count: number; percentage: number }[]; // 子节点类型分布
}

interface PatternDetailItem {
    id: string;
    label: string;
    abbr: string;
    text: string;
    startTime: number;
    endTime: number;
}

// ==================== 常量定义 ====================

const LABEL_ABBR: Record<string, string> = {
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

const LABEL_COLORS: Record<string, string> = {
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

const LABEL_FULL_NAME: Record<string, string> = {
    "TQ": "教师提问",
    "TL": "教师讲授",
    "TF": "教师反馈",
    "TI": "教师指令",
    "TB": "教师板书",
    "TP": "教师巡视",
    "SS": "学生发言",
    "SD": "学生讨论",
    "CS": "课堂沉寂",
    "TO": "技术操作",
};

// ==================== 数据处理函数 ====================

// 解析时间戳：T01_0000_0004 → { start: 0, end: 4, duration: 4 }
function parseTimeStamp(id: string): { start: number; end: number; duration: number } {
    const match = id.match(/(\d+)_(\d+)$/);
    if (!match) return { start: 0, end: 0, duration: 0 };
    const start = parseInt(match[1]);
    const end = parseInt(match[2]);
    return { start, end, duration: end - start };
}

// 基于时长计算模式评分（方案一+三：时长加权学生中心度 + 教育学阈值）
function calculatePatternScore(pattern: string, rawData: RawDataItem[]): number {
    const abbrs = pattern.split(' → ');

    // 先对原始数据进行合并处理（保留时间信息）
    const mergedWithTime: Array<{ abbr: string; start: number; end: number; duration: number; segments: typeof rawData }> = [];

    for (const item of rawData) {
        const abbr = LABEL_ABBR[item.label] || item.label;
        const time = parseTimeStamp(item.id);

        if (mergedWithTime.length === 0 || mergedWithTime[mergedWithTime.length - 1].abbr !== abbr) {
            mergedWithTime.push({
                abbr,
                start: time.start,
                end: time.end,
                duration: time.duration,
                segments: [item]
            });
        } else {
            const last = mergedWithTime[mergedWithTime.length - 1];
            last.end = time.end;
            last.duration += time.duration;
            last.segments.push(item);
        }
    }

    // 在合并后的数据中查找模式
    const matches: typeof mergedWithTime[] = [];
    for (let i = 0; i <= mergedWithTime.length - abbrs.length; i++) {
        let isMatch = true;
        for (let j = 0; j < abbrs.length; j++) {
            if (mergedWithTime[i + j].abbr !== abbrs[j]) {
                isMatch = false;
                break;
            }
        }
        if (isMatch) {
            matches.push(mergedWithTime.slice(i, i + abbrs.length));
        }
    }

    if (matches.length === 0) return 0.5;

    // 对每个匹配实例计算评分并取平均
    const scores = matches.map(match => {
        let score = 0.5; // 基础分

        const totalDuration = match.reduce((sum, seg) => sum + seg.duration, 0);

        // 统计各类行为时长
        const durations: Record<string, number> = {};
        match.forEach(seg => {
            durations[seg.abbr] = (durations[seg.abbr] || 0) + seg.duration;
        });

        // 1. 学生参与时长占比（方案一）
        const studentTime = (durations['SS'] || 0) + (durations['SD'] || 0);
        const studentRatio = studentTime / totalDuration;
        score += studentRatio * 0.3; // 最高+0.3

        // 2. 检测负面模式（方案三：教育学阈值）
        // 长时间讲授（单次>120秒）
        match.forEach(seg => {
            if (seg.abbr === 'TL' && seg.duration > 120) {
                score -= 0.15;
            }
            // 长时间沉寂（单次>30秒）
            if (seg.abbr === 'CS' && seg.duration > 30) {
                score -= 0.1;
            }
        });

        // 3. 检测优质模式
        // 黄金互动：TQ → SS → TF
        const patternStr = match.map(s => s.abbr).join('→');
        if (patternStr.includes('TQ→SS→TF')) {
            score += 0.25;
        }
        // 深度讨论：SD持续>60秒
        if (durations['SD'] && durations['SD'] > 60) {
            score += 0.15;
        }
        // 充分发言：SS时长>20秒
        if (durations['SS'] && durations['SS'] > 20) {
            score += 0.1;
        }

        // 4. 提问-反馈时效性
        for (let i = 0; i < match.length - 1; i++) {
            if (match[i].abbr === 'SS' && match[i + 1].abbr === 'TF') {
                const gap = match[i + 1].start - match[i].end;
                if (gap > 120) score -= 0.1; // 反馈延迟>2分钟
            }
        }

        return Math.max(0.3, Math.min(1.0, score)); // 限制在[0.3, 1.0]
    });

    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

function preprocessData(rawData: RawDataItem[]): MergedItem[] {
    const merged: MergedItem[] = [];
    for (const item of rawData) {
        const abbr = LABEL_ABBR[item.label] || item.label;
        if (merged.length === 0 || merged[merged.length - 1].abbr !== abbr) {
            merged.push({ label: item.label, abbr, count: 1 });
        } else {
            merged[merged.length - 1].count++;
        }
    }
    return merged;
}

function minePatterns(sequence: MergedItem[], rawData: RawDataItem[], maxLength = 15, minCount = 2): PatternResult[] {
    const patterns = new Map<string, number>();
    const abbrSeq = sequence.map(s => s.abbr);

    for (let n = 2; n <= Math.min(maxLength, abbrSeq.length); n++) {
        for (let i = 0; i <= abbrSeq.length - n; i++) {
            const pattern = abbrSeq.slice(i, i + n).join(' → ');
            patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
        }
    }

    return Array.from(patterns.entries())
        .filter(([_, count]) => count >= minCount)
        .map(([pattern, count]) => ({
            pattern,
            length: pattern.split(' → ').length,
            count,
            avgScore: calculatePatternScore(pattern, rawData),
        }))
        .sort((a, b) => {
            if (b.length !== a.length) return b.length - a.length;
            return b.count - a.count;
        });
}

function buildInteractionTree(patterns: PatternResult[]): TreeNode {
    const root: TreeNode = {
        id: 'root',
        abbr: 'ROOT',
        label: '根节点',
        count: patterns.length,
        children: [],
        depth: 0
    };

    // 记录每个节点路径的评分总和和计数
    const scoreMap = new Map<string, { total: number; count: number }>();

    for (const { pattern, count, avgScore } of patterns) {
        const nodes = pattern.split(' → ');
        let current = root;

        for (let i = 0; i < nodes.length; i++) {
            const abbr = nodes[i];
            let child = current.children.find(c => c.abbr === abbr);

            if (!child) {
                child = {
                    id: `${current.id}-${abbr}-${i}`,
                    abbr,
                    label: LABEL_FULL_NAME[abbr] || abbr,
                    count: 0,
                    children: [],
                    depth: i + 1
                };
                current.children.push(child);
            }
            child.count += count;

            // 累计评分
            if (avgScore) {
                const existing = scoreMap.get(child.id) || { total: 0, count: 0 };
                existing.total += avgScore * count;
                existing.count += count;
                scoreMap.set(child.id, existing);
            }

            current = child;
        }
    }

    // 计算平均评分和子节点分布
    function enrichNode(node: TreeNode) {
        if (node.children.length > 0) {
            // 计算子节点分布
            const totalChildCount = node.children.reduce((sum, c) => sum + c.count, 0);
            node.childDistribution = node.children.map(c => ({
                abbr: c.abbr,
                count: c.count,
                percentage: (c.count / totalChildCount) * 100
            }));

            node.children.forEach(enrichNode);
        }

        // 计算平均评分
        const scoreData = scoreMap.get(node.id);
        if (scoreData && scoreData.count > 0) {
            node.avgScore = scoreData.total / scoreData.count;
        }
    }

    enrichNode(root);
    return root;
}

function getNodeRadius(count: number): number {
    if (count >= 10) return 28;
    if (count >= 4) return 18;
    return 10;
}

// 根据转移频次计算连线粗细
function getLinkWidth(count: number): number {
    if (count >= 10) return 5;
    if (count >= 6) return 3.5;
    if (count >= 3) return 2;
    return 1;
}

// 根据质量评分计算连线虚实度
function getLinkDashArray(avgScore?: number): string {
    if (!avgScore) return '4,2'; // 默认短虚线
    if (avgScore >= 0.8) return '0'; // 高分实线
    if (avgScore >= 0.5) return '4,2'; // 中分短虚线
    return '8,4'; // 低分长虚线
}

// ==================== 辅助函数 ====================

function findNodeById(node: TreeNode, id: string): TreeNode | null {
    if (node.id === id) return node;
    for (const child of node.children) {
        const found = findNodeById(child, id);
        if (found) return found;
    }
    return null;
}

// 从原始数据中提取匹配模式的片段（合并后显示）
function extractPatternDetails(pattern: string, rawData: RawDataItem[]): PatternDetailItem[] {
    const abbrs = pattern.split(' → ');

    // 先对原始数据进行合并处理（保留原始数据引用）
    const mergedWithRaw: Array<{ abbr: string; rawItems: RawDataItem[] }> = [];

    for (const item of rawData) {
        const abbr = LABEL_ABBR[item.label] || item.label;

        if (mergedWithRaw.length === 0 || mergedWithRaw[mergedWithRaw.length - 1].abbr !== abbr) {
            mergedWithRaw.push({ abbr, rawItems: [item] });
        } else {
            mergedWithRaw[mergedWithRaw.length - 1].rawItems.push(item);
        }
    }

    // 在合并后的数据中查找模式
    for (let i = 0; i <= mergedWithRaw.length - abbrs.length; i++) {
        let isMatch = true;
        for (let j = 0; j < abbrs.length; j++) {
            if (mergedWithRaw[i + j].abbr !== abbrs[j]) {
                isMatch = false;
                break;
            }
        }

        if (isMatch) {
            // 找到匹配，返回合并后的片段（而不是原始片段）
            const matchedSegments = mergedWithRaw.slice(i, i + abbrs.length);
            const details: PatternDetailItem[] = [];

            matchedSegments.forEach(segment => {
                // 获取这个合并段的起止时间
                const firstItem = segment.rawItems[0];
                const lastItem = segment.rawItems[segment.rawItems.length - 1];
                const startTime = parseTimeStamp(firstItem.id).start;
                const endTime = parseTimeStamp(lastItem.id).end;

                // 合并所有text内容（先去掉前缀，再过滤掉silent和inaudible）
                const texts = segment.rawItems
                    .map(item => item.text.replace(/^(老师：|学生：)/, ''))
                    .filter(text => text !== 'silent' && text !== 'inaudible');

                const mergedText = texts.length > 0
                    ? texts.join(' ')
                    : (segment.rawItems[0].text === 'inaudible' ? 'inaudible' : 'silent');

                details.push({
                    id: firstItem.id,
                    label: firstItem.label,
                    abbr: segment.abbr,
                    text: mergedText,
                    startTime: startTime,
                    endTime: endTime
                });
            });

            return details;
        }
    }

    return [];
}

// 从交互树中提取所有从根到叶的完整路径模式
function extractRootToLeafPatterns(root: TreeNode, patterns: PatternResult[]): PatternResult[] {
    const leafPaths: string[] = [];

    // 递归遍历树，收集所有从根到叶的路径
    function collectLeafPaths(node: TreeNode, currentPath: string[]) {
        if (node.id === 'root') {
            // 根节点不计入路径
            for (const child of node.children) {
                collectLeafPaths(child, []);
            }
            return;
        }

        const newPath = [...currentPath, node.abbr];

        if (node.children.length === 0) {
            // 叶子节点：保存完整路径
            leafPaths.push(newPath.join(' → '));
        } else {
            // 非叶子节点：继续递归
            for (const child of node.children) {
                collectLeafPaths(child, newPath);
            }
        }
    }

    collectLeafPaths(root, []);

    // 从原始 patterns 中找到这些路径对应的模式信息
    const leafPathSet = new Set(leafPaths);
    const rootToLeafPatterns = patterns.filter(p => leafPathSet.has(p.pattern));

    // 按长度和频次排序
    return rootToLeafPatterns.sort((a, b) => {
        if (b.length !== a.length) return b.length - a.length;
        return b.count - a.count;
    });
}

// 获取默认显示的节点（前2个最高频根节点及其全部子树）
function getDefaultVisibleNodes(root: TreeNode): Set<string> {
    const visible = new Set<string>();

    const topChildren = [...root.children]
        .sort((a, b) => b.count - a.count)
        .slice(0, 2);

    function addToVisible(node: TreeNode) {
        visible.add(node.id);
        if (node.children) {
            node.children.forEach(child => addToVisible(child));
        }
    }

    topChildren.forEach(child => addToVisible(child));
    return visible;
}

// ==================== 组件定义 ====================

// 模式详情弹窗组件
function PatternDetailModal({
    pattern,
    details,
    onClose,
}: {
    pattern: string;
    details: PatternDetailItem[];
    onClose: () => void;
}) {
    if (!details.length) return null;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 标题栏 */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-blue-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">课堂片段详情</h3>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {pattern.split(' → ').map((abbr, i) => (
                                    <span
                                        key={i}
                                        className="px-2 py-1 rounded-full text-xs text-white font-medium"
                                        style={{ backgroundColor: LABEL_COLORS[abbr] || '#999' }}
                                    >
                                        {abbr}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        >
                            <span className="text-gray-600 text-xl">×</span>
                        </button>
                    </div>
                </div>

                {/* 内容区域 */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="space-y-3">
                        {details.map((item, idx) => (
                            <div
                                key={idx}
                                className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    {/* 时间和标签 */}
                                    <div className="flex flex-col items-center gap-1 min-w-[80px]">
                                        <div className="text-xs text-gray-500 font-mono">
                                            {formatTime(item.startTime)} - {formatTime(item.endTime)}
                                        </div>
                                        <span
                                            className="px-2 py-0.5 rounded-full text-xs text-white font-medium whitespace-nowrap"
                                            style={{ backgroundColor: LABEL_COLORS[item.abbr] || '#999' }}
                                        >
                                            {item.label}
                                        </span>
                                    </div>

                                    {/* 文本内容 */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm leading-relaxed ${item.text === 'silent' || item.text === 'inaudible'
                                            ? 'text-gray-400 italic'
                                            : 'text-gray-700'
                                            }`}>
                                            {item.text === 'silent' ? '（无声）' :
                                                item.text === 'inaudible' ? '（不可听）' :
                                                    item.text}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 底部信息 */}
                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
                    共 {details.length} 个片段，时长 {formatTime(details[details.length - 1].endTime - details[0].startTime)}
                </div>
            </div>
        </div>
    );
}

function PatternMiningTable({
    data,
    selectedPattern,
    onSelectPattern,
}: {
    data: TableRow[];
    selectedPattern: string | null;
    onSelectPattern: (pattern: string) => void;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
                <select className="px-3 py-1.5 border rounded-lg text-sm bg-white text-gray-700">
                    <option>Select Pattern</option>
                </select>
            </div>

            <div className="grid grid-cols-[40px_1fr_50px_60px] gap-2 text-xs text-gray-500 font-medium px-2">
                <span>Len</span>
                <span>Pattern</span>
                <span>Count</span>
                <span>Avg</span>
            </div>

            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
                {data.map((row, idx) => (
                    <div
                        key={idx}
                        onClick={() => onSelectPattern(row.pattern)}
                        className={`
                            p-3 rounded-xl border cursor-pointer transition-all
                            ${selectedPattern === row.pattern
                                ? 'border-orange-400 bg-orange-50 shadow-sm'
                                : 'border-gray-100 bg-white hover:border-gray-200'}
                        `}
                    >
                        <div className="grid grid-cols-[40px_1fr_50px_60px] gap-2 items-center">
                            <span className="text-sm text-gray-600">{row.length}</span>
                            <div className="flex items-center flex-wrap gap-1">
                                {row.pattern.split(' → ').map((abbr, i) => (
                                    <span
                                        key={i}
                                        className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
                                        style={{ backgroundColor: LABEL_COLORS[abbr] || '#999' }}
                                    >
                                        {i + 1}.{abbr}
                                    </span>
                                ))}
                            </div>
                            <span className="text-sm text-gray-600">{row.count}</span>
                            <span className="text-sm text-gray-600">{row.avgScore.toFixed(3)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-center gap-2 mt-4 text-sm">
                <button className="px-3 py-1 text-gray-400 hover:text-gray-600 transition-colors">First</button>
                <button className="px-3 py-1 text-gray-400 hover:text-gray-600 transition-colors">Prev</button>
                <button className="px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors">Next</button>
                <button className="px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors">Last</button>
            </div>
        </div>
    );
}

function InteractionTree({
    treeData,
    visibleNodes,
    highlightPath,
    onNodeClick,
    onLeafNodeClick,
}: {
    treeData: TreeNode | null;
    visibleNodes: Set<string>;
    highlightPath: string[] | null;
    onNodeClick: (nodeId: string) => void;
    onLeafNodeClick: (pattern: string) => void;
}) {
    const svgRef = useRef<SVGSVGElement>(null);
    const mainGroupRef = useRef<any>(null);
    const zoomRef = useRef<any>(null);
    const [d3, setD3] = useState<any>(null);

    useEffect(() => {
        import('d3').then((d3Module) => {
            setD3(d3Module);
        });
    }, []);

    // 自动适配视图到容器
    const fitToView = useCallback(() => {
        if (!svgRef.current || !treeData || !d3 || !zoomRef.current) return;

        const svg = d3.select(svgRef.current);
        const container = svgRef.current.parentElement;
        const width = container?.clientWidth || 1200;
        const height = container?.clientHeight || 800;
        const padding = 60;

        // 获取图表内容的边界
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        const nodes = svg.selectAll('.node');
        nodes.each(function (this: any, d: any) {
            const transform = d3.select(this).attr('transform');
            const match = /translate\(([^,]+),([^)]+)\)/.exec(transform);
            if (match) {
                const x = parseFloat(match[1]);
                const y = parseFloat(match[2]);
                const r = getNodeRadius(d.data.count);
                if (x - r < minX) minX = x - r;
                if (x + r > maxX) maxX = x + r;
                if (y - r < minY) minY = y - r;
                if (y + r > maxY) maxY = y + r;
            }
        });

        // 计算缩放比例以适应容器
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const scaleX = (width - padding * 2) / contentWidth;
        const scaleY = (height - padding * 2) / contentHeight;
        const scale = Math.min(scaleX, scaleY, 1);

        // 计算居中平移
        const contentCenterX = (minX + maxX) / 2;
        const contentCenterY = (minY + maxY) / 2;
        const translateX = width / 2 - contentCenterX * scale;
        const translateY = height / 2 - contentCenterY * scale;

        // 应用变换
        const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
        svg.transition().duration(500).call(zoomRef.current.transform, transform);
    }, [treeData, d3]);

    useEffect(() => {
        if (!svgRef.current || !treeData || !d3) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const container = svgRef.current.parentElement;
        const width = container?.clientWidth || 1200;
        const height = container?.clientHeight || 800;
        const margin = { top: 40, right: 120, bottom: 40, left: 80 };

        svg.attr('width', width).attr('height', height);

        // 添加缩放行为
        const zoom = d3.zoom()
            .scaleExtent([0.3, 3])
            .on('zoom', (event: any) => {
                if (mainGroupRef.current) {
                    mainGroupRef.current.attr('transform', event.transform);
                }
            });

        svg.call(zoom).on('dblclick.zoom', null);
        zoomRef.current = zoom;

        const mainGroup = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);
        mainGroupRef.current = mainGroup;

        // 过滤只显示可见节点
        function filterTree(node: TreeNode): TreeNode | null {
            if (!visibleNodes.has(node.id) && node.id !== 'root') return null;

            const filteredChildren = node.children
                .map(c => filterTree(c))
                .filter(Boolean) as TreeNode[];

            return { ...node, children: filteredChildren };
        }

        const filteredRoot = filterTree(treeData);
        if (!filteredRoot) return;

        // 树布局 - 扁平化配置：减小垂直间距，增大水平间距
        const treeLayout = d3.tree<TreeNode>()
            .nodeSize([35, 200])
            .separation((a: any, b: any) => 1.2);

        const root = d3.hierarchy(filteredRoot);
        treeLayout(root);

        // 居中计算
        let minY = Infinity, maxY = -Infinity;
        root.each((d: any) => {
            if (d.x < minY) minY = d.x;
            if (d.x > maxY) maxY = d.x;
        });
        const offsetY = -((minY + maxY) / 2);

        // 绘制连线
        const linkGenerator = d3.linkHorizontal()
            .x((d: any) => d.y)
            .y((d: any) => d.x + offsetY);

        // 获取完整路径上的节点ID集合
        const pathNodeIds = new Set<string>();
        if (highlightPath) {
            // 找到匹配 highlightPath 的完整路径
            function findPath(node: any, targetPath: string[], currentIndex = 0): any[] | null {
                if (currentIndex >= targetPath.length) return [];
                if (!node.children || node.children.length === 0) return null;
                for (const child of node.children) {
                    if (child.data.abbr === targetPath[currentIndex]) {
                        const rest = findPath(child, targetPath, currentIndex + 1);
                        if (rest !== null) {
                            return [child, ...rest];
                        }
                    }
                }
                return null;
            }

            const pathNodes = findPath(root, highlightPath);
            if (pathNodes) {
                pathNodes.forEach((n: any) => pathNodeIds.add(n.data.id));
            }
        }

        mainGroup.selectAll('.link')
            .data(root.links())
            .join('path')
            .attr('class', 'link')
            .attr('d', (d: any) => {
                const sr = getNodeRadius(d.source.data.count);
                const tr = getNodeRadius(d.target.data.count);
                return linkGenerator({
                    source: { x: d.source.x, y: d.source.y + sr },
                    target: { x: d.target.x, y: d.target.y - tr }
                });
            })
            .attr('fill', 'none')
            .attr('stroke', (d: any) => {
                if (highlightPath && pathNodeIds.size > 0) {
                    const sourceInPath = pathNodeIds.has(d.source.data.id);
                    const targetInPath = pathNodeIds.has(d.target.data.id);
                    if (sourceInPath && targetInPath) return '#ff6600'; // 高亮路径 - 深橙色
                }
                // 使用源节点颜色
                const sourceColor = LABEL_COLORS[d.source.data.abbr] || '#999';
                return sourceColor;
            })
            .attr('stroke-width', (d: any) => {
                if (highlightPath && pathNodeIds.size > 0) {
                    const sourceInPath = pathNodeIds.has(d.source.data.id);
                    const targetInPath = pathNodeIds.has(d.target.data.id);
                    if (sourceInPath && targetInPath) return getLinkWidth(d.target.data.count) + 1; // 高亮路径更粗
                }
                return getLinkWidth(d.target.data.count); // 基于目标节点频次
            })
            .attr('stroke-dasharray', (d: any) => {
                if (highlightPath && pathNodeIds.size > 0) {
                    const sourceInPath = pathNodeIds.has(d.source.data.id);
                    const targetInPath = pathNodeIds.has(d.target.data.id);
                    if (sourceInPath && targetInPath) return '0'; // 高亮路径实线
                }
                return getLinkDashArray(d.target.data.avgScore); // 基于质量评分
            })
            .attr('opacity', (d: any) => {
                if (highlightPath && pathNodeIds.size > 0) {
                    const sourceInPath = pathNodeIds.has(d.source.data.id);
                    const targetInPath = pathNodeIds.has(d.target.data.id);
                    if (sourceInPath && targetInPath) return 1; // 高亮路径完全不透明
                    if (sourceInPath || targetInPath) return 0.25;
                    return 0.06; // 非相关连线更暗
                }
                // 基于频次的透明度
                const count = d.target.data.count;
                if (count >= 10) return 0.85;
                if (count >= 6) return 0.7;
                if (count >= 3) return 0.55;
                return 0.4;
            });

        // 绘制节点
        const nodes = mainGroup.selectAll('.node')
            .data(root.descendants().filter((d: any) => d.depth > 0))
            .join('g')
            .attr('class', 'node')
            .attr('transform', (d: any) => `translate(${d.y}, ${d.x + offsetY})`)
            .style('cursor', 'pointer')
            .on('click', (event: MouseEvent, d: any) => {
                event.stopPropagation();

                // 判断是否是叶子节点：需要从原始树数据中查找，而不是过滤后的数据
                const nodeId = d.data.id;
                const originalNode = findNodeById(treeData, nodeId);
                const isLeaf = !originalNode || !originalNode.children || originalNode.children.length === 0;

                if (isLeaf) {
                    // 叶子节点：提取完整路径并显示详情
                    const path: string[] = [];
                    let currentNode = d;
                    while (currentNode.parent && currentNode.parent.depth > 0) {
                        path.unshift(currentNode.data.abbr);
                        currentNode = currentNode.parent;
                    }
                    path.unshift(currentNode.data.abbr);
                    const pattern = path.join(' → ');
                    onLeafNodeClick(pattern);
                } else {
                    // 非叶子节点：折叠/展开
                    onNodeClick(nodeId);
                }
            });

        // 高亮节点的外圈（发光效果）- 只高亮路径上的节点
        const highlightedNodes = nodes.filter((d: any) => pathNodeIds.has(d.data.id));
        highlightedNodes.append('circle')
            .attr('r', (d: any) => getNodeRadius(d.data.count) + 4)
            .attr('fill', 'none')
            .attr('stroke', '#ff6600')
            .attr('stroke-width', 2)
            .attr('opacity', 0.5);

        // 绘制节点：区分末端节点（纯色圆）和非末端节点（饼图）
        const leafNodes = nodes.filter((d: any) => !d.data.childDistribution || d.data.childDistribution.length === 0);
        const parentNodes = nodes.filter((d: any) => d.data.childDistribution && d.data.childDistribution.length > 0);

        // 末端节点：纯色圆
        leafNodes.append('circle')
            .attr('r', (d: any) => getNodeRadius(d.data.count))
            .attr('fill', (d: any) => {
                const color = LABEL_COLORS[d.data.abbr] || '#999';
                if (highlightPath && pathNodeIds.size > 0 && !pathNodeIds.has(d.data.id)) {
                    return color + '44';
                }
                return color;
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', (d: any) => pathNodeIds.has(d.data.id) ? 3 : 2)
            .attr('opacity', (d: any) => {
                if (highlightPath && pathNodeIds.size > 0 && !pathNodeIds.has(d.data.id)) return 0.5;
                return 1;
            });

        // 非末端节点：绘制饼图
        parentNodes.each(function (this: any, d: any) {
            const node = d3.select(this);
            const radius = getNodeRadius(d.data.count);
            const distribution = d.data.childDistribution || [];

            // 中心圆（类型主色）
            const mainColor = LABEL_COLORS[d.data.abbr] || '#999';
            const isDimmed = highlightPath && pathNodeIds.size > 0 && !pathNodeIds.has(d.data.id);

            node.append('circle')
                .attr('r', radius * 0.55)
                .attr('fill', isDimmed ? mainColor + '44' : mainColor)
                .attr('opacity', isDimmed ? 0.5 : 1);

            // 饼图扇形（子节点分布）
            const pie = d3.pie<any>().value((d: any) => d.percentage).sort(null);
            const arc = d3.arc<any>()
                .innerRadius(radius * 0.6)
                .outerRadius(radius);

            const arcs = pie(distribution);

            node.selectAll('.arc')
                .data(arcs)
                .join('path')
                .attr('class', 'arc')
                .attr('d', arc)
                .attr('fill', (arcData: any) => {
                    const color = LABEL_COLORS[arcData.data.abbr] || '#999';
                    return isDimmed ? color + '66' : color;
                })
                .attr('stroke', '#fff')
                .attr('stroke-width', 1)
                .attr('opacity', isDimmed ? 0.5 : 0.9);

            // 外边框
            node.append('circle')
                .attr('r', radius)
                .attr('fill', 'none')
                .attr('stroke', '#fff')
                .attr('stroke-width', pathNodeIds.has(d.data.id) ? 3 : 2);
        });

        // 节点标签
        nodes.append('text')
            .attr('dy', 4)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-size', (d: any) => getNodeRadius(d.data.count) > 15 ? 10 : 8)
            .attr('font-weight', 500)
            .text((d: any) => d.data.abbr);

        // 展开/折叠指示器 - 当有子节点但部分被隐藏时显示
        const collapsibleNodes = nodes.filter((d: any) => {
            const original = findNodeById(treeData, d.data.id);
            if (!original || original.children.length === 0) return false;
            // 有隐藏的子节点
            return original.children.some(c => !visibleNodes.has(c.id));
        });

        collapsibleNodes.append('circle')
            .attr('cx', (d: any) => getNodeRadius(d.data.count) + 12)
            .attr('cy', 0)
            .attr('r', 8)
            .attr('fill', '#4a90e2')
            .attr('stroke', '#3b82f6')
            .attr('stroke-width', 1);

        collapsibleNodes.append('text')
            .attr('x', (d: any) => getNodeRadius(d.data.count) + 12)
            .attr('dy', 4)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-size', 10)
            .attr('font-weight', 'bold')
            .text('+');

        // 末端节点或完全展开的节点显示路径标签
        nodes.filter((d: any) => {
            const original = findNodeById(treeData, d.data.id);
            // 没有子节点 或者 所有子节点都可见（可以折叠）
            return !original?.children?.length || original.children.every(c => visibleNodes.has(c.id));
        })
            .append('text')
            .attr('x', (d: any) => {
                const original = findNodeById(treeData, d.data.id);
                const hasCollapsedChildren = original && original.children.length > 0 &&
                    !original.children.every(c => visibleNodes.has(c.id));
                return getNodeRadius(d.data.count) + (hasCollapsedChildren ? 24 : 8);
            })
            .attr('dy', 4)
            .attr('fill', '#666')
            .attr('font-size', 9)
            .text((d: any) => {
                const path: string[] = [];
                let node = d;
                while (node.parent) {
                    path.unshift(node.data.abbr);
                    node = node.parent;
                }
                // 使用箭头表示顺序：起始 → 中间 → 末端
                return path.join(' → ');
            });

        // 自动适配视图
        setTimeout(() => fitToView(), 0);

    }, [treeData, visibleNodes, highlightPath, onNodeClick, onLeafNodeClick, d3, fitToView]);

    // 窗口大小变化时重新适配
    useEffect(() => {
        const handleResize = () => {
            fitToView();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [fitToView]);

    // 缩放控制函数
    const zoomIn = useCallback(() => {
        if (!svgRef.current || !d3 || !zoomRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
    }, [d3]);

    const zoomOut = useCallback(() => {
        if (!svgRef.current || !d3 || !zoomRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(zoomRef.current.scaleBy, 1 / 1.3);
    }, [d3]);

    const zoomReset = useCallback(() => {
        fitToView();
    }, [fitToView]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 h-full relative overflow-hidden">
            {/* 缩放控制按钮 */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
                <button
                    className="w-8 h-8 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center text-gray-700 font-medium"
                    onClick={zoomIn}
                    title="放大"
                >
                    +
                </button>
                <button
                    className="w-8 h-8 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center text-gray-700 font-medium"
                    onClick={zoomOut}
                    title="缩小"
                >
                    −
                </button>
                <button
                    className="px-2 h-8 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all text-xs text-gray-600"
                    onClick={zoomReset}
                    title="适配视图"
                >
                    Fit
                </button>
            </div>

            <div className="absolute top-4 left-4 text-xs text-gray-400 z-10 bg-white/80 px-2 py-1 rounded">
                滚轮缩放 · 拖拽平移 · 点击节点折叠
            </div>

            <svg ref={svgRef} className="w-full h-full" style={{ minHeight: 400 }} />
        </div>
    );
}

// ==================== 主组件 ====================

export function TeachTree() {
    const [rawData, setRawData] = useState<RawDataItem[]>([]);
    const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
    const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());
    const [treeData, setTreeData] = useState<TreeNode | null>(null);
    const [displayPatterns, setDisplayPatterns] = useState<PatternResult[]>([]);
    const [patternDetails, setPatternDetails] = useState<PatternDetailItem[] | null>(null);
    const [detailPattern, setDetailPattern] = useState<string | null>(null);

    useEffect(() => {
        fetch('/TeachTree.jsonl')
            .then(res => res.text())
            .then(text => {
                const lines = text.trim().split('\n');
                const data: RawDataItem[] = lines.map(line => JSON.parse(line));
                setRawData(data);
            })
            .catch(console.error);
    }, []);

    const processedSeq = useMemo(() => preprocessData(rawData), [rawData]);
    const patterns = useMemo(() => minePatterns(processedSeq, rawData, 15, 2), [processedSeq, rawData]);

    useEffect(() => {
        if (patterns.length > 0) {
            const tree = buildInteractionTree(patterns);
            setTreeData(tree);
            // 初始化默认显示：前2个最高频根节点及其全部子树
            setVisibleNodes(getDefaultVisibleNodes(tree));
            // 提取从根到叶的完整路径模式用于表格显示
            const leafPatterns = extractRootToLeafPatterns(tree, patterns);
            setDisplayPatterns(leafPatterns);
        }
    }, [patterns]);

    const highlightPath = selectedPattern?.split(' → ') || null;

    // 当选择新模式时，自动展开显示相关路径中的所有节点
    useEffect(() => {
        if (selectedPattern && treeData) {
            const patternNodes = selectedPattern.split(' → ');
            const newVisible = new Set(visibleNodes);

            // 找到路径中的所有节点并标记为可见
            let current = treeData;
            for (const abbr of patternNodes) {
                const child = current.children.find(c => c.abbr === abbr);
                if (child) {
                    newVisible.add(child.id);
                    current = child;
                } else {
                    break;
                }
            }

            setVisibleNodes(newVisible);
        }
    }, [selectedPattern]);

    const handleNodeClick = useCallback((nodeId: string) => {
        if (!treeData) return;
        const newVisible = new Set(visibleNodes);
        const node = findNodeById(treeData, nodeId);
        if (!node) return;

        const allChildrenVisible = node.children.every(c => newVisible.has(c.id));

        if (allChildrenVisible) {
            // 折叠：移除所有子孙节点
            function removeDescendants(n: TreeNode) {
                n.children.forEach(c => {
                    newVisible.delete(c.id);
                    removeDescendants(c);
                });
            }
            removeDescendants(node);
        } else {
            // 展开：添加直接子节点
            node.children.forEach(c => newVisible.add(c.id));
        }

        setVisibleNodes(newVisible);
    }, [treeData, visibleNodes]);

    const handleLeafNodeClick = useCallback((pattern: string) => {
        const details = extractPatternDetails(pattern, rawData);
        setPatternDetails(details);
        setDetailPattern(pattern);
    }, [rawData]);

    const handleCloseDetail = useCallback(() => {
        setPatternDetails(null);
        setDetailPattern(null);
    }, []);

    return (
        <div className="flex h-screen bg-gray-50">
            <div className="w-[340px] border-r border-gray-200 bg-white p-4 overflow-auto shadow-sm">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Pattern Mining</h2>
                <PatternMiningTable
                    data={displayPatterns as unknown as TableRow[]}
                    selectedPattern={selectedPattern}
                    onSelectPattern={setSelectedPattern}
                />
            </div>

            <div className="flex-1 p-6 overflow-auto">
                <InteractionTree
                    treeData={treeData}
                    visibleNodes={visibleNodes}
                    highlightPath={highlightPath}
                    onNodeClick={handleNodeClick}
                    onLeafNodeClick={handleLeafNodeClick}
                />
            </div>

            {/* 模式详情弹窗 */}
            {patternDetails && detailPattern && (
                <PatternDetailModal
                    pattern={detailPattern}
                    details={patternDetails}
                    onClose={handleCloseDetail}
                />
            )}
        </div>
    );
}

// ==================== 代码导出 ====================

export const teachTreeCode = {
    core: `// Interaction Tree with Auto-Fit and Collapse
const zoom = d3.zoom()
  .scaleExtent([0.3, 3])
  .on('zoom', (event) => {
    mainGroup.attr('transform', event.transform);
  });

svg.call(zoom).on('dblclick.zoom', null);

// Filter tree to show only visible nodes
function filterTree(node: TreeNode): TreeNode | null {
  if (!visibleNodes.has(node.id) && node.id !== 'root') return null;
  const filteredChildren = node.children
    .map(c => filterTree(c))
    .filter(Boolean) as TreeNode[];
  return { ...node, children: filteredChildren };
}

// Node click handler for collapse/expand
nodes.on('click', (event, d) => {
  const node = findNodeById(treeData, d.data.id);
  const allChildrenVisible = node.children.every(c => visibleNodes.has(c.id));

  if (allChildrenVisible) {
    // Collapse: remove all descendants
    function removeDescendants(n) {
      n.children.forEach(c => {
        visibleNodes.delete(c.id);
        removeDescendants(c);
      });
    }
    removeDescendants(node);
  } else {
    // Expand: add direct children
    node.children.forEach(c => visibleNodes.add(c.id));
  }
  setVisibleNodes(new Set(visibleNodes));
});

// Show + indicator for expandable nodes
collapsibleNodes.append('circle')
  .attr('r', 8).attr('fill', '#4a90e2').attr('stroke', '#3b82f6')
collapsibleNodes.append('text')
  .attr('dy', 4).attr('text-anchor', 'middle')
  .attr('font-weight', 'bold').text('+');`,

    data: `// Data Processing and Default View Strategy

// Get default visible nodes (top 2 highest frequency root nodes with full subtree)
function getDefaultVisibleNodes(root: TreeNode): Set<string> {
  const visible = new Set<string>();

  const topChildren = [...root.children]
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);

  function addToVisible(node: TreeNode) {
    visible.add(node.id);
    if (node.children) {
      node.children.forEach(child => addToVisible(child));
    }
  }

  topChildren.forEach(child => addToVisible(child));
  return visible;
}

// Behavior abbreviation mapping
const LABEL_ABBR: Record<string, string> = {
  "教师提问": "TQ", "教师讲授": "TL", "教师反馈": "TF",
  "教师指令": "TI", "教师板书": "TB", "教师巡视": "TP",
  "学生发言": "SS", "学生讨论": "SD", "课堂沉寂": "CS",
  "技术操作": "TO"
};

// Merge consecutive same behaviors
function preprocessData(rawData: RawDataItem[]): MergedItem[] {
  const merged: MergedItem[] = [];
  for (const item of rawData) {
    const abbr = LABEL_ABBR[item.label] || item.label;
    if (merged.length === 0 || merged[merged.length - 1].abbr !== abbr) {
      merged.push({ label: item.label, abbr, count: 1 });
    } else {
      merged[merged.length - 1].count++;
    }
  }
  return merged;
}

// Mine N-gram patterns (N=2 to 15)
function minePatterns(sequence: MergedItem[], maxLength = 15, minCount = 2): PatternResult[] {
  const patterns = new Map<string, number>();
  const abbrSeq = sequence.map(s => s.abbr);

  for (let n = 2; n <= Math.min(maxLength, abbrSeq.length); n++) {
    for (let i = 0; i <= abbrSeq.length - n; i++) {
      const pattern = abbrSeq.slice(i, i + n).join(' → ');
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }
  }

  return Array.from(patterns.entries())
    .filter(([_, count]) => count >= minCount)
    .map(([pattern, count]) => ({
      pattern, length: pattern.split(' → ').length, count,
      avgScore: (0.5 + Math.random() * 0.4) as number
    }))
    .sort((a, b) => b.length - a.length || b.count - a.count);
}

// Build hierarchical tree from patterns
function buildInteractionTree(patterns: PatternResult[]): TreeNode {
  const root: TreeNode = {
    id: 'root', abbr: 'ROOT', label: '根节点',
    count: patterns.length, children: [], depth: 0
  };

  for (const { pattern, count } of patterns) {
    const nodes = pattern.split(' → ');
    let current = root;
    for (let i = 0; i < nodes.length; i++) {
      const abbr = nodes[i];
      let child = current.children.find(c => c.abbr === abbr);
      if (!child) {
        child = { id: \`\${current.id}-\${abbr}-\${i}\`, abbr,
          label: LABEL_FULL_NAME[abbr] || abbr,
          count: 0, children: [], depth: i + 1 };
        current.children.push(child);
      }
      child.count += count;
      current = child;
    }
  }
  return root;
}`,

    styles: `// Styling Configuration

// Node size based on aggregation count
function getNodeRadius(count: number): number {
  if (count >= 10) return 28;  // Large node
  if (count >= 4) return 18;   // Medium node
  return 10;                   // Small node
}

// Color scheme: Teacher behaviors (warm), Students (cool), Silence (gray)
const LABEL_COLORS: Record<string, string> = {
  "TQ": "#FF8C00", "TL": "#FFB347", "TF": "#4ECDC4",
  "TI": "#95E1D3", "TB": "#A8A8A8", "TP": "#C0C0C0",
  "SS": "#5B8DEE", "SD": "#7FB3D5", "CS": "#E0E0E0",
  "TO": "#DDA0DD"
};

// Link styling - dashed bezier curves
.attr('stroke', d => highlightPath?.includes(d.target.data.abbr) ? '#FF8C00' : '#B0A0C0')
.attr('stroke-dasharray', '6,4')
.attr('opacity', d => highlightPath && !highlightPath.includes(d.target.data.abbr) ? 0.2 : 0.7)

// Expandable node indicator (blue circle with white +)
collapsibleNodes.append('circle')
  .attr('r', 8).attr('fill', '#4a90e2').attr('stroke', '#3b82f6')
collapsibleNodes.append('text')
  .attr('dy', 4).attr('text-anchor', 'middle')
  .attr('font-weight', 'bold').text('+');

// Zoom control buttons
<button onClick={() => svg.transition().call(zoom.scaleBy, 1.3)}>+</button>
<button onClick={() => svg.transition().call(zoom.scaleBy, 1/1.3)}>−</button>
<button onClick={fitToView}>Fit</button>`,

    full: `"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";

// Full component source - see TeachTree/index.tsx
// Contains: data loading from JSONL, preprocessing, pattern mining,
// tree building, PatternMiningTable component, InteractionTree component
// with D3.js visualization, auto-fit to viewport, zoom/pan support,
// and node collapse/expand functionality.
// Default shows top 2 highest frequency root nodes with full subtree.
// Click nodes to collapse/expand subtrees.
// ~500 lines of TypeScript + D3.js code.`,
};
