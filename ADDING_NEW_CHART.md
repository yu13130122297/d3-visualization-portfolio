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

// 导出代码示例（用于代码查看器）
export const myChartCode = {
  core: `// 核心绘制逻辑
function drawChart(ctx, data) {
  // 绘制代码
}`,
  
  data: `// 数据生成逻辑
function generateData() {
  return {
    // 数据结构
  };
}`,
  
  styles: `// 样式配置
const colors = ["#3b82f6", "#22d3ee"];
const fontSize = 12;`,
  
  full: `// 完整的组件代码
// 包含上述所有部分的完整实现`,
};
```

**组件要求：**
- 使用 `"use client"` 指令（Next.js 客户端组件）
- 导出图表组件函数
- 导出包含 4 个字段的代码对象：`core`、`data`、`styles`、`full`
- 推荐使用 Canvas 或 SVG 进行渲染
- 支持响应式布局

### 步骤 2: 在 index.ts 中导出

编辑 `components/works/index.ts`，添加导出语句：

```tsx
export { ForceGraph, forceGraphCode } from "./ForceGraph";
export { StreamGraph, streamGraphCode } from "./StreamGraph";
export { MyChart, myChartCode } from "./MyChart";  // 新增
```

### 步骤 3: 注册到 workRegistry

编辑 `registry/workRegistry.ts`，在 `workRegistry` 数组中添加新条目：

```tsx
import { MyChart, myChartCode } from "@/components/works/MyChart";  // 导入

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
    sourceCode: {
      core: myChartCode.core,
      data: myChartCode.data,
      styles: myChartCode.styles,
      full: myChartCode.full,
    },
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
   - ✓ 响应式布局正常
   - ✓ 交互功能正常
   - ✓ 代码查看器显示正确
   - ✓ 分类筛选正常

## 最佳实践

### 性能优化
- 使用 `requestAnimationFrame` 进行动画
- 避免在渲染循环中创建新对象
- 使用 `useCallback` 和 `useMemo` 优化性能
- Canvas 图表考虑离屏渲染

### 响应式设计
- 监听窗口大小变化
- 根据容器尺寸调整图表大小
- 移动端考虑触摸事件

### 代码组织
- 将数据生成逻辑分离到独立函数
- 将绘制逻辑分离到独立函数
- 使用 TypeScript 类型定义数据结构

### 代码示例
- `core`: 包含核心绘制/计算逻辑
- `data`: 包含数据生成/处理逻辑
- `styles`: 包含颜色、字体等样式配置
- `full`: 包含完整的可运行代码

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

## 常见问题

### Q: 如何调试 Canvas 图表？
A: 使用 Chrome DevTools 的 Performance 和 Canvas 选项卡，或添加 console.log 输出关键数据。

### Q: 如何处理大数据集？
A: 考虑数据抽样、虚拟化渲染、WebGL 加速等技术。

### Q: 如何添加动画？
A: 使用 `requestAnimationFrame` 创建动画循环，通过时间差计算插值。

### Q: 如何支持暗色模式？
A: 项目已集成 `next-themes`，使用 Tailwind 的暗色类或读取主题状态调整颜色。

## 相关文件

- [types/work.ts](types/work.ts) - 类型定义
- [components/WorkCard.tsx](components/ui/WorkCard.tsx) - 作品卡片组件
- [components/WorkDetail.tsx](components/WorkDetail.tsx) - 详情页组件
- [components/HomeGallery.tsx](components/HomeGallery.tsx) - 首页画廊
- [app/work/[id]/page.tsx](app/work/[id]/page.tsx) - 详情页路由
