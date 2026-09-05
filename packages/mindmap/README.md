# @eflink-tech/mindmap

开箱即用的思维导图编辑器 React 组件（基于 [Konva](https://konvajs.org/)）。可独立运行，也可作为组件嵌入任意 React 应用。

## 安装

```bash
npm install @eflink-tech/mindmap
# react / react-dom >= 19 为 peer 依赖
```

## 使用

```tsx
import { MindMapEditor } from '@eflink-tech/mindmap';
import '@eflink-tech/mindmap/styles.css';

<div style={{ width: '100vw', height: '100vh' }}>
  <MindMapEditor />
</div>
```

组件自带完整编辑器 UI（工具栏、格式 / 标记面板、状态栏），挂载后自动恢复上次编辑的文档。导出 `useMindMapStore`（程序化操作导图）、`saveDocument / loadDocument / listDocuments`（IndexedDB 持久化辅助）与 `MindMapDocument` 等数据类型。

内置五种布局（思维导图 / 逻辑图 / 组织结构图 / 括号图 / 时间轴）、标记系统、配色方案、大纲视图与 `.efm` / PNG 导出。

> **Tailwind 说明**：组件库内部布局用到少量 Tailwind 工具类（已随 `styles.css` 提供回退样式）。若宿主使用 Tailwind v4 且希望得到与 demo 一致的布局，请在入口 CSS 中显式扫描组件包：
>
> ```css
> @import "tailwindcss";
> @source "../node_modules/@eflink-tech/mindmap";
> ```

完整文档（本地开发、目录结构）见仓库根 README：

https://github.com/eflink-tech/eflink-mindmap

## License

Apache-2.0
