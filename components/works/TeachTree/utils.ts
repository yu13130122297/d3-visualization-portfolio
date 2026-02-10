import type { RawDataItem, MergedItem, PatternResult, TreeNode, PatternDetailItem } from './types';
import { LABEL_ABBR, LABEL_FULL_NAME } from './constants';

// ==================== 数据处理函数 ====================

// 解析时间戳：T01_0000_0004 → { start: 0, end: 4, duration: 4 }
export function parseTimeStamp(id: string): { start: number; end: number; duration: number } {
    const match = id.match(/(\d+)_(\d+)$/);
    if (!match) return { start: 0, end: 0, duration: 0 };
    const start = parseInt(match[1]);
    const end = parseInt(match[2]);
    return { start, end, duration: end - start };
}

// 基于时长计算模式评分（方案一+三：时长加权学生中心度 + 教育学阈值）
export function calculatePatternScore(pattern: string, rawData: RawDataItem[]): number {
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

export function preprocessData(rawData: RawDataItem[]): MergedItem[] {
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

export function minePatterns(sequence: MergedItem[], rawData: RawDataItem[], maxLength = 15, minCount = 2): PatternResult[] {
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

export function buildInteractionTree(patterns: PatternResult[]): TreeNode {
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

export function getNodeRadius(count: number): number {
    if (count >= 10) return 28;
    if (count >= 4) return 18;
    return 10;
}

// 根据转移频次计算连线粗细
export function getLinkWidth(count: number): number {
    if (count >= 10) return 5;
    if (count >= 6) return 3.5;
    if (count >= 3) return 2;
    return 1;
}

// 根据质量评分计算连线虚实度
export function getLinkDashArray(avgScore?: number): string {
    if (!avgScore) return '4,2'; // 默认短虚线
    if (avgScore >= 0.8) return '0'; // 高分实线
    if (avgScore >= 0.5) return '4,2'; // 中分短虚线
    return '8,4'; // 低分长虚线
}

// ==================== 辅助函数 ====================

export function findNodeById(node: TreeNode, id: string): TreeNode | null {
    if (node.id === id) return node;
    for (const child of node.children) {
        const found = findNodeById(child, id);
        if (found) return found;
    }
    return null;
}

// 从原始数据中提取匹配模式的片段（合并后显示）
export function extractPatternDetails(pattern: string, rawData: RawDataItem[]): PatternDetailItem[] {
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
export function extractRootToLeafPatterns(root: TreeNode, patterns: PatternResult[]): PatternResult[] {
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
export function getDefaultVisibleNodes(root: TreeNode): Set<string> {
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
