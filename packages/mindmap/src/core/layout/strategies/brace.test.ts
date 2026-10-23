import { describe, expect, it } from 'vitest';
import type { LayoutStructureId, MindMapDocument, ThemeConfig } from '../../../types/mindmap';
import { addChild, createDocument } from '../../editor/nodeOps';
import { applyLayoutPreset } from '../applyPreset';
import { H_GAP, V_GAP } from '../engine';
import { LAYOUT_PRESETS } from '../presets';
import { measureAllNodes, type WidthFn } from '../measure';
import { makeCtx } from './shared';
import { layoutBrace } from './brace';

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

function runBrace(
  doc: MindMapDocument,
  structure: LayoutStructureId = 'brace-right',
) {
  const sizes = measureAllNodes(doc, theme, widthOf);
  const ctx = makeCtx(doc, sizes, theme, H_GAP, V_GAP);
  const rootSize = sizes[doc.rootId];
  ctx.positions[doc.rootId] = {
    x: 0,
    y: 0,
    width: rootSize.width,
    height: rootSize.height,
  };
  layoutBrace(ctx, structure);
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

describe('layoutBrace 向右', () => {
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

describe('brace 其余方向', () => {
  it('向左：子级在父级左侧，托架方向为 left', () => {
    const doc = threeLevelDoc();
    const { positions, connectors } = runBrace(doc, 'brace-left');
    for (const node of Object.values(doc.nodes)) {
      if (!node.parentId) continue;
      expect(positions[node.id].x).toBeLessThan(positions[node.parentId].x);
    }
    expect(connectors.every((c) => c.dir === 'left')).toBe(true);
  });

  it('向下/向上：子级沿纵向展开，托架方向对应', () => {
    const down = runBrace(threeLevelDoc(), 'brace-down');
    for (const node of Object.values(down.doc.nodes)) {
      if (!node.parentId) continue;
      expect(down.positions[node.id].y).toBeGreaterThan(
        down.positions[node.parentId].y,
      );
    }
    expect(down.connectors.every((c) => c.dir === 'down')).toBe(true);

    const up = runBrace(threeLevelDoc(), 'brace-up');
    for (const node of Object.values(up.doc.nodes)) {
      if (!node.parentId) continue;
      expect(up.positions[node.id].y).toBeLessThan(
        up.positions[node.parentId].y,
      );
    }
    expect(up.connectors.every((c) => c.dir === 'up')).toBe(true);
  });

  it('双向：一级分支左右分列', () => {
    const doc = threeLevelDoc();
    const { positions } = runBrace(doc, 'brace-balanced');
    const [a, b] = doc.nodes[doc.rootId].children;
    expect(positions[a].x).toBeGreaterThan(positions[doc.rootId].x);
    expect(positions[b].x).toBeLessThan(positions[doc.rootId].x);
  });

  it('缩进括号：不画连线，子级逐级缩进', () => {
    const doc = threeLevelDoc();
    const { positions, connectors } = runBrace(doc, 'brace-outline');
    expect(connectors).toHaveLength(0);
    const [a, b] = doc.nodes[doc.rootId].children;
    const [a1] = doc.nodes[a].children;
    expect(positions[a1].x).toBeGreaterThan(positions[a].x);
    expect(positions[a].y).toBeLessThan(positions[b].y);
  });
});

describe('brace 预设', () => {
  it('六套括号结构齐全、ready，横向托架使用 brace 连线', () => {
    const braces = LAYOUT_PRESETS.filter((p) => p.category === 'brace');
    expect(braces).toHaveLength(6);
    expect(braces.map((p) => p.structure)).toEqual([
      'brace-right',
      'brace-left',
      'brace-balanced',
      'brace-down',
      'brace-up',
      'brace-outline',
    ]);
    for (const p of braces) expect(p.ready, p.id).toBe(true);
    const applied = applyLayoutPreset(createDocument(), 'brace-right');
    expect(applied.layoutDefaults?.connectorType).toBe('brace');
  });
});
