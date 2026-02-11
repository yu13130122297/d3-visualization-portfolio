# 添加新图表指南

本文档说明如何在 D3 可视化作品集中添加新的图表可视化。

## 项目结构

```
components/works/        # 图表组件目录
  ├── ForceGraph/       # 力导向图
  │   └── index.tsx
  ├── StreamGraph/      # 流图
  │   └── index.tsx
  ├── TeachTree/        # 教学树图
  │   └── index.tsx
  └── index.ts          # 导出所有图表
public/                  # 静态资源目录
  ├── TeachTree.jsonl   # 教学树数据文件（与组件同名）
  └── ...               # 其他数据文件
registry/
  └── workRegistry.ts   # 图表注册中心
types/
  └── work.ts          # 类型定义
```

## 添加步骤

### 步骤 0: 准备数据文件（如需要）

如果你的图表需要外部数据文件，请将数据文件放在 `public/` 目录下，并**使用与组件文件夹相同的名称**。

**命名规范：**
- 组件目录：`components/works/MyChart/`
- 数据文件：`public/MyChart.jsonl` 或 `public/MyChart.json` 或 `public/MyChart.csv`

**示例：**
```
components/works/
  └── TeachTree/
      └── index.tsx

public/
  └── TeachTree.jsonl    # 与 TeachTree 组件同名
```

**支持的数据格式：**
- `.json` - JSON 格式
- `.jsonl` - JSON Lines 格式（每行一个 JSON 对象）
- `.csv` - CSV 格式
- `.tsv` - TSV 格式

**在组件中加载数据：**
```tsx
useEffect(() => {
  // 加载数据文件
  fetch('/MyChart.jsonl')
    .then(res => res.text())
    .then(text => {
      const data = text.trim().split('\n').map(line => JSON.parse(line));
      // 处理数据
    });
}, []);
```

### 步骤 1: 创建图表组件

在 `components/works/` 目录下创建新的图表文件夹和入口文件，例如 `MyChart/index.tsx`：

```tsx
"use client";

import { useEffect, useRef } from "react";

export function MyChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 你的图表绘制逻辑
    
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full"
      />
    </div>
  );
}

// 导出提示词（用于 AI 工具复现可视化）
export const myChartPrompt = `# 图表标题 - 可视化描述

请创建一个[图表类型]组件，用于[可视化目的]。

## 一、功能概述
- 功能描述 1
- 功能描述 2

## 二、数据结构

### 数据接口
\`\`\`typescript
interface DataItem {
  // 类型定义
}
\`\`\`

## 三、颜色配置
\`\`\`typescript
const colors = [
  "#3b82f6",
  "#22d3cee",
];
\`\`\`

## 四、数据处理

### 数据生成函数
\`\`\`typescript
function generateData() {
  // 数据生成逻辑
}
\`\`\`

## 五、核心绘制函数

### 渲染逻辑
\`\`\`typescript
function draw() {
  // 绘制代码
}
\`\`\`

## 六、交互事件

### 鼠标事件处理
\`\`\`typescript
const handleMouseMove = (e) => {
  // 事件处理
};
\`\`\`

## 七、使用 React Hooks

\`\`\`typescript
export function MyChart() {
  // 组件实现
}
\`\`\`

---
技术要点：
1. 技术要点 1
2. 技术要点 2
`;
```

**组件要求：**
- 使用 `"use client"` 指令（Next.js 客户端组件）
- 导出图表组件函数
- 导出提示词字符串（用于 AI 工具如 Cursor 复现可视化）
- 推荐使用 Canvas 或 SVG 进行渲染
- 支持响应式布局（自适应容器尺寸）
- **必须支持鼠标滚轮缩放和拖拽平移**
- **保持界面简洁，不要添加描述性文字**

### 步骤 2: 在 index.ts 中导出

编辑 `components/works/index.ts`，添加导出语句：

```tsx
export { ForceGraph, forceGraphPrompt } from "./ForceGraph";
export { StreamGraph, streamGraphPrompt } from "./StreamGraph";
export { MyChart, myChartPrompt } from "./MyChart";  // 新增
```

### 步骤 3: 注册到 workRegistry

编辑 `registry/workRegistry.ts`，在 `workRegistry` 数组中添加新条目：

```tsx
import { MyChart, myChartPrompt } from "@/components/works/MyChart";  // 导入

export const workRegistry: VisualizationWork[] = [
  // ...现有图表
  {
    id: "my-chart",                    // 唯一 ID（用于 URL 路由）
    title: "我的图表",                  // 主标题
    subtitle: "图表副标题说明",          // 副标题
    description: "这是一个简短的描述，会显示在首页卡片上。",
    fullDescription: "这是详细描述，会显示在详情页。可以包含更多技术细节和实现思路。",
    category: "interactive",            // 分类（见下方说明）
    tags: ["Canvas", "Animation", "Interactive"],  // 技术标签
    component: MyChart,                 // 组件引用
    prompt: myChartPrompt,               // 提示词（用于 AI 工具复现可视化）
    metadata: {
      dataSource: "数据来源说明",        // 可选
      tools: ["Canvas2D", "自定义算法"], // 可选
      createdAt: "2024-06-01",          // 可选
      inspiration: "灵感来源或参考资料", // 可选
    },
  },
];
```

### 步骤 4: 类别和标签

#### 可用类别 (category)

| 类别值 | 中文名称 | 英文名称 | 说明 |
|--------|---------|----------|------|
| `infographic` | 信息图表 | Infographic | 静态或简单动画的信息展示 |
| `interactive` | 交互可视化 | Interactive | 支持用户交互的图表 |
| `geo` | 地理可视化 | Geo / Map | 地图或地理数据相关 |
| `network` | 网络图 | Network | 网络关系、力导向图等 |
| `timeline` | 时间序列 | Timeline | 时间线、趋势图、流图等 |
| `experiment` | 实验性 | Experimental | 实验性质的创意可视化 |

#### 常用标签 (tags)

- 渲染技术：`Canvas`, `SVG`, `WebGL`
- 交互类型：`Interactive`, `Animation`, `Drag & Drop`
- 图表类型：`Bar Chart`, `Line Chart`, `Force Layout`, `Stream Graph`
- 数据类型：`Time Series`, `Network`, `Hierarchical`, `Geospatial`
- 技术特点：`Physics Simulation`, `Real-time`, `Responsive`

### 步骤 5: 测试

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 访问首页查看图表卡片：`http://localhost:3000`

3. 点击卡片进入详情页：`http://localhost:3000/work/my-chart`

4. 测试功能：
   - ✓ 图表正常渲染
   - ✓ 数据文件正确加载（如有外部数据）
   - ✓ 响应式布局正常（容器尺寸变化时图表自适应）
   - ✓ 鼠标滚轮缩放功能正常
   - ✓ 鼠标拖拽平移功能正常
   - ✓ 拖拽时鼠标指针变为 `grabbing`
   - ✓ 提示词显示正确
   - ✓ 分类筛选正常

## 最佳实践

### 性能优化
- 使用 `requestAnimationFrame` 进行动画
- 避免在渲染循环中创建新对象
- 使用 `useCallback` 和 `useMemo` 优化性能
- Canvas 图表考虑离屏渲染

### 图表自适应与交互要求

> **重要提示：画布比例切换功能已由父组件集成，图表组件无需实现比例切换器。**

所有图表组件必须遵循以下核心要求：

#### 1. 图表自适应

图表必须自适应容器尺寸，使用 `ResizeObserver` 监听容器变化：

```tsx
export function MyChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 根据容器尺寸绘制图表
  useEffect(() => {
    if (containerSize.width === 0) return;
    // 使用 containerSize.width 和 containerSize.height 绘制
  }, [containerSize]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      {/* 图表内容 */}
    </div>
  );
}
```

#### 2. 缩放与拖拽功能

图表必须支持鼠标滚轮缩放和拖拽平移：

```tsx
export function MyChart() {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 滚轮缩放
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(5, transform.scale * delta));
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  // 拖拽开始
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  // 拖拽移动
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  };

  // 拖拽结束
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="w-full h-full overflow-hidden bg-white">
      <svg
        width={containerSize.width}
        height={containerSize.height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* 图表内容 */}
        </g>
      </svg>
    </div>
  );
}
```

#### 3. 保持图表简洁

图表界面必须干净，**不要添加任何描述性文字**：

- ✅ 只显示图表本身（图例、标签等必要元素除外）
- ✅ 不要添加"算法说明"、"功能描述"等文字内容
- ✅ 不要添加标题、副标题等装饰性文字
- ✅ 不需要实现比例切换按钮（由父组件提供）

**参考示例：**
- `components/works/LagSequentialAnalysis/index.tsx` - 干净的图表实现示例
- `components/works/RingChart/index.tsx` - 拖拽和缩放实现示例

### 响应式设计
- 监听窗口大小变化
- 根据容器尺寸调整图表大小
- 移动端考虑触摸事件

### 代码组织
- 将数据生成逻辑分离到独立函数
- 将绘制逻辑分离到独立函数
- 使用 TypeScript 类型定义数据结构

### 大型组件模块化拆分

当组件变得复杂（超过 500 行）时，建议将其拆分为多个模块化文件，以提高可维护性和代码清晰度。

**推荐的文件结构：**

```
components/works/MyChart/
  ├── index.tsx              # 主组件入口，组合所有模块
  ├── types.ts               # TypeScript 接口和类型定义
  ├── constants.ts           # 常量配置（颜色、尺寸、映射表等）
  ├── utils.ts               # 纯函数工具集（数据处理、计算逻辑）
  ├── SubComponent1.tsx      # 子组件1（如详情弹窗）
  ├── SubComponent2.tsx      # 子组件2（如表格、图表等）
  └── SubComponent3.tsx      # 子组件3（如可视化核心组件）
```

**拆分原则：**

1. **types.ts - 类型定义**
   - 所有 TypeScript 接口和类型别名
   - 数据结构定义
   - 组件 Props 类型
   ```tsx
   // types.ts
   export interface DataItem {
     id: string;
     value: number;
     label: string;
   }
   
   export interface ChartConfig {
     width: number;
     height: number;
     margin: { top: number; right: number; bottom: number; left: number };
   }
   ```

2. **constants.ts - 常量配置**
   - 颜色方案、尺寸常量
   - 映射表、枚举值
   - 配置对象
   ```tsx
   // constants.ts
   export const COLORS = {
     primary: '#3b82f6',
     secondary: '#22d3ee',
     accent: '#f59e0b',
   };
   
   export const DEFAULT_CONFIG = {
     animationDuration: 300,
     nodeRadius: 5,
     linkWidth: 2,
   };
   
   export const LABEL_MAP = {
     'A': 'Category A',
     'B': 'Category B',
   };
   ```

3. **utils.ts - 工具函数**
   - 数据处理和转换函数
   - 计算和算法逻辑
   - 辅助函数（格式化、验证等）
   - 保持纯函数，无副作用
   ```tsx
   // utils.ts
   export function processData(rawData: RawData[]): ProcessedData[] {
     return rawData.map(item => ({
       ...item,
       computed: calculateValue(item),
     }));
   }
   
   export function calculateMetrics(data: DataItem[]): Metrics {
     // 复杂计算逻辑
   }
   
   export function formatTime(timestamp: number): string {
     // 时间格式化
   }
   ```

4. **子组件文件 - 独立功能模块**
   - 每个子组件一个文件
   - 单一职责原则
   - 独立的状态和逻辑
   ```tsx
   // PatternDetailModal.tsx
   export function PatternDetailModal({ data, isOpen, onClose }) {
     // 详情弹窗逻辑
   }
   
   // DataTable.tsx
   export function DataTable({ data, onSort, onFilter }) {
     // 表格组件逻辑
   }
   
   // Visualization.tsx
   export function Visualization({ data, config }) {
     // 核心可视化逻辑
   }
   ```

5. **index.tsx - 主组件**
   - 导入所有模块
   - 组合子组件
   - 管理全局状态
   - 处理组件间通信
   ```tsx
   // index.tsx
   import { DataItem, ChartConfig } from './types';
   import { COLORS, DEFAULT_CONFIG } from './constants';
   import { processData, calculateMetrics } from './utils';
   import { PatternDetailModal } from './PatternDetailModal';
   import { DataTable } from './DataTable';
   import { Visualization } from './Visualization';
   
   export function MyChart() {
     const [data, setData] = useState<DataItem[]>([]);
     const [config, setConfig] = useState<ChartConfig>(DEFAULT_CONFIG);
     
     const processedData = useMemo(() => processData(data), [data]);
     
     return (
       <div className="chart-container">
         <Visualization data={processedData} config={config} />
         <DataTable data={processedData} />
         <PatternDetailModal data={selectedItem} />
       </div>
     );
   }
   ```

**拆分的好处：**
- ✓ 提高代码可读性和可维护性
- ✓ 便于团队协作（不同人员修改不同文件）
- ✓ 减少代码冲突
- ✓ 便于单元测试
- ✓ 支持按需导入，优化打包体积
- ✓ 清晰的职责分离

**实例参考：**
- `components/works/TeachTree/` - 完整的模块化示例
  - 从 1400+ 行单文件重构为 7 个模块化文件
  - 清晰的类型定义、常量配置、工具函数分离
  - 3 个独立子组件：PatternDetailModal、PatternMiningTable、InteractionTree

### 提示词编写建议

提示词应该包含以下内容，方便 AI 工具（如 Cursor）复现可视化：

1. **标题和概述**：清晰描述可视化的类型和用途
2. **功能概述**：列出核心功能点
3. **数据结构**：定义所有接口和类型
4. **配置项**：颜色、尺寸等常量配置
5. **数据处理**：数据生成和处理的完整逻辑
6. **核心算法**：核心计算或渲染逻辑
7. **交互事件**：鼠标、键盘等事件处理
8. **组件实现**：完整的组件代码结构
9. **技术要点**：关键实现细节和注意事项

---

**格式建议**：使用 Markdown 格式，代码块用 `\`\`\`tsx` 或 `\`\`\`typescript` 标记，关键部分使用标题（##、###）进行分段。

## 示例参考

查看现有图表实现：
- **力导向图**: `components/works/ForceGraph/index.tsx`
  - Canvas 渲染
  - 物理模拟
  - 拖拽交互

- **流图**: `components/works/StreamGraph/index.tsx`
  - Canvas 渲染
  - 时间序列数据
  - 悬停交互

- **教学树图**: `components/works/TeachTree/index.tsx`
  - 外部数据加载（`public/TeachTree.jsonl`）
  - 层次化数据可视化
  - 数据文件与组件同名示例

- **教学阶段玫瑰图**: `components/works/RingChart/index.tsx`
  - SVG 渲染
  - 鼠标滚轮缩放和拖拽平移
  - 响应式布局

- **滞后序列分析热力图**: `components/works/LagSequentialAnalysis/index.tsx`
  - SVG 渲染
  - 鼠标滚轮缩放和拖拽平移
  - 干净的界面，无描述性文字
  - 自适应容器尺寸

## 常见问题

### Q: 如何调试 Canvas 图表？
A: 使用 Chrome DevTools 的 Performance 和 Canvas 选项卡，或添加 console.log 输出关键数据。

### Q: 如何处理大数据集？
A: 考虑数据抽样、虚拟化渲染、WebGL 加速等技术。

### Q: 如何添加动画？
A: 使用 `requestAnimationFrame` 创建动画循环，通过时间差计算插值。

### Q: 如何支持暗色模式？
A: 项目已集成 `next-themes`，使用 Tailwind 的暗色类或读取主题状态调整颜色。

### Q: 如何实现缩放和拖拽？
A: 参考上方"图表自适应与交互要求"部分的示例代码，使用 SVG 的 `transform` 属性实现平移和缩放，监听 `wheel` 和 `mousedown/mousemove/mouseup` 事件。

### Q: 需要实现比例切换按钮吗？
A: 不需要。画布比例切换功能已由父组件集成，图表组件只需自适应容器尺寸即可。

### Q: 图表可以添加说明文字吗？
A: 不建议。保持图表简洁，只显示可视化内容本身。必要的标签、图例除外。

## 相关文件

- [types/work.ts](types/work.ts) - 类型定义
- [components/ui/PromptViewer.tsx](components/ui/PromptViewer.tsx) - 提示词查看器组件
- [components/WorkCard.tsx](components/ui/WorkCard.tsx) - 作品卡片组件
- [components/WorkDetail.tsx](components/WorkDetail.tsx) - 详情页组件
- [components/HomeGallery.tsx](components/HomeGallery.tsx) - 首页画廊
- [app/work/[id]/page.tsx](app/work/[id]/page.tsx) - 详情页路由
