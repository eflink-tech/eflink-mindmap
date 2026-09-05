import { describe, expect, it } from 'vitest';
import type { MindMapDocument, ThemeConfig } from '../../../types/mindmap';
import { addChild, createDocument, toggleCollapse } from '../../editor/nodeOps';
import { applyLayoutPreset } from '../applyPreset';
import { H_GAP, V_GAP, layoutDocument } from '../engine';
import { LAYOUT_PRESETS } from '../presets';
import { measureAllNodes, type WidthFn } from '../measure';
import { makeCtx } from './shared';
import { layoutTimelineH, layoutTimelineV } from './timeline';

const widthOf: WidthFn = (text) => text.length * 10;

const theme: ThemeConfig = {
  name: 't',
  colors: { primary: '#000', branches: ['#f00', '#0f0'], background: '#fff' },
  node: { shape: 'rounded', padding: [14, 8], fontSize: 14, fontWeight: 'normal' },
  connector: { type: 'curve', width: 2 },
};

/** 三层：root → A/B → A1/A2/A3、B1 */
function threeLevelDoc(): MindMapDocument {
  let doc = createDocument();
  doc = addChild(doc, doc.rootId, 'A');
  doc = addChild(doc, doc.rootId, 'B');
  const [a, b] = doc.nodes[doc.rootId].children;
  doc = addChild(doc, a, 'A1');
  doc = addChild(doc, a, 'A2');
  doc = addChild(doc, a, 'A3');
  doc = addChild(doc, b, 'B1');
  return doc;
}

function run(doc: MindMapDocument, layout: 'h' | 'v') {
  const sizes = measureAllNodes(doc, theme, widthOf);
  const ctx = makeCtx(doc, sizes, theme, H_GAP, V_GAP);
  const rootSize = sizes[doc.rootId];
  ctx.positions[doc.rootId] = {
    x: 0,
    y: 0,
    width: rootSize.width,
    height: rootSize.height,
  };
  if (layout === 'h') layoutTimelineH(ctx);
  else layoutTimelineV(ctx);
  return ctx;
}

describe('layoutTimelineH', () => {
  it('一级沿 +x，y 与根对齐', () => {
    const doc = threeLevelDoc();
    const { positions } = run(doc, 'h');
    const [a, b] = doc.nodes[doc.rootId].children;
    expect(positions[a].x).toBeGreaterThan(positions[doc.rootId].x);
    expect(positions[b].x).toBeGreaterThan(positions[a].x);
    expect(positions[a].y).toBeCloseTo(positions[doc.rootId].y, 5);
    expect(positions[b].y).toBeCloseTo(positions[doc.rootId].y, 5);
  });

  it('子女偶上奇下（A1/A3 上，A2 下）', () => {
    const doc = threeLevelDoc();
    const { positions } = run(doc, 'h');
    const a = doc.nodes[doc.rootId].children[0];
    const [a1, a2, a3] = doc.nodes[a].children;
    expect(positions[a1].y).toBeLessThan(positions[a].y);
    expect(positions[a3].y).toBeLessThan(positions[a].y);
    expect(positions[a2].y).toBeGreaterThan(positions[a].y);
    expect(positions[a3].y).toBeLessThan(positions[a1].y);
  });

  it('子女向上连线 dir 为 up，向下为 down', () => {
    const doc = threeLevelDoc();
    const { connectors } = run(doc, 'h');
    const a = doc.nodes[doc.rootId].children[0];
    const [a1, a2, a3] = doc.nodes[a].children;
    expect(connectors.find((c) => c.from === a && c.to === a1)?.dir).toBe('up');
    expect(connectors.find((c) => c.from === a && c.to === a2)?.dir).toBe('down');
    expect(connectors.find((c) => c.from === a && c.to === a3)?.dir).toBe('up');
  });

  it('深层向上子节点仍带 dir=up', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    const a = doc.nodes[doc.rootId].children[0];
    doc = addChild(doc, a, 'A1');
    const a1 = doc.nodes[a].children[0];
    doc = addChild(doc, a1, 'A1a');
    const a1a = doc.nodes[a1].children[0];
    const { connectors, positions } = run(doc, 'h');
    expect(positions[a1a].y).toBeLessThan(positions[a1].y);
    expect(connectors.find((c) => c.from === a1 && c.to === a1a)?.dir).toBe('up');
  });

  it('根到一级连线 dir 为 right', () => {
    const doc = threeLevelDoc();
    const { connectors } = run(doc, 'h');
    const kids = doc.nodes[doc.rootId].children;
    const rootConns = connectors.filter((c) => c.from === doc.rootId);
    expect(rootConns).toHaveLength(kids.length);
    expect(rootConns.every((c) => c.dir === 'right')).toBe(true);
  });

  it('折叠后子女不参与布局', () => {
    let doc = threeLevelDoc();
    const a = doc.nodes[doc.rootId].children[0];
    const a1 = doc.nodes[a].children[0];
    doc = toggleCollapse(doc, a);
    const { positions } = run(doc, 'h');
    expect(positions[a]).toBeDefined();
    expect(positions[a1]).toBeUndefined();
  });
});

describe('layoutTimelineV', () => {
  it('一级沿 +y，x 与根对齐', () => {
    const doc = threeLevelDoc();
    const { positions } = run(doc, 'v');
    const [a, b] = doc.nodes[doc.rootId].children;
    expect(positions[a].y).toBeGreaterThan(positions[doc.rootId].y);
    expect(positions[b].y).toBeGreaterThan(positions[a].y);
    expect(positions[a].x).toBeCloseTo(positions[doc.rootId].x, 5);
    expect(positions[b].x).toBeCloseTo(positions[doc.rootId].x, 5);
  });

  it('子女偶左奇右（A1/A3 左，A2 右）', () => {
    const doc = threeLevelDoc();
    const { positions } = run(doc, 'v');
    const a = doc.nodes[doc.rootId].children[0];
    const [a1, a2, a3] = doc.nodes[a].children;
    expect(positions[a1].x).toBeLessThan(positions[a].x);
    expect(positions[a3].x).toBeLessThan(positions[a].x);
    expect(positions[a2].x).toBeGreaterThan(positions[a].x);
    expect(positions[a3].x).toBeLessThan(positions[a1].x);
  });

  it('根到一级连线 dir 为 down', () => {
    const doc = threeLevelDoc();
    const { connectors } = run(doc, 'v');
    const kids = doc.nodes[doc.rootId].children;
    const rootConns = connectors.filter((c) => c.from === doc.rootId);
    expect(rootConns).toHaveLength(kids.length);
    expect(rootConns.every((c) => c.dir === 'down')).toBe(true);
  });
});

describe('timeline 预设与分发', () => {
  it('timeline-* 预设均为 ready', () => {
    const items = LAYOUT_PRESETS.filter((p) => p.category === 'timeline');
    expect(items.length).toBe(6);
    expect(items.every((p) => p.ready)).toBe(true);
    expect(items.filter((p) => p.structure === 'timeline-h')).toHaveLength(4);
    expect(items.filter((p) => p.structure === 'timeline-v')).toHaveLength(2);
    const applied = applyLayoutPreset(createDocument(), 'timeline-h-rect');
    expect(applied.layout).toBe('timeline-h-rect');
  });

  it('timeline-h-rect 一级沿 +x（非 logic 竖排回退）', () => {
    const doc = { ...threeLevelDoc(), layout: 'timeline-h-rect' };
    const { positions } = layoutDocument(doc, theme, widthOf);
    const [a, b] = doc.nodes[doc.rootId].children;
    expect(positions[a].x).toBeGreaterThan(positions[doc.rootId].x);
    expect(positions[b].x).toBeGreaterThan(positions[a].x);
    expect(positions[a].y).toBeCloseTo(positions[doc.rootId].y, 5);
  });

  it('timeline-v-alt 一级沿 +y（非 logic 右排回退）', () => {
    const doc = { ...threeLevelDoc(), layout: 'timeline-v-alt' };
    const { positions } = layoutDocument(doc, theme, widthOf);
    const [a, b] = doc.nodes[doc.rootId].children;
    expect(positions[a].y).toBeGreaterThan(positions[doc.rootId].y);
    expect(positions[b].y).toBeGreaterThan(positions[a].y);
    expect(positions[a].x).toBeCloseTo(positions[doc.rootId].x, 5);
  });
});
