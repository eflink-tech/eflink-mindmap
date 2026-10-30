// 分支级方向：覆盖整图生长方向，只影响被覆盖节点的子树
import { describe, expect, it } from 'vitest';
import type { MindMapDocument, ThemeConfig } from '../../types/mindmap';
import { addChild, createDocument, setBranchDirection } from '../editor/nodeOps';
import { H_GAP, V_GAP } from './engine';
import { measureAllNodes, type WidthFn } from './measure';
import { layoutMap } from './strategies/map';
import { makeCtx, supportsBranchDirection, type LayoutCtx } from './strategies/shared';
import { layoutFlow } from './strategies/flow';

const widthOf: WidthFn = (text) => text.length * 10;

const theme: ThemeConfig = {
  name: 't',
  colors: { primary: '#000', branches: ['#f00', '#0f0'], background: '#fff' },
  node: { shape: 'rounded', padding: [14, 8], fontSize: 14, fontWeight: 'normal' },
  connector: { type: 'curve', width: 2 },
};

/** root → A/B → A1/A2、B1 */
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

function run(
  doc: MindMapDocument,
  layout: (ctx: LayoutCtx) => void,
  branchDirections = true,
): LayoutCtx {
  const sizes = measureAllNodes(doc, theme, widthOf);
  const ctx = makeCtx(doc, sizes, theme, H_GAP, V_GAP, branchDirections);
  const rootSize = sizes[doc.rootId];
  ctx.positions[doc.rootId] = { x: 0, y: 0, width: rootSize.width, height: rootSize.height };
  layout(ctx);
  return ctx;
}

const runMapRight = (doc: MindMapDocument, branchDirections = true) =>
  run(doc, (ctx) => layoutMap(ctx, 'map-right'), branchDirections);

function nodeAt(doc: MindMapDocument, text: string): string {
  const hit = Object.values(doc.nodes).find((n) => n.text === text);
  if (!hit) throw new Error(`missing node ${text}`);
  return hit.id;
}

describe('分支级方向：思维导图', () => {
  it('未设置覆盖时布局与显式继承方向完全一致', () => {
    const base = threeLevelDoc();
    const inherited = Object.values(base.nodes).reduce(
      (d, n) => (n.parentId === null ? d : setBranchDirection(d, n.id, 'right')),
      base,
    );
    const a = runMapRight(base);
    const b = runMapRight(inherited);
    expect(b.positions).toEqual(a.positions);
    expect(b.connectors.map((c) => c.dir)).toEqual(a.connectors.map((c) => c.dir));
  });

  it('一级分支改为向下后，其子节点移到该节点下方', () => {
    const base = threeLevelDoc();
    const doc = setBranchDirection(base, nodeAt(base, 'A'), 'down');
    const { positions, connectors } = runMapRight(doc);
    const a = nodeAt(doc, 'A');
    const a1 = nodeAt(doc, 'A1');
    const a2 = nodeAt(doc, 'A2');
    for (const id of [a1, a2]) {
      expect(positions[id].y).toBeGreaterThan(positions[a].y + positions[a].height / 2);
      expect(Math.abs(positions[id].x - positions[a].x)).toBeLessThan(positions[a].width);
    }
    expect(connectors.filter((c) => c.from === a).every((c) => c.dir === 'down')).toBe(true);
    // 未覆盖的分支保持向右
    const b = nodeAt(doc, 'B');
    expect(connectors.filter((c) => c.from === b).every((c) => c.dir === 'right')).toBe(true);
  });

  it('一级分支改为向左后，子节点落在该节点左侧', () => {
    const base = threeLevelDoc();
    const doc = setBranchDirection(base, nodeAt(base, 'B'), 'left');
    const { positions } = runMapRight(doc);
    const b = nodeAt(doc, 'B');
    expect(positions[nodeAt(doc, 'B1')].x).toBeLessThan(positions[b].x);
  });

  it('二级分支也可以覆盖方向', () => {
    const base = threeLevelDoc();
    const doc = setBranchDirection(base, nodeAt(base, 'A1'), 'down');
    const withKid = addChild(doc, nodeAt(doc, 'A1'), 'A11');
    const { positions } = runMapRight(withKid);
    const a1 = nodeAt(withKid, 'A1');
    expect(positions[nodeAt(withKid, 'A11')].y).toBeGreaterThan(positions[a1].y);
  });

  it('branchDirections=false 时忽略覆盖（矩阵等固定结构）', () => {
    const base = threeLevelDoc();
    const doc = setBranchDirection(base, nodeAt(base, 'A'), 'down');
    const off = runMapRight(doc, false);
    const on = runMapRight(doc, true);
    expect(off.positions).toEqual(runMapRight(base).positions);
    expect(on.positions).not.toEqual(off.positions);
  });
});

describe('分支级方向：逻辑图/组织架构', () => {
  it('org-down 分支改为向右', () => {
    const base = threeLevelDoc();
    const doc = setBranchDirection(base, nodeAt(base, 'A'), 'right');
    const { positions } = run(doc, (ctx) => layoutFlow(ctx, 'down'));
    const a = nodeAt(doc, 'A');
    const a1 = nodeAt(doc, 'A1');
    expect(positions[a1].x).toBeGreaterThan(positions[a].x + positions[a].width / 2);
  });
});

describe('supportsBranchDirection', () => {
  it('有生长方向的结构返回 true，固定网格结构返回 false', () => {
    expect(supportsBranchDirection('map-balanced')).toBe(true);
    expect(supportsBranchDirection('map-up')).toBe(true);
    expect(supportsBranchDirection('logic-right')).toBe(true);
    expect(supportsBranchDirection('tree-balanced')).toBe(true);
    expect(supportsBranchDirection('map-radial')).toBe(false);
    expect(supportsBranchDirection('logic-outline')).toBe(false);
    expect(supportsBranchDirection('matrix-2x2')).toBe(false);
    expect(supportsBranchDirection('timeline-h')).toBe(false);
    expect(supportsBranchDirection('fishbone-rl')).toBe(false);
    expect(supportsBranchDirection('brace-right')).toBe(false);
  });
});
