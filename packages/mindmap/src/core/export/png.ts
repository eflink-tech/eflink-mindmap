// src/core/export/png.ts
// PNG 导出区域计算：内容包围盒经视口变换后加边距
import type { LayoutResult, ViewportState } from '../../types/mindmap';

export interface ExportRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function pngExportRegion(
  layout: LayoutResult,
  viewport: ViewportState,
  padding: number,
): ExportRegion {
  const b = layout.contentBounds;
  if (b.width === 0 || b.height === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const x = b.x * viewport.scale + viewport.x;
  const y = b.y * viewport.scale + viewport.y;
  return {
    x: x - padding,
    y: y - padding,
    width: b.width * viewport.scale + padding * 2,
    height: b.height * viewport.scale + padding * 2,
  };
}
