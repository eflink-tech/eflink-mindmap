import { describe, expect, it } from 'vitest';
import type { ThemeConfig } from '../../types/mindmap';
import { addChild, addRelation, createDocument, toggleCollapse } from '../editor/nodeOps';
import { layoutDocument } from './engine';
import { buildFlowPaths, pointAtDistance, samplePathD } from './flow';

const theme: ThemeConfig = {
  name: 't',
  colors: { primary: '#000', branches: ['#f00', '#0f0'], background: '#fff' },
  node: { shape: 'rounded', padding: [14, 8], fontSize: 14, fontWeight: 'normal' },
  connector: { type: 'curve', width: 2 },
};

describe('samplePathD', () => {
  it('M/L/Q 混合路径：起终点正确，弧长不小于直线距离', () => {
    const f = samplePathD('M 0 0 L 10 0 Q 20 0 30 10');
    expect(f.pts[0]).toBe(0);
    expect(f.pts[1]).toBe(0);
    expect(f.pts[f.pts.length - 2]).toBe(30);
    expect(f.pts[f.pts.length - 1]).toBe(10);
    expect(f.length).toBeGreaterThanOrEqual(30);
    expect(f.length).toBeLessThan(45);
    expect(f.cum[0]).toBe(0);
  });

  it('C 三次贝塞尔：终点正确且长于弦长', () => {
    const f = samplePathD('M 0 0 C 0 40, 40 40, 40 0');
    expect(f.pts[f.pts.length - 2]).toBe(40);
    expect(f.pts[f.pts.length - 1]).toBe(0);
    expect(f.length).toBeGreaterThan(40);
    expect(f.length).toBeLessThan(90);
  });

  it('pointAtDistance 沿弧长取点并截断越界', () => {
    const f = samplePathD('M 0 0 L 10 0 L 10 10');
    expect(pointAtDistance(f, 5)).toEqual({ x: 5, y: 0 });
    expect(pointAtDistance(f, 15)).toEqual({ x: 10, y: 5 });
    expect(pointAtDistance(f, 999)).toEqual({ x: 10, y: 10 });
    expect(pointAtDistance(f, -1)).toEqual({ x: 0, y: 0 });
  });
});

describe('buildFlowPaths', () => {
  it('包含直达子级连线与相连联系线，方向均从选中节点出发', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, '一');
    doc = addChild(doc, doc.rootId, '二');
    const [a, b] = doc.nodes[doc.rootId].children;
    doc = addChild(doc, a, '孙');
    doc = addRelation(doc, a, b);
    const layout = layoutDocument(doc, theme, (t) => t.length * 10);

    // 选中根：2 条子级连线，无联系线
    const fromRoot = buildFlowPaths(doc, layout, doc.rootId, theme);
    expect(fromRoot.length).toBe(2);
    // 选中 a：1 条子级连线 + 1 条联系线，联系线起点落在 a 的边缘上
    const fromA = buildFlowPaths(doc, layout, a, theme);
    expect(fromA.length).toBe(2);
    const rel = fromA[1];
    const box = layout.positions[a];
    const dx = Math.abs(rel.pts[0] - box.x);
    const dy = Math.abs(rel.pts[1] - box.y);
    expect(dx).toBeLessThanOrEqual(box.width / 2 + 1);
    expect(dy).toBeLessThanOrEqual(box.height / 2 + 1);
    expect(dx === box.width / 2 || dy === box.height / 2).toBe(true);
  });

  it('折叠的子级与另一端不可见的联系线不参与流动', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, '一');
    const a = doc.nodes[doc.rootId].children[0];
    doc = addChild(doc, a, '孙');
    doc = addRelation(doc, doc.rootId, a);
    doc = toggleCollapse(doc, a);
    const layout = layoutDocument(doc, theme, (t) => t.length * 10);

    // a 被折叠：根的子级连线仍在（a 可见），但 a→孙 不存在；根→a 联系线仍可见
    const fromRoot = buildFlowPaths(doc, layout, doc.rootId, theme);
    expect(fromRoot.length).toBe(2);
    // 选中折叠的 a：子级不可见、联系线另一端为根可见 → 仅联系线 1 条
    const fromA = buildFlowPaths(doc, layout, a, theme);
    expect(fromA.length).toBe(1);
  });
});
