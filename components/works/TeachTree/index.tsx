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
    const [tableWidth, setTableWidth] = useState(340);

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

    // 表格拖拽调整宽度
    const [isResizing, setIsResizing] = useState(false);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);

        const startX = e.clientX;
        const startWidth = tableWidth;

        const handleMouseMove = (e: MouseEvent) => {
            const diff = e.clientX - startX;
            const newWidth = Math.max(280, Math.min(600, startWidth + diff));
            setTableWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [tableWidth]);

    return (
        <div className="flex flex-col lg:flex-row h-[100dvh] bg-gray-50">
            <div
                className={`border-r border-gray-200 bg-white overflow-hidden shadow-sm flex-shrink-0 transition-all duration-200 ${tableWidth < 300 ? 'p-2' : 'p-4'} w-full lg:w-auto`}
                style={{ width: `${Math.max(280, Math.min(600, tableWidth))}px`, maxWidth: '100%' }}
            >
                <h2 className={`font-semibold text-gray-800 ${tableWidth < 300 ? 'text-sm mb-2' : 'text-lg mb-4'}`}>
                    {tableWidth < 300 ? 'Patterns' : 'Pattern Mining'}
                </h2>
                <PatternMiningTable
                    data={displayPatterns as unknown as TableRow[]}
                    selectedPattern={selectedPattern}
                    onSelectPattern={setSelectedPattern}
                />
            </div>

            {/* 拖拽调整宽度的手柄 - 仅在桌面端显示 */}
            <div
                className={`w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize flex-shrink-0 transition-colors hidden lg:block ${isResizing ? 'bg-blue-500' : ''}`}
                onMouseDown={handleMouseDown}
                title="拖拽调整宽度"
            />

            <div className="flex-1 p-4 lg:p-6 pt-0 overflow-auto min-w-0 min-h-0">
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

// ==================== Prompt for recreating this Visualization ====================

export const teachTreePrompt = `# 教学交互模式分析系统 - 交互式树形可视化

请创建一个教学交互模式分析系统，包含两个核心组件：Pattern Mining Table（模式挖掘表）和 Interaction Tree（交互树）。左右布局，左侧表格，右侧树形可视化。

## 一、系统概述
- 从 JSONL 数据源加载教学行为序列数据
- 使用 N-gram 算法挖掘行为模式（支持长链 N=2~15）
- 将模式构建成交互式树形结构
- 支持节点展开/折叠、缩放拖拽
- 悬停高亮路径、点击表格联动树形展示

## 二、整体布局
\`\`\`tsx
<div className="flex flex-col lg:flex-row h-[100dvh] bg-gray-50">
  {/* 左侧：Pattern Mining Table */}
  <div className="border-r border-gray-200 bg-white overflow-hidden shadow-sm flex-shrink-0 w-[340px]">
    <h2 className="font-semibold text-gray-800 text-lg mb-4">Pattern Mining</h2>
    <PatternMiningTable
      data={displayPatterns}
      selectedPattern={selectedPattern}
      onSelectPattern={setSelectedPattern}
    />
  </div>

  {/* 右侧：Interaction Tree */}
  <div className="flex-1 p-4 lg:p-6 overflow-auto">
    <InteractionTree
      treeData={treeData}
      visibleNodes={visibleNodes}
      highlightPath={highlightPath}
      onNodeClick={handleNodeClick}
      onLeafNodeClick={handleLeafNodeClick}
    />
  </div>
</div>
\`\`\`

## 三、数据结构与处理

### 1. 数据源格式（JSONL）
\`\`\`json
{"id": "T01_0000_0004", "label": "教师指令", "text": "老师：好，请坐。"}
{"id": "T01_0004_0007", "label": "教师讲授", "text": "老师：本章的知识框架..."}
\`\`\`

### 2. 行为类型缩写映射
\`\`\`typescript
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
  "技术操作": "TO"
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
\`\`\`

### 3. 数据预处理：合并连续相同行为
\`\`\`typescript
interface MergedItem {
  label: string;
  abbr: string;
  count: number;
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
\`\`\`

### 4. 行为链模式挖掘（支持长链，N=2~15）
\`\`\`typescript
interface PatternResult {
  pattern: string;      // 如 "TQ → SS → TF"
  length: number;       // 链长度
  count: number;        // 出现次数
  avgScore?: number;    // 平均质量分
}

function minePatterns(
  sequence: MergedItem[],
  rawData: RawDataItem[],
  maxLength = 15,
  minCount = 2
): PatternResult[] {
  const patterns = new Map<string, number>();
  const abbrSeq = sequence.map(s => s.abbr);

  // 提取所有 N-gram（N从2到maxLength）
  for (let n = 2; n <= Math.min(maxLength, abbrSeq.length); n++) {
    for (let i = 0; i <= abbrSeq.length - n; i++) {
      const pattern = abbrSeq.slice(i, i + n).join(' → ');
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }
  }

  // 过滤并排序：长链优先，同长度按频次排序
  return Array.from(patterns.entries())
    .filter(([_, count]) => count >= minCount)
    .map(([pattern, count]) => ({
      pattern,
      length: pattern.split(' → ').length,
      count,
      avgScore: calculateAvgScore(pattern, rawData)
    }))
    .sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length;
      return b.count - a.count;
    });
}
\`\`\`

### 5. 构建交互树数据结构
\`\`\`typescript
interface TreeNode {
  id: string;
  abbr: string;
  label: string;
  count: number;        // 聚合计数（决定节点大小）
  children: TreeNode[];
  depth: number;
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

  // 将每个模式插入树中
  for (const { pattern, count } of patterns) {
    const nodes = pattern.split(' → ');
    let current = root;

    for (let i = 0; i < nodes.length; i++) {
      const abbr = nodes[i];
      let child = current.children.find(c => c.abbr === abbr);

      if (!child) {
        child = {
          id: \`\${current.id}-\${abbr}-\${i}\`,
          abbr,
          label: Object.keys(LABEL_ABBR).find(k => LABEL_ABBR[k] === abbr) || abbr,
          count: 0,
          children: [],
          depth: i + 1
        };
        current.children.push(child);
      }
      child.count += count;
      current = child;
    }
  }

  return root;
}
\`\`\`

### 6. 默认可见节点（显示前2个高频根节点及其子树）
\`\`\`typescript
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
\`\`\`

## 四、组件一：Pattern Mining Table

\`\`\`tsx
interface TableRow {
  length: number;
  pattern: string;
  count: number;
  avgScore: number;
}

function PatternMiningTable({
  data,
  selectedPattern,
  onSelectPattern
}: {
  data: TableRow[];
  selectedPattern: string | null;
  onSelectPattern: (pattern: string) => void;
}) {
  return (
    <div className="space-y-3">
      {/* 表头 */}
      <div className="grid grid-cols-[40px_1fr_50px_60px] gap-2 text-xs text-gray-500 font-medium px-2">
        <span>L...</span>
        <span>Pattern</span>
        <span>C...</span>
        <span>Avg.</span>
      </div>

      {/* 表格内容 */}
      <div className="space-y-2">
        {data.map((row, idx) => (
          <div
            key={idx}
            onClick={() => onSelectPattern(row.pattern)}
            className={\`
              p-3 rounded-xl border cursor-pointer transition-all
              \${selectedPattern === row.pattern
                ? 'border-orange-400 bg-orange-50 shadow-sm'
                : 'border-gray-100 bg-white hover:border-gray-200'}
            \`}
          >
            <div className="grid grid-cols-[40px_1fr_50px_60px] gap-2 items-center">
              <span className="text-sm text-gray-600">{row.length}</span>
              <div className="flex flex-wrap gap-1">
                {row.pattern.split(' → ').map((abbr, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full text-xs text-white"
                    style={{ backgroundColor: LABEL_COLORS[abbr] || '#999' }}
                  >
                    {abbr}
                  </span>
                ))}
              </div>
              <span className="text-sm text-gray-600">{row.count}</span>
              <span className="text-sm text-gray-600">{row.avgScore.toFixed(3)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
\`\`\`

## 五、组件二：Interaction Tree（D3.js 渲染）

\`\`\`typescript
import * as d3 from 'd3';

// 节点大小函数（基于聚合计数）
function getNodeRadius(count: number): number {
  if (count >= 10) return 28;  // 大节点
  if (count >= 4) return 18;   // 中节点
  return 10;                   // 小节点
}

function InteractionTree({
  treeData,
  visibleNodes,
  highlightPath,
  onNodeClick,
  onLeafNodeClick
}: {
  treeData: TreeNode;
  visibleNodes: Set<string>;
  highlightPath: string[] | null;
  onNodeClick: (nodeId: string) => void;
  onLeafNodeClick: (pattern: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !treeData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = svgRef.current.parentElement;
    const width = container?.clientWidth || 1200;
    const height = container?.clientHeight || 800;
    const margin = { top: 40, right: 120, bottom: 40, left: 80 };

    // 创建主组用于缩放
    const mainGroup = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', \`translate(\${margin.left}, \${margin.top})\`);

    // 缩放功能
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        mainGroup.attr('transform', event.transform);
      });
    svg.call(zoom).on('dblclick.zoom', null);

    // 过滤树只显示可见节点
    function filterTree(node: TreeNode): TreeNode | null {
      if (!visibleNodes.has(node.id) && node.id !== 'root') return null;
      const filteredChildren = node.children
        .map(c => filterTree(c))
        .filter(Boolean) as TreeNode[];
      return { ...node, children: filteredChildren };
    }

    const filteredData = filterTree(treeData);
    if (!filteredData) return;

    // 树布局
    const treeLayout = d3.tree<TreeNode>()
      .nodeSize([50, 160])
      .separation((a, b) => 1.8);

    const root = d3.hierarchy(filteredData);
    treeLayout(root);

    // 计算边界并自动适应视图
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    root.each(d => {
      if (d.x < minY) minY = d.x;
      if (d.x > maxY) maxY = d.x;
      if (d.y < minX) minX = d.y;
      if (d.y > maxX) maxX = d.y;
    });

    const treeWidth = maxX - minX + 200;
    const treeHeight = maxY - minY + 80;
    const scaleX = (width - margin.left - margin.right) / treeWidth;
    const scaleY = (height - margin.top - margin.bottom) / treeHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    // 自动适应视图
    svg.call(zoom.transform, d3.zoomIdentity
      .translate(margin.left + (width - margin.left - margin.right - treeWidth * scale) / 2, margin.top)
      .scale(scale));

    // 绘制连线
    const linkGenerator = d3.linkHorizontal<any, any>()
      .x(d => d.y)
      .y(d => d.x);

    mainGroup.selectAll('.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('d', d => {
        const sourceRadius = getNodeRadius(d.source.data.count);
        const targetRadius = getNodeRadius(d.target.data.count);
        return linkGenerator({
          source: { x: d.source.x, y: d.source.y + sourceRadius },
          target: { x: d.target.x, y: d.target.y - targetRadius }
        });
      })
      .attr('fill', 'none')
      .attr('stroke', d => {
        if (highlightPath && highlightPath.includes(d.target.data.abbr)) {
          return '#FF8C00';
        }
        return '#B0A0C0';
      })
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6,4')
      .attr('opacity', d => {
        if (highlightPath && !highlightPath.includes(d.target.data.abbr)) {
          return 0.2;
        }
        return 0.7;
      });

    // 绘制节点
    const nodes = mainGroup.selectAll('.node')
      .data(root.descendants().filter(d => d.depth > 0))
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => \`translate(\${d.y}, \${d.x})\`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => onNodeClick(d.data.id));

    // 节点圆形
    nodes.append('circle')
      .attr('r', d => getNodeRadius(d.data.count))
      .attr('fill', d => LABEL_COLORS[d.data.abbr] || '#999')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', d => {
        if (highlightPath && !highlightPath.includes(d.data.abbr)) {
          return 0.3;
        }
        return 0.9;
      });

    // 节点标签
    nodes.append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', d => getNodeRadius(d.data.count) > 15 ? 10 : 8)
      .attr('font-weight', 500)
      .text(d => d.data.abbr);

    // 可展开节点显示 + 指示器
    const collapsibleNodes = nodes.filter(d => d.children && d.children.length > 0);
    collapsibleNodes.append('circle')
      .attr('r', 8)
      .attr('cx', 12)
      .attr('cy', -12)
      .attr('fill', '#4a90e2')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2);
    collapsibleNodes.append('text')
      .attr('dx', 12)
      .attr('dy', -8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', 14)
      .attr('font-weight', 'bold')
      .text('+');

    // 叶节点显示完整链
    const leafNodes = nodes.filter(d => !d.children || d.children.length === 0);
    leafNodes.append('text')
      .attr('x', d => getNodeRadius(d.data.count) + 8)
      .attr('dy', 4)
      .attr('fill', '#666')
      .attr('font-size', 9)
      .text(d => {
        const path: string[] = [];
        let node = d;
        while (node.parent) {
          path.unshift(node.data.abbr);
          node = node.parent;
        }
        return path.join(' → ');
      })
      .style('cursor', 'pointer')
      .on('click', (event, d) => event.stopPropagation());

    leafNodes.on('click', (event, d) => {
      const path: string[] = [];
      let node = d;
      while (node.parent) {
        path.unshift(node.data.abbr);
        node = node.parent;
      }
      onLeafNodeClick(path.join(' → '));
    });

  }, [treeData, visibleNodes, highlightPath, onNodeClick, onLeafNodeClick]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 h-full relative">
      <svg ref={svgRef} className="w-full h-full" />
      {/* 缩放控制按钮 */}
      <div className="absolute top-4 right-4 flex gap-1">
        <button onClick={() => svgRef.current && d3.select(svgRef.current).transition().call(zoom.scaleBy, 1.3)}
                className="w-8 h-8 bg-white border rounded shadow-sm hover:bg-gray-50">+</button>
        <button onClick={() => svgRef.current && d3.select(svgRef.current).transition().call(zoom.scaleBy, 1/1.3)}
                className="w-8 h-8 bg-white border rounded shadow-sm hover:bg-gray-50">−</button>
      </div>
    </div>
  );
}
\`\`\`

## 六、主组件整合

\`\`\`typescript
export function TeachTree() {
  const [rawData, setRawData] = useState<RawDataItem[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [displayPatterns, setDisplayPatterns] = useState<PatternResult[]>([]);

  // 加载数据
  useEffect(() => {
    fetch('/TeachTree.jsonl')
      .then(res => res.text())
      .then(text => {
        const lines = text.trim().split('\\n');
        const data: RawDataItem[] = lines.map(line => JSON.parse(line));
        setRawData(data);
      });
  }, []);

  const processedSeq = useMemo(() => preprocessData(rawData), [rawData]);
  const patterns = useMemo(() => minePatterns(processedSeq, rawData, 15, 2), [processedSeq, rawData]);

  // 构建树和初始化默认视图
  useEffect(() => {
    if (patterns.length > 0) {
      const tree = buildInteractionTree(patterns);
      setTreeData(tree);
      setVisibleNodes(getDefaultVisibleNodes(tree));
      const leafPatterns = extractRootToLeafPatterns(tree, patterns);
      setDisplayPatterns(leafPatterns);
    }
  }, [patterns]);

  const highlightPath = selectedPattern?.split(' → ') || null;

  // 选择模式时自动展开路径
  useEffect(() => {
    if (selectedPattern && treeData) {
      const patternNodes = selectedPattern.split(' → ');
      const newVisible = new Set(visibleNodes);
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

  // 节点点击处理（展开/折叠）
  const handleNodeClick = useCallback((nodeId: string) => {
    if (!treeData) return;
    const newVisible = new Set(visibleNodes);
    const node = findNodeById(treeData, nodeId);
    if (!node) return;

    const allChildrenVisible = node.children.every(c => newVisible.has(c.id));

    if (allChildrenVisible) {
      // 折叠
      function removeDescendants(n: TreeNode) {
        n.children.forEach(c => {
          newVisible.delete(c.id);
          removeDescendants(c);
        });
      }
      removeDescendants(node);
    } else {
      // 展开
      node.children.forEach(c => newVisible.add(c.id));
    }

    setVisibleNodes(newVisible);
  }, [treeData, visibleNodes]);

  // 叶节点点击处理（显示详情）
  const handleLeafNodeClick = useCallback((pattern: string) => {
    const details = extractPatternDetails(pattern, rawData);
    // 显示详情弹窗...
  }, [rawData]);

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] bg-gray-50">
      <div className="border-r border-gray-200 bg-white p-4 overflow-hidden shadow-sm flex-shrink-0 w-[340px]">
        <h2 className="font-semibold text-gray-800 text-lg mb-4">Pattern Mining</h2>
        <PatternMiningTable
          data={displayPatterns}
          selectedPattern={selectedPattern}
          onSelectPattern={setSelectedPattern}
        />
      </div>
      <div className="flex-1 p-4 lg:p-6 overflow-auto">
        <InteractionTree
          treeData={treeData}
          visibleNodes={visibleNodes}
          highlightPath={highlightPath}
          onNodeClick={handleNodeClick}
          onLeafNodeClick={handleLeafNodeClick}
        />
      </div>
    </div>
  );
}
\`\`\`

## 七、样式要点
1. **配色**：教师行为用暖色系（橙/黄），学生行为用冷色系（蓝），沉默用灰色
2. **节点大小**：聚合计数≥10为大节点(28px)，≥4为中节点(18px)，其余小节点(10px)
3. **连线**：虚线贝塞尔曲线，紫灰色 #B0A0C0
4. **交互**：
   - 点击表格行 → 高亮对应树路径，自动展开路径中所有节点
   - 点击树节点 → 展开/折叠子节点
   - 点击叶节点 → 显示模式详情
5. **长链支持**：挖掘 N=2~15 的所有模式，树可展示深达 15 层的长链
6. **缩放拖拽**：支持滚轮缩放 + 拖动平移
7. **默认显示**：只显示频次最高的 2 个根节点及其全部子树

---

技术要点：
1. 使用 D3.js 树形布局算法
2. N-gram 模式挖掘算法
3. 树节点过滤（只渲染可见节点）
4. 自动适应视图功能
5. 节点展开/折叠状态管理
6. 表格与树形可视化联动
`;

