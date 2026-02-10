"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { TreeNode } from './types';
import { LABEL_COLORS } from './constants';
import { getNodeRadius, getLinkWidth, getLinkDashArray, findNodeById } from './utils';

export function InteractionTree({
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
    const containerRef = useRef<HTMLDivElement>(null);
    const fitToViewRef = useRef<(() => void) | null>(null);
    const [d3, setD3] = useState<any>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

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
        const padding = 40;

        // 如果没有渲染的节点，返回默认缩放
        const nodes = svg.selectAll('.node');
        if (nodes.empty()) return;

        // 获取图表内容的边界
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
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

        // 计算左上角对齐的平移
        const translateX = padding - minX * scale;
        const translateY = padding - minY * scale;

        // 应用变换
        const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
        svg.transition().duration(500).call(zoomRef.current.transform, transform);
    }, [treeData, d3]);

    // 保持 fitToView 引用最新
    useEffect(() => {
        fitToViewRef.current = () => fitToView();
    }, [fitToView]);

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
        const treeLayout = d3.tree()
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
            const pie = d3.pie().value((d: any) => d.percentage).sort(null);
            const arc = d3.arc()
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
            if (fitToViewRef.current) {
                fitToViewRef.current();
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []); // 不依赖任何外部函数

    // 监听容器尺寸变化（拖拽调整宽度时触发）
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setContainerSize({ width, height });
                // 容器尺寸变化后重新适配视图
                if (fitToViewRef.current) {
                    setTimeout(() => fitToViewRef.current!(), 50);
                }
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []); // 不依赖任何外部函数

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
        <div ref={containerRef} className="bg-white rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden flex flex-col min-h-[300px] lg:h-full">
            {/* 缩放控制按钮 */}
            <div className="absolute top-3 right-4 flex gap-2 z-10 flex-shrink-0">
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

            <div className="absolute top-4 left-4 text-xs text-gray-400 z-10 bg-white/80 px-2 py-1 rounded flex-shrink-0">
                滚轮缩放 · 拖拽平移 · 点击节点折叠
            </div>

            <svg ref={svgRef} className="w-full flex-1 min-h-[250px]" />
        </div>
    );
}
