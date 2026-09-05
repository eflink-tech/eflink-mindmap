import { describe, expect, it } from 'vitest';
import { pngExportRegion } from './png';
import type { LayoutResult, ViewportState } from '../../types/mindmap';

describe('pngExportRegion', () => {
  const layout: LayoutResult = {
    positions: {},
    connectors: [],
    contentBounds: { x: 100, y: 50, width: 400, height: 300 },
  };

  it('单位视口下按内容包围盒加边距', () => {
    const viewport: ViewportState = { x: 0, y: 0, scale: 1 };
    const r = pngExportRegion(layout, viewport, 40);
    expect(r).toEqual({ x: 60, y: 10, width: 480, height: 380 });
  });

  it('应用视口缩放与平移', () => {
    const viewport: ViewportState = { x: 10, y: 20, scale: 2 };
    const r = pngExportRegion(layout, viewport, 40);
    expect(r).toEqual({ x: 170, y: 80, width: 880, height: 680 });
  });

  it('空内容返回零区域', () => {
    const empty: LayoutResult = { positions: {}, connectors: [], contentBounds: { x: 0, y: 0, width: 0, height: 0 } };
    const r = pngExportRegion(empty, { x: 0, y: 0, scale: 1 }, 40);
    expect(r.width).toBe(0);
  });
});
