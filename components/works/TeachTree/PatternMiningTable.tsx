import { useState, useMemo } from 'react';
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
    const itemsPerPage = 5;

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
        <div className="space-y-3">
            {/* 表头 - 可点击排序 */}
            <div className="grid grid-cols-[40px_1fr_50px_60px] gap-2 text-xs text-gray-500 font-medium px-2">
                <button
                    onClick={() => handleSort('length')}
                    className="flex items-center gap-1 hover:text-orange-600 transition-colors cursor-pointer"
                >
                    Len <SortIcon field="length" />
                </button>
                <span>Pattern</span>
                <button
                    onClick={() => handleSort('count')}
                    className="flex items-center gap-1 hover:text-orange-600 transition-colors cursor-pointer"
                >
                    Count <SortIcon field="count" />
                </button>
                <button
                    onClick={() => handleSort('avgScore')}
                    className="flex items-center gap-1 hover:text-orange-600 transition-colors cursor-pointer"
                >
                    Avg <SortIcon field="avgScore" />
                </button>
            </div>

            {/* 数据列表 */}
            <div className="space-y-2 h-[calc(100vh-320px)] overflow-y-auto pr-1">
                {paginatedData.map((row, idx) => (
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

            {/* 分页信息和控制 */}
            <div className="space-y-2">
                <div className="text-center text-xs text-gray-500">
                    Page {currentPage} of {totalPages} ({sortedData.length} patterns)
                </div>
                <div className="flex justify-center gap-2 text-sm">
                    <button
                        onClick={goToFirstPage}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 transition-colors ${currentPage === 1
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        First
                    </button>
                    <button
                        onClick={goToPrevPage}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 transition-colors ${currentPage === 1
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        Prev
                    </button>
                    <button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1 transition-colors ${currentPage === totalPages
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        Next
                    </button>
                    <button
                        onClick={goToLastPage}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1 transition-colors ${currentPage === totalPages
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        Last
                    </button>
                </div>
            </div>
        </div>
    );
}
