import { describe, expect, it } from 'vitest';
import type { MindMapDocument, ThemeConfig } from '../../../types/mindmap';
import { addChild, createDocument, toggleCollapse } from '../../editor/nodeOps';
import { applyLayoutPreset } from '../applyPreset';
import { H_GAP, V_GAP, layoutDocument } from '../engine';
import { LAYOUT_PRESETS } from '../presets';
import { measureAllNodes, type WidthFn } from '../measure';
import { makeCtx } from './shared';
import { layoutMatrix2x2 } from './matrix';

const widthOf: WidthFn = (text) => text.length * 10;

const theme: ThemeConfig = {
  name: 't',
  colors: { primary: '#000', branches: ['#f00', '#0f0'], background: '#fff' },
  node: { shape: 'rounded', padding: [14, 8], fontSize: 14, fontWeight: 'normal' },
  connector: { type: 'curve', width: 2 },
};

/** 四象限 + 溢出：root → A/B/C/D/E；A 有 A1/A2（logic-right 夹具） */
function matrixDoc(): MindMapDocument {
  let doc = createDocument();
  doc = addChild(doc, doc.rootId, 'A');
  doc = addChild(doc, doc.rootId, 'B');
  doc = addChild(doc, doc.rootId, 'C');
  doc = addChild(doc, doc.rootId, 'D');
  doc = addChild(doc, doc.rootId, 'E');
  const a = doc.nodes[doc.rootId].children[0];
  doc = addChild(doc, a, 'A1');
  doc = addChild(doc, a, 'A2');
  return doc;
}

function run(doc: MindMapDocument) {
  const sizes = measureAllNodes(doc, theme, widthOf);
  const ctx = makeCtx(doc, sizes, theme, H_GAP, V_GAP);
  const rootSize = sizes[doc.rootId];
  ctx.positions[doc.rootId] = {
    x: 0,
    y: 0,
    width: rootSize.width,
    height: rootSize.height,
  };
  layoutMatrix2x2(ctx);
  return ctx;
}

describe('layoutMatrix2x2', () => {
  it('根居中；前四个一级落入四象限（NW/NE/SW/SE）', () => {
    const doc = matrixDoc();
    const { positions } = run(doc);
    const root = positions[doc.rootId];
    expect(root.x).toBe(0);
    expect(root.y).toBe(0);
    const [a, b, c, d] = doc.nodes[doc.rootId].children;
    expect(positions[a].x).toBeLessThan(root.x);
    expect(positions[a].y).toBeLessThan(root.y);
    expect(positions[b].x).toBeGreaterThan(root.x);
    expect(positions[b].y).toBeLessThan(root.y);
    expect(positions[c].x).toBeLessThan(root.x);
    expect(positions[c].y).toBeGreaterThan(root.y);
    expect(positions[d].x).toBeGreaterThan(root.x);
    expect(positions[d].y).toBeGreaterThan(root.y);
  });

  it('第 5+ 一级落入第四象限向下堆叠', () => {
    const doc = matrixDoc();
    const { positions } = run(doc);
    const [, , , d, e] = doc.nodes[doc.rootId].children;
    expect(positions[e].x).toBeGreaterThan(positions[doc.rootId].x);
    expect(positions[e].y).toBeGreaterThan(positions[d].y);
    expect(Math.abs(positions[e].y - positions[d].y)).toBeGreaterThanOrEqual(
      (positions[e].height + positions[d].height) / 2,
    );
  });

  it('象限内子树按 logic-right：子女 x > 父 x，同级 y 序与 children 一致', () => {
    const doc = matrixDoc();
    const { positions } = run(doc);
    const a = doc.nodes[doc.rootId].children[0];
    const [a1, a2] = doc.nodes[a].children;
    expect(positions[a1].x).toBeGreaterThan(positions[a].x);
    expect(positions[a2].x).toBeGreaterThan(positions[a].x);
    expect(positions[a2].y).toBeGreaterThan(positions[a1].y);
  });

  it('根到左象限 dir 为 left，右象限为 right；子树内 dir 为 right', () => {
    const doc = matrixDoc();
    const { connectors } = run(doc);
    const [a, b, c, d, e] = doc.nodes[doc.rootId].children;
    const byTo = Object.fromEntries(connectors.map((cn) => [cn.to, cn]));
    expect(byTo[a].from).toBe(doc.rootId);
    expect(byTo[a].dir).toBe('left');
    expect(byTo[c].dir).toBe('left');
    expect(byTo[b].dir).toBe('right');
    expect(byTo[d].dir).toBe('right');
    expect(byTo[e].dir).toBe('right');
    const [a1] = doc.nodes[a].children;
    expect(byTo[a1].from).toBe(a);
    expect(byTo[a1].dir).toBe('right');
  });

  it('折叠后子女不参与布局', () => {
    let doc = matrixDoc();
    const a = doc.nodes[doc.rootId].children[0];
    const a1 = doc.nodes[a].children[0];
    doc = toggleCollapse(doc, a);
    const { positions } = run(doc);
    expect(positions[a]).toBeDefined();
    expect(positions[a1]).toBeUndefined();
  });
});

describe('matrix 预设与分发', () => {
  it('matrix-* 预设均为 ready', () => {
    const items = LAYOUT_PRESETS.filter((p) => p.category === 'matrix');
    expect(items.length).toBe(3);
    expect(items.every((p) => p.ready)).toBe(true);
    expect(items.every((p) => p.structure === 'matrix-2x2')).toBe(true);
    const applied = applyLayoutPreset(createDocument(), 'matrix-2x2-1');
    expect(applied.layout).toBe('matrix-2x2-1');
  });

  it('matrix-2x2-1 四个一级分属四象限（非 map-balanced 回退）', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    doc = addChild(doc, doc.rootId, 'B');
    doc = addChild(doc, doc.rootId, 'C');
    doc = addChild(doc, doc.rootId, 'D');
    doc = { ...doc, layout: 'matrix-2x2-1' };
    const { positions } = layoutDocument(doc, theme, widthOf);
    const [a, b, c, d] = doc.nodes[doc.rootId].children;
    const root = positions[doc.rootId];
    expect(positions[a].x).toBeLessThan(root.x);
    expect(positions[a].y).toBeLessThan(root.y);
    expect(positions[b].x).toBeGreaterThan(root.x);
    expect(positions[b].y).toBeLessThan(root.y);
    expect(positions[c].x).toBeLessThan(root.x);
    expect(positions[c].y).toBeGreaterThan(root.y);
    expect(positions[d].x).toBeGreaterThan(root.x);
    expect(positions[d].y).toBeGreaterThan(root.y);
  });
});
