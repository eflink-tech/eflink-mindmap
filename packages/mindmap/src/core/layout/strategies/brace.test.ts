import { describe, expect, it } from 'vitest';
import type { MindMapDocument, ThemeConfig } from '../../../types/mindmap';
import { addChild, createDocument } from '../../editor/nodeOps';
import { applyLayoutPreset } from '../applyPreset';
import { H_GAP, V_GAP } from '../engine';
import { LAYOUT_PRESETS } from '../presets';
import { measureAllNodes, type WidthFn } from '../measure';
import { makeCtx } from './shared';
import { layoutBraceRight } from './brace';

const widthOf: WidthFn = (text) => text.length * 10;

const theme: ThemeConfig = {
  name: 't',
  colors: { primary: '#000', branches: ['#f00', '#0f0'], background: '#fff' },
  node: { shape: 'rounded', padding: [14, 8], fontSize: 14, fontWeight: 'normal' },
  connector: { type: 'curve', width: 2 },
};

/** 三层：root → A/B → A1/A2、B1 */
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

function runBrace(doc: MindMapDocument) {
  const sizes = measureAllNodes(doc, theme, widthOf);
  const ctx = makeCtx(doc, sizes, theme, H_GAP, V_GAP);
  const rootSize = sizes[doc.rootId];
  ctx.positions[doc.rootId] = {
    x: 0,
    y: 0,
    width: rootSize.width,
    height: rootSize.height,
  };
  layoutBraceRight(ctx);
  return ctx;
}

/** 括号路径：M x1 y1 L sx y1 L sx y2 L x2 y2 → 竖脊 x */
function spineXOf(d: string): number {
  expect(d.includes('C ')).toBe(false);
  expect(d.includes('L ')).toBe(true);
  const nums = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  expect(nums[2]).toBe(nums[4]);
  return nums[2];
}

describe('layoutBraceRight', () => {
  it('父左子右：每个非根节点 x > parent.x', () => {
    const doc = threeLevelDoc();
    const { positions } = runBrace(doc);
    for (const node of Object.values(doc.nodes)) {
      if (node.parentId === null) continue;
      expect(positions[node.id].x).toBeGreaterThan(positions[node.parentId].x);
    }
  });

  it('同父孩子垂直排列，y 序与 children 一致', () => {
    const doc = threeLevelDoc();
    const { positions } = runBrace(doc);
    for (const node of Object.values(doc.nodes)) {
      const kids = node.children;
      for (let i = 1; i < kids.length; i++) {
        expect(positions[kids[i]].y).toBeGreaterThan(positions[kids[i - 1]].y);
      }
    }
  });

  it('连线为竖托架 + 水平臂：同父孩子共享 spine x，且脊更靠近子节点', () => {
    const doc = threeLevelDoc();
    const { positions, connectors } = runBrace(doc);
    expect(connectors.length).toBeGreaterThan(0);
    expect(connectors.every((c) => c.dir === 'right')).toBe(true);

    const a = doc.nodes[doc.rootId].children[0];
    const siblings = doc.nodes[a].children;
    const siblingConns = siblings.map((k) => connectors.find((c) => c.from === a && c.to === k)!);
    const spines = siblingConns.map((c) => spineXOf(c.d));
    expect(new Set(spines).size).toBe(1);

    const parent = positions[a];
    const child = positions[siblings[0]];
    const fromX = parent.x + parent.width / 2;
    const toX = child.x - child.width / 2;
    const mid = (fromX + toX) / 2;
    expect(spines[0]).toBeGreaterThan(mid);
    expect(spines[0]).toBeLessThan(toX);

    for (const c of siblingConns) {
      const nums = c.d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      expect(nums[0]).toBeCloseTo(fromX, 5);
      expect(nums[nums.length - 2]).toBeCloseTo(toX, 5);
    }
  });
});

describe('brace 预设', () => {
  it('brace-* 与 map-brace-entry 均为 ready，且 connectorType 为 brace', () => {
    const ids = [
      'map-brace-entry',
      'brace-solid',
      'brace-line',
      'brace-dashed',
      'brace-pill',
      'brace-hex',
      'brace-bubble',
    ];
    for (const id of ids) {
      const p = LAYOUT_PRESETS.find((x) => x.id === id);
      expect(p, id).toBeDefined();
      expect(p!.ready).toBe(true);
      expect(p!.structure).toBe('brace-right');
      expect(p!.defaults.connectorType).toBe('brace');
    }
    const applied = applyLayoutPreset(createDocument(), 'brace-solid');
    expect(applied.layoutDefaults?.connectorType).toBe('brace');
  });
});
