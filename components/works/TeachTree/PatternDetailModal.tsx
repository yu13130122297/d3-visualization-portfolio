import type { PatternDetailItem } from './types';
import { LABEL_COLORS } from './constants';

// 模式详情弹窗组件
export function PatternDetailModal({
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
