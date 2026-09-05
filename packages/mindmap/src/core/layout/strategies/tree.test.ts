import { describe, expect, it } from 'vitest';
import type { MindMapDocument, ThemeConfig } from '../../../types/mindmap';
import { addChild, createDocument } from '../../editor/nodeOps';
import { H_GAP, V_GAP } from '../engine';
import { measureAllNodes, type WidthFn } from '../measure';
import { makeCtx } from './shared';
import { layoutTreeRight } from './tree';

const widthOf: WidthFn = (text) => text.length * 10;

const theme: ThemeConfig = {
  name: 't',
  colors: { primary: '#000', branches: ['#f00', '#0f0'], background: '#fff' },
  node: { shape: 'rounded', padding: [14, 8], fontSize: 14, fontWeight: 'normal' },
  connector: { type: 'curve', width: 2 },
};

/** 三层：root → A/B → A1/A2、B1（同级等宽文字，便于 y 序断言） */
function threeLevelDoc(): MindMapDocument {
  let doc = createDocument();
  doc = addChild(doc, doc.rootId, 'A');
  doc = addChild(doc, doc.rootId, 'B');
  const [a, b] = doc.nodes[doc.rootId].children;
  doc = addChild(doc, a, 'A1');
  doc = addChild(doc, a, 'A2');
  doc = addChild(doc, b, 'B1');
  return doc;
}

function runTree(doc: MindMapDocument) {
  const sizes = measureAllNodes(doc, theme, widthOf);
  const ctx = makeCtx(doc, sizes, theme, H_GAP, V_GAP);
  const rootSize = sizes[doc.rootId];
  ctx.positions[doc.rootId] = {
    x: 0,
    y: 0,
    width: rootSize.width,
    height: rootSize.height,
  };
  layoutTreeRight(ctx);
  return ctx;
}

describe('layoutTreeRight', () => {
  it('三层树：每个非根节点 x > parent.x', () => {
    const doc = threeLevelDoc();
    const { positions } = runTree(doc);
    for (const node of Object.values(doc.nodes)) {
      if (node.parentId === null) continue;
      expect(positions[node.id]).toBeDefined();
      expect(positions[node.parentId]).toBeDefined();
      expect(positions[node.id].x).toBeGreaterThan(positions[node.parentId].x);
    }
  });

  it('同父孩子的 y 序与 children 数组一致', () => {
    const doc = threeLevelDoc();
    const { positions } = runTree(doc);
    for (const node of Object.values(doc.nodes)) {
      const kids = node.children;
      for (let i = 1; i < kids.length; i++) {
        expect(positions[kids[i]].y).toBeGreaterThan(positions[kids[i - 1]].y);
      }
    }
  });

  it('父节点 y 对齐子树中心', () => {
    const doc = threeLevelDoc();
    const { positions } = runTree(doc);
    const a = doc.nodes[doc.rootId].children[0];
    const [a1, a2] = doc.nodes[a].children;
    expect(positions[a].y).toBeGreaterThan(positions[a1].y);
    expect(positions[a].y).toBeLessThan(positions[a2].y);
    expect(positions[a].y).toBeCloseTo((positions[a1].y + positions[a2].y) / 2, 5);
  });

  it('连线 dir 均为 right（可供 elbow 渲染）', () => {
    const doc = threeLevelDoc();
    const { connectors } = runTree(doc);
    expect(connectors.length).toBeGreaterThan(0);
    expect(connectors.every((c) => c.dir === 'right')).toBe(true);
  });
});
