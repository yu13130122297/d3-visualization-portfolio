import { useState, useMemo, useRef, useEffect } from 'react';
import type { TableRow } from './types';
import { LABEL_COLORS } from './constants';

type SortField = 'length' | 'count' | 'avgScore';
type SortOrder = 'asc' | 'desc';

export function PatternMiningTable({
    data,
    selectedPattern,
    onSelectPattern,
}: {
    data: TableRow[];
    selectedPattern: string | null;
    onSelectPattern: (pattern: string) => void;
}) {
    const [sortField, setSortField] = useState<SortField>('length');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [containerWidth, setContainerWidth] = useState(340);
    const itemsPerPage = 5;
    const containerRef = useRef<HTMLDivElement>(null);

    // 监听容器宽度变化
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // 根据容器宽度决定显示哪些列
    const showLength = containerWidth >= 200;
    const showCount = containerWidth >= 160;
    const showAvgScore = containerWidth >= 260;

    // 动态调整标签样式
    const getTagClass = () => {
        if (containerWidth < 280) {
            return 'px-1 py-0.5 text-[10px] rounded';
        } else if (containerWidth < 350) {
            return 'px-1.5 py-0.5 text-xs rounded';
        }
        return 'px-2 py-0.5 text-xs rounded-full';
    };

    const showSequenceNumber = containerWidth >= 350;

    // 排序数据
    const sortedData = useMemo(() => {
        const sorted = [...data].sort((a, b) => {
            let aVal: number, bVal: number;

            if (sortField === 'length') {
                aVal = a.length;
                bVal = b.length;
            } else if (sortField === 'count') {
                aVal = a.count;
                bVal = b.count;
            } else {
                aVal = a.avgScore;
                bVal = b.avgScore;
            }

            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });
        return sorted;
    }, [data, sortField, sortOrder]);

    // 分页数据
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedData, currentPage]);

    // 排序切换
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
        setCurrentPage(1); // 排序后回到第一页
    };

    // 分页控制
    const goToFirstPage = () => setCurrentPage(1);
    const goToLastPage = () => setCurrentPage(totalPages);
    const goToPrevPage = () => setCurrentPage(Math.max(1, currentPage - 1));
    const goToNextPage = () => setCurrentPage(Math.min(totalPages, currentPage + 1));

    // 排序图标
    const SortIcon = ({ field }: { field: SortField }) => {
        const isActive = sortField === field;
        return (
            <span className="inline-flex flex-col ml-0.5" style={{ fontSize: '10px', lineHeight: '6px', gap: '2px' }}>
                <span className={isActive && sortOrder === 'asc' ? 'text-orange-500' : 'text-gray-300'}>▲</span>
                <span className={isActive && sortOrder === 'desc' ? 'text-orange-500' : 'text-gray-300'}>▼</span>
            </span>
        );
    };

    return (
        <div ref={containerRef} className={`flex flex-col h-full ${containerWidth < 280 ? 'space-y-2' : 'space-y-3'}`}>
            {/* 表头 - 可点击排序 */}
            <div className={`flex items-center ${containerWidth < 280 ? 'gap-1' : 'gap-2'} text-gray-500 font-medium px-2 flex-shrink-0 ${containerWidth < 300 ? 'text-[10px]' : 'text-xs'}`}>
                {showLength && (
                    <button
                        onClick={() => handleSort('length')}
                        className="flex items-center gap-1 hover:text-orange-600 transition-colors cursor-pointer flex-shrink-0"
                    >
                        <span className={containerWidth < 300 ? 'w-5' : ''}>Len</span>
                        <SortIcon field="length" />
                    </button>
                )}
                <span className="flex-1 min-w-0 truncate">Pattern</span>
                {showCount && (
                    <button
                        onClick={() => handleSort('count')}
                        className="flex items-center gap-1 hover:text-orange-600 transition-colors cursor-pointer flex-shrink-0"
                    >
                        <span className={containerWidth < 300 ? 'w-6 text-center' : ''}>Count</span>
                        <SortIcon field="count" />
                    </button>
                )}
                {showAvgScore && (
                    <button
                        onClick={() => handleSort('avgScore')}
                        className="flex items-center gap-1 hover:text-orange-600 transition-colors cursor-pointer flex-shrink-0"
                    >
                        <span className={containerWidth < 300 ? 'w-6 text-center' : ''}>Avg</span>
                        <SortIcon field="avgScore" />
                    </button>
                )}
            </div>

            {/* 数据列表 */}
            <div className={`${containerWidth < 280 ? 'space-y-1' : 'space-y-2'} flex-1 overflow-y-auto pr-1 min-h-0`}>
                {paginatedData.map((row, idx) => (
                    <div
                        key={idx}
                        onClick={() => onSelectPattern(row.pattern)}
                        className={`
                            ${containerWidth < 280 ? 'p-1.5' : 'p-2'} rounded-xl border cursor-pointer transition-all
                            ${selectedPattern === row.pattern
                                ? 'border-orange-400 bg-orange-50 shadow-sm'
                                : 'border-gray-100 bg-white hover:border-gray-200'}
                        `}
                    >
                        <div className={`flex items-center ${containerWidth < 280 ? 'gap-1' : 'gap-2'} min-w-0`}>
                            {showLength && (
                                <span className={`text-xs text-gray-600 flex-shrink-0 ${containerWidth < 300 ? 'w-5 text-center' : ''}`}>
                                    {row.length}
                                </span>
                            )}
                            <div className={`flex items-center flex-wrap gap-0.5 flex-1 min-w-0`}>
                                {row.pattern.split(' → ').map((abbr, i) => (
                                    <span
                                        key={i}
                                        className={`${getTagClass()} text-white font-medium flex-shrink-0`}
                                        style={{ backgroundColor: LABEL_COLORS[abbr] || '#999' }}
                                    >
                                        {showSequenceNumber ? `${i + 1}.${abbr}` : abbr}
                                    </span>
                                ))}
                            </div>
                            {showCount && (
                                <span className={`text-xs text-gray-600 flex-shrink-0 ${containerWidth < 300 ? 'w-6 text-center' : ''}`}>
                                    {row.count}
                                </span>
                            )}
                            {showAvgScore && (
                                <span className={`text-xs text-gray-600 flex-shrink-0 ${containerWidth < 300 ? 'w-6 text-center' : ''}`}>
                                    {row.avgScore.toFixed(3)}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
                {/* 分页信息和控制 - 跟随在最后一条数据后 */}
                <div className={`${containerWidth < 280 ? 'space-y-1' : 'space-y-2'} pt-1`}>
                    <div className="text-center text-[10px] text-gray-500 truncate px-1">
                        {containerWidth < 300
                            ? `${currentPage}/${totalPages}`
                            : `Page ${currentPage} of ${totalPages} (${sortedData.length})`
                        }
                    </div>
                    <div className="flex justify-center gap-1 text-xs">
                        <button
                            onClick={goToFirstPage}
                            disabled={currentPage === 1}
                            className={`px-2 py-1 transition-colors ${currentPage === 1
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-600 hover:text-gray-800'
                                }`}
                            title="First"
                        >
                            |&lt;
                        </button>
                        <button
                            onClick={goToPrevPage}
                            disabled={currentPage === 1}
                            className={`px-2 py-1 transition-colors ${currentPage === 1
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-600 hover:text-gray-800'
                                }`}
                            title="Previous"
                        >
                            &lt;
                        </button>
                        <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                            className={`px-2 py-1 transition-colors ${currentPage === totalPages
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-600 hover:text-gray-800'
                                }`}
                            title="Next"
                        >
                            &gt;
                        </button>
                        <button
                            onClick={goToLastPage}
                            disabled={currentPage === totalPages}
                            className={`px-2 py-1 transition-colors ${currentPage === totalPages
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-600 hover:text-gray-800'
                                }`}
                            title="Last"
                        >
                            &gt;|
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
