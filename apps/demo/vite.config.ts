import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// monorepo 内直接引用组件库源码：demo 启动/构建无需先构建 packages/mindmap
const mindmapSrc = fileURLToPath(new URL('../../packages/mindmap/src/', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@eflink-tech\/mindmap\/styles\.css$/, replacement: `${mindmapSrc}styles.css` },
      { find: /^@eflink-tech\/mindmap$/, replacement: `${mindmapSrc}index.ts` },
    ],
  },
});
