"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { RawDataItem, PatternResult, TreeNode, PatternDetailItem, TableRow } from './types';
import {
    preprocessData,
    minePatterns,
    buildInteractionTree,
    getDefaultVisibleNodes,
    extractRootToLeafPatterns,
    extractPatternDetails,
    findNodeById
} from './utils';
import { PatternDetailModal } from './PatternDetailModal';
import { PatternMiningTable } from './PatternMiningTable';
import { InteractionTree } from './InteractionTree';

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
