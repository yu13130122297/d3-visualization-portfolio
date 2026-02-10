教学交互模式分析系统 - V0 Prompt
一、系统概述
创建一个教学交互模式分析系统，包含两个核心组件：Pattern Mining Table（模式挖掘表） 和 Interaction Tree（交互树）。左右布局，左侧表格，右侧树形可视化。

二、整体布局
tsx
<div className="flex h-screen bg-gray-50">
  {/* 左侧：Pattern Mining Table */}
  <div className="w-[320px] border-r bg-white p-4 overflow-auto">
    <PatternMiningTable />
  </div>
  
  {/* 右侧：Interaction Tree */}
  <div className="flex-1 p-4 overflow-auto">
    <InteractionTree />
  </div>
</div>
三、数据处理算法
1. 数据源格式（JSONL）
json
{"id": "T01_0000_0004", "label": "教师指令", "text": "老师：好，请坐。"}
{"id": "T01_0004_0007", "label": "教师讲授", "text": "老师：本章的知识框架..."}
2. 行为类型缩写映射
typescript
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
3. 数据预处理：合并连续相同行为
typescript
interface MergedItem {
  label: string;
  abbr: string;
  count: number;
}

function preprocessData(rawData: {label: string}[]): MergedItem[] {
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
4. 行为链模式挖掘（支持长链，N=2~15）
typescript
interface PatternResult {
  pattern: string;      // 如 "TQ → SS → TF"
  length: number;       // 链长度
  count: number;        // 出现次数
  avgScore?: number;    // 平均质量分（可选）
}

function minePatterns(sequence: MergedItem[], maxLength = 15, minCount = 2): PatternResult[] {
  const patterns = new Map<string, number>();
  const abbrSeq = sequence.map(s => s.abbr);
  
  // 提取所有N-gram（N从2到maxLength）
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
      avgScore: Math.random() * 0.5 + 0.5  // 示例分数
    }))
    .sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length;
      return b.count - a.count;
    });
}
5. 构建交互树数据结构
typescript
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
          id: `${current.id}-${abbr}-${i}`,
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
四、组件一：Pattern Mining Table
tsx
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
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <select className="px-3 py-1.5 border rounded-lg text-sm bg-white">
          <option>Select Pattern</option>
        </select>
      </div>
      
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
            className={`
              p-3 rounded-xl border cursor-pointer transition-all
              ${selectedPattern === row.pattern 
                ? 'border-orange-400 bg-orange-50 shadow-sm' 
                : 'border-gray-100 bg-white hover:border-gray-200'}
            `}
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
      
      {/* 分页 */}
      <div className="flex justify-center gap-2 mt-4 text-sm">
        <button className="px-3 py-1 text-gray-400">First</button>
        <button className="px-3 py-1 text-gray-400">Prev</button>
        <button className="px-3 py-1 text-gray-600">Next</button>
        <button className="px-3 py-1 text-gray-600">Last</button>
      </div>
    </div>
  );
}
五、组件二：Interaction Tree（D3.js渲染）
tsx
import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

// 节点大小函数（基于聚合计数）
function getNodeRadius(count: number): number {
  if (count >= 10) return 28;
  if (count >= 4) return 18;
  return 10;
}

// 节点颜色深浅（基于频次）
function getNodeColor(abbr: string, count: number): string {
  const baseColor = LABEL_COLORS[abbr] || '#999';
  // 高频深色，低频浅色
  const opacity = Math.min(0.4 + count * 0.06, 1);
  return baseColor;  // 可进一步实现透明度渐变
}

function InteractionTree({ 
  treeData, 
  highlightPath 
}: { 
  treeData: TreeNode; 
  highlightPath: string[] | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current || !treeData) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const width = 1200;
    const height = 800;
    const margin = { top: 40, right: 120, bottom: 40, left: 80 };
    
    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // 树布局 - 稀疏布局
    const treeLayout = d3.tree<TreeNode>()
      .nodeSize([50, 160])  // 垂直间距50, 水平间距160
      .separation((a, b) => 1.8);
    
    const root = d3.hierarchy(treeData);
    treeLayout(root);
    
    // 计算边界并居中
    let minY = Infinity, maxY = -Infinity;
    root.each(d => {
      if (d.x < minY) minY = d.x;
      if (d.x > maxY) maxY = d.x;
    });
    const offsetY = (height - margin.top - margin.bottom) / 2 - (minY + maxY) / 2;
    
    // 绘制连线 - 虚线贝塞尔曲线
    const linkGenerator = d3.linkHorizontal<any, any>()
      .x(d => d.y)
      .y(d => d.x + offsetY);
    
    g.selectAll('.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('d', d => {
        const sourceRadius = getNodeRadius(d.source.data.count);
        const targetRadius = getNodeRadius(d.target.data.count);
        // 从源节点边缘到目标节点边缘
        return linkGenerator({
          source: { x: d.source.x, y: d.source.y + sourceRadius },
          target: { x: d.target.x, y: d.target.y - targetRadius }
        });
      })
      .attr('fill', 'none')
      .attr('stroke', d => {
        // 高亮路径
        if (highlightPath && highlightPath.includes(d.target.data.abbr)) {
          return '#FF8C00';
        }
        return '#B0A0C0';
      })
      .attr('stroke-width', d => highlightPath ? 2 : 1.5)
      .attr('stroke-dasharray', '6,4')
      .attr('opacity', d => {
        if (highlightPath && !highlightPath.includes(d.target.data.abbr)) {
          return 0.2;
        }
        return 0.7;
      });
    
    // 绘制节点
    const nodes = g.selectAll('.node')
      .data(root.descendants().filter(d => d.depth > 0)) // 隐藏根节点
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y}, ${d.x + offsetY})`);
    
    // 节点圆形 - 大小和颜色基于count
    nodes.append('circle')
      .attr('r', d => getNodeRadius(d.data.count))
      .attr('fill', d => getNodeColor(d.data.abbr, d.data.count))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', d => {
        if (highlightPath && !highlightPath.includes(d.data.abbr)) {
          return 0.3;
        }
        return 0.9;
      })
      .style('cursor', 'pointer');
    
    // 节点标签
    nodes.append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', d => getNodeRadius(d.data.count) > 15 ? 10 : 8)
      .attr('font-weight', 500)
      .text(d => d.data.abbr);
    
    // 末端节点显示完整链
    nodes.filter(d => d.children === undefined || d.children.length === 0)
      .append('text')
      .attr('x', d => getNodeRadius(d.data.count) + 8)
      .attr('dy', 4)
      .attr('fill', '#666')
      .attr('font-size', 9)
      .text(d => {
        // 回溯获取完整路径
        const path: string[] = [];
        let node = d;
        while (node.parent) {
          path.unshift(node.data.abbr);
          node = node.parent;
        }
        return path.join(', ');
      });
      
  }, [treeData, highlightPath]);
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
六、主组件整合（含状态联动）
tsx
import { useState, useMemo } from 'react';
import { create } from 'zustand';

// Zustand状态管理
interface AppState {
  selectedPattern: string | null;
  setSelectedPattern: (pattern: string | null) => void;
}

const useStore = create<AppState>((set) => ({
  selectedPattern: null,
  setSelectedPattern: (pattern) => set({ selectedPattern: pattern }),
}));

// 主应用
export default function TeachingInteractionAnalyzer() {
  const { selectedPattern, setSelectedPattern } = useStore();
  
  // 示例数据（实际从JSONL加载）
  const rawData = useMemo(() => [
    { label: "教师指令" },
    { label: "教师讲授" },
    { label: "教师讲授" },
    { label: "教师提问" },
    { label: "学生发言" },
    { label: "教师反馈" },
    // ... 更多数据
  ], []);
  
  // 数据处理
  const processedSeq = useMemo(() => preprocessData(rawData), [rawData]);
  const patterns = useMemo(() => minePatterns(processedSeq, 15, 2), [processedSeq]);
  const treeData = useMemo(() => buildInteractionTree(patterns), [patterns]);
  
  // 高亮路径
  const highlightPath = selectedPattern?.split(' → ') || null;
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧表格 */}
      <div className="w-[340px] border-r bg-white p-4 overflow-auto shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Pattern Mining</h2>
        <PatternMiningTable 
          data={patterns}
          selectedPattern={selectedPattern}
          onSelectPattern={setSelectedPattern}
        />
      </div>
      
      {/* 右侧交互树 */}
      <div className="flex-1 p-6">
        <InteractionTree 
          treeData={treeData}
          highlightPath={highlightPath}
        />
      </div>
    </div>
  );
}
七、样式要点
1.
配色：教师行为用暖色系（橙/黄），学生行为用冷色系（蓝），沉默用灰色
2.
节点大小：聚合计数≥10为大节点(28px)，≥4为中节点(18px)，其余小节点(10px)
3.
连线：虚线贝塞尔曲线，紫灰色 #B0A0C0
4.
交互：点击表格行→高亮对应树路径，非相关节点淡化
5.
长链支持：挖掘N=2~15的所有模式，树可展示深达15层的长链

const useStore = create<AppState>((set, get) => ({
  selectedPattern: null,
  visibleNodes: new Set<string>(),
  
  setSelectedPattern: (pattern) => set({ selectedPattern: pattern }),
  
  setVisibleNodes: (nodes) => set({ visibleNodes: nodes }),
  
  // 初始化默认显示
  initDefaultView: (treeData: TreeNode) => {
    const defaultVisible = getDefaultVisibleNodes(treeData);
    set({ visibleNodes: defaultVisible });
  },
  // 点击节点展开/折叠
  toggleNode: (nodeId: string, treeData: TreeNode) => {
    const { visibleNodes } = get();
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
    
    set({ visibleNodes: newVisible });
  }
}));
核心改进总结：

1.
缩放拖动：d3.zoom() 支持滚轮缩放 + 拖动平移
2.
默认显示：只显示频次最高的2个根节点及其2层子树
3.
渐进式展开：
点击节点 "+" 展开其子节点
点击表格行自动展开对应完整路径
4.
视觉指示：未展开的节点显示 "+" 图标