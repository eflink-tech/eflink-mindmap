import { describe, expect, it } from 'vitest';
import type { MindMapDocument, ThemeConfig } from '../../../types/mindmap';
import { addChild, createDocument, toggleCollapse } from '../../editor/nodeOps';
import { applyLayoutPreset } from '../applyPreset';
import { H_GAP, V_GAP, layoutDocument } from '../engine';
import { LAYOUT_PRESETS } from '../presets';
import { measureAllNodes, type WidthFn } from '../measure';
import { makeCtx } from './shared';
import { layoutFishboneRight } from './fishbone';

const widthOf: WidthFn = (text) => text.length * 10;

const theme: ThemeConfig = {
  name: 't',
  colors: { primary: '#000', branches: ['#f00', '#0f0'], background: '#fff' },
  node: { shape: 'rounded', padding: [14, 8], fontSize: 14, fontWeight: 'normal' },
  connector: { type: 'curve', width: 2 },
};

/** 三层：root → A/B/C → A1/A2、B1 */
function threeLevelDoc(): MindMapDocument {
  let doc = createDocument();
  doc = addChild(doc, doc.rootId, 'A');
  doc = addChild(doc, doc.rootId, 'B');
  doc = addChild(doc, doc.rootId, 'C');
  const [a, b] = doc.nodes[doc.rootId].children;
  doc = addChild(doc, a, 'A1');
  doc = addChild(doc, a, 'A2');
  doc = addChild(doc, b, 'B1');
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
  layoutFishboneRight(ctx);
  return ctx;
}

describe('layoutFishboneRight', () => {
  it('主脊向右：一级 x 递增且均在根右侧', () => {
    const doc = threeLevelDoc();
    const { positions } = run(doc);
    const [a, b, c] = doc.nodes[doc.rootId].children;
    expect(positions[a].x).toBeGreaterThan(positions[doc.rootId].x);
    expect(positions[b].x).toBeGreaterThan(positions[a].x);
    expect(positions[c].x).toBeGreaterThan(positions[b].x);
  });

  it('一级交替上下斜骨（偶上奇下）', () => {
    const doc = threeLevelDoc();
    const { positions } = run(doc);
    const [a, b, c] = doc.nodes[doc.rootId].children;
    const spineY = positions[doc.rootId].y;
    expect(positions[a].y).toBeLessThan(spineY);
    expect(positions[b].y).toBeGreaterThan(spineY);
    expect(positions[c].y).toBeLessThan(spineY);
  });

  it('二级沿骨向外：上骨继续向上向右，下骨继续向下向右', () => {
    const doc = threeLevelDoc();
    const { positions } = run(doc);
    const [a, b] = doc.nodes[doc.rootId].children;
    const [a1, a2] = doc.nodes[a].children;
    const [b1] = doc.nodes[b].children;
    expect(positions[a1].x).toBeGreaterThan(positions[a].x);
    expect(positions[a1].y).toBeLessThan(positions[a].y);
    expect(positions[a2].x).toBeGreaterThan(positions[a1].x);
    expect(positions[a2].y).toBeLessThan(positions[a1].y);
    expect(positions[b1].x).toBeGreaterThan(positions[b].x);
    expect(positions[b1].y).toBeGreaterThan(positions[b].y);
  });

  it('根到一级连线为斜骨（折线无曲线）且 dir 为 right', () => {
    const doc = threeLevelDoc();
    const { connectors } = run(doc);
    const kids = doc.nodes[doc.rootId].children;
    const rootConns = connectors.filter((c) => c.from === doc.rootId);
    expect(rootConns).toHaveLength(kids.length);
    expect(rootConns.every((c) => c.dir === 'right')).toBe(true);
    expect(rootConns.every((c) => c.d.includes('L ') && !c.d.includes('C '))).toBe(true);
  });

  it('折叠后子女不参与布局', () => {
    let doc = threeLevelDoc();
    const a = doc.nodes[doc.rootId].children[0];
    const a1 = doc.nodes[a].children[0];
    doc = toggleCollapse(doc, a);
    const { positions } = run(doc);
    expect(positions[a]).toBeDefined();
    expect(positions[a1]).toBeUndefined();
  });
});

describe('fishbone 预设与分发', () => {
  it('fishbone-* 预设均为 ready', () => {
    const items = LAYOUT_PRESETS.filter((p) => p.category === 'fishbone');
    expect(items.length).toBe(3);
    expect(items.every((p) => p.ready)).toBe(true);
    expect(items.every((p) => p.structure === 'fishbone-right')).toBe(true);
    const applied = applyLayoutPreset(createDocument(), 'fishbone-1');
    expect(applied.layout).toBe('fishbone-1');
  });

  it('fishbone-1 一级交替上下（非 logic 右排回退）', () => {
    const doc = { ...threeLevelDoc(), layout: 'fishbone-1' };
    const { positions } = layoutDocument(doc, theme, widthOf);
    const [a, b, c] = doc.nodes[doc.rootId].children;
    expect(positions[a].x).toBeGreaterThan(positions[doc.rootId].x);
    expect(positions[b].x).toBeGreaterThan(positions[a].x);
    expect(positions[a].y).toBeLessThan(positions[doc.rootId].y);
    expect(positions[b].y).toBeGreaterThan(positions[doc.rootId].y);
    expect(positions[c].y).toBeLessThan(positions[doc.rootId].y);
  });
});
