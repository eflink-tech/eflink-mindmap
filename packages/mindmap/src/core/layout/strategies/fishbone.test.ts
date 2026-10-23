import { describe, expect, it } from 'vitest';
import type { Box, LayoutStructureId, MindMapDocument, ThemeConfig } from '../../../types/mindmap';
import { addChild, createDocument, toggleCollapse } from '../../editor/nodeOps';
import { applyLayoutPreset } from '../applyPreset';
import { H_GAP, V_GAP, layoutDocument } from '../engine';
import { LAYOUT_PRESETS, normalizeLayoutId } from '../presets';
import { measureAllNodes, type WidthFn } from '../measure';
import { makeCtx } from './shared';
import { layoutFishbone } from './fishbone';

const widthOf: WidthFn = (text) => text.length * 10;

const theme: ThemeConfig = {
  name: 't',
  colors: { primary: '#000', branches: ['#f00', '#0f0'], background: '#fff' },
  node: { shape: 'rounded', padding: [14, 8], fontSize: 14, fontWeight: 'normal' },
  connector: { type: 'curve', width: 2 },
};

type FishboneStructure = Extract<LayoutStructureId, `fishbone-${string}`>;

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

/** 六个一级分支（6M 用） */
function sixBranchDoc(): MindMapDocument {
  let doc = createDocument();
  for (const t of ['A', 'B', 'C', 'D', 'E', 'F']) {
    doc = addChild(doc, doc.rootId, t);
  }
  return doc;
}

function run(doc: MindMapDocument, structure: FishboneStructure) {
  const sizes = measureAllNodes(doc, theme, widthOf);
  const ctx = makeCtx(doc, sizes, theme, H_GAP, V_GAP);
  const rootSize = sizes[doc.rootId];
  ctx.positions[doc.rootId] = {
    x: 0,
    y: 0,
    width: rootSize.width,
    height: rootSize.height,
  };
  layoutFishbone(ctx, structure);
  return ctx;
}

function byText(doc: MindMapDocument, text: string): string {
  const node = Object.values(doc.nodes).find((n) => n.text === text);
  if (!node) throw new Error(`node ${text} not found`);
  return node.id;
}

function overlaps(a: Box, b: Box): boolean {
  return (
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 - 0.5 &&
    Math.abs(a.y - b.y) < (a.height + b.height) / 2 - 0.5
  );
}

describe('layoutFishbone 经典原因型（fishbone-rl）', () => {
  it('鱼头在右：一级沿鱼脊向左排布且交替上下', () => {
    const doc = threeLevelDoc();
    const { positions } = run(doc, 'fishbone-rl');
    const [a, b, c] = doc.nodes[doc.rootId].children;
    expect(positions[a].x).toBeLessThan(positions[doc.rootId].x);
    expect(positions[b].x).toBeLessThan(positions[a].x);
    expect(positions[c].x).toBeLessThan(positions[b].x);
    expect(positions[a].y).toBeLessThan(positions[doc.rootId].y);
    expect(positions[b].y).toBeGreaterThan(positions[doc.rootId].y);
    expect(positions[c].y).toBeLessThan(positions[doc.rootId].y);
  });

  it('二级挂在大骨内侧、中骨沿鱼尾方向（向左）伸出', () => {
    const doc = threeLevelDoc();
    const { positions } = run(doc, 'fishbone-rl');
    const a = byText(doc, 'A');
    const [a1, a2] = doc.nodes[a].children;
    expect(positions[a1].x).toBeLessThan(positions[doc.rootId].x);
    expect(positions[a2].x).toBeLessThan(positions[doc.rootId].x);
    // 大骨标签在大骨外端，二级在大骨内侧（更靠近鱼脊）
    expect(positions[a1].y).toBeGreaterThan(positions[a].y);
    expect(positions[a2].y).toBeGreaterThan(positions[a1].y);
    // 靠近骨端的二级更靠近鱼尾
    expect(positions[a1].x).toBeLessThan(positions[a2].x);

    const b = byText(doc, 'B');
    const b1 = doc.nodes[b].children[0];
    expect(positions[b1].x).toBeLessThan(positions[doc.rootId].x);
    expect(positions[b1].y).toBeLessThan(positions[b].y);
    expect(positions[b1].y).toBeGreaterThan(positions[doc.rootId].y);
  });

  it('根到一级为折线斜骨（无曲线），dir=left；二级连线同为折线', () => {
    const doc = threeLevelDoc();
    const { connectors } = run(doc, 'fishbone-rl');
    const rootConns = connectors.filter((c) => c.from === doc.rootId);
    expect(rootConns).toHaveLength(3);
    expect(rootConns.every((c) => c.dir === 'left')).toBe(true);
    expect(rootConns.every((c) => c.d.includes('L ') && !c.d.includes('C '))).toBe(true);
    const a = byText(doc, 'A');
    const sub = connectors.filter((c) => c.from === a);
    expect(sub).toHaveLength(2);
    expect(sub.every((c) => c.dir === 'left' && !c.d.includes('C '))).toBe(true);
  });

  it('折叠后子女不参与布局', () => {
    let doc = threeLevelDoc();
    const a = doc.nodes[doc.rootId].children[0];
    const a1 = doc.nodes[a].children[0];
    doc = toggleCollapse(doc, a);
    const { positions } = run(doc, 'fishbone-rl');
    expect(positions[a]).toBeDefined();
    expect(positions[a1]).toBeUndefined();
  });

  it('六个方向的所有节点互不重叠', () => {
    const structures: FishboneStructure[] = [
      'fishbone-rl',
      'fishbone-lr',
      'fishbone-bt',
      'fishbone-tb',
      'fishbone-6m',
      'fishbone-comb',
    ];
    const doc = threeLevelDoc();
    for (const structure of structures) {
      const { positions } = run(doc, structure);
      const entries = Object.entries(positions);
      expect(entries.length, structure).toBe(7);
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          expect(
            overlaps(entries[i][1], entries[j][1]),
            `${structure}: ${entries[i][0]} 与 ${entries[j][0]} 重叠`,
          ).toBe(false);
        }
      }
    }
  });
});

describe('layoutFishbone 反向对策型（fishbone-lr）', () => {
  it('鱼头在左：一级沿鱼脊向右排布且交替上下', () => {
    const doc = threeLevelDoc();
    const { positions, connectors } = run(doc, 'fishbone-lr');
    const [a, b, c] = doc.nodes[doc.rootId].children;
    expect(positions[a].x).toBeGreaterThan(positions[doc.rootId].x);
    expect(positions[b].x).toBeGreaterThan(positions[a].x);
    expect(positions[c].x).toBeGreaterThan(positions[b].x);
    expect(positions[a].y).toBeLessThan(positions[doc.rootId].y);
    expect(positions[b].y).toBeGreaterThan(positions[doc.rootId].y);
    expect(positions[c].y).toBeLessThan(positions[doc.rootId].y);
    expect(connectors.filter((c2) => c2.from === doc.rootId).every((c2) => c2.dir === 'right')).toBe(true);
  });

  it('二级同样向鱼尾（右）生长', () => {
    const doc = threeLevelDoc();
    const { positions } = run(doc, 'fishbone-lr');
    const a = byText(doc, 'A');
    const [a1, a2] = doc.nodes[a].children;
    expect(positions[a1].x).toBeGreaterThan(positions[a].x);
    expect(positions[a2].x).toBeGreaterThan(positions[doc.rootId].x);
    expect(positions[a1].y).toBeGreaterThan(positions[a].y);
  });
});

describe('layoutFishbone 纵向（fishbone-bt / fishbone-tb）', () => {
  it('头下：鱼脊向上，一级在根上方左右交替', () => {
    const doc = threeLevelDoc();
    const { positions, connectors } = run(doc, 'fishbone-bt');
    const [a, b, c] = doc.nodes[doc.rootId].children;
    for (const id of [a, b, c]) {
      expect(positions[id].y).toBeLessThan(positions[doc.rootId].y);
    }
    expect(positions[a].x).toBeLessThan(positions[doc.rootId].x);
    expect(positions[b].x).toBeGreaterThan(positions[doc.rootId].x);
    expect(positions[a].y).toBeGreaterThan(positions[b].y);
    expect(connectors.every((c2) => c2.dir === 'up')).toBe(true);
    const a1 = doc.nodes[a].children[0];
    expect(positions[a1].y).toBeGreaterThan(positions[a].y);
  });

  it('头上：鱼脊向下，一级在根下方左右交替', () => {
    const doc = threeLevelDoc();
    const { positions, connectors } = run(doc, 'fishbone-tb');
    const [a, b, c] = doc.nodes[doc.rootId].children;
    for (const id of [a, b, c]) {
      expect(positions[id].y).toBeGreaterThan(positions[doc.rootId].y);
    }
    expect(positions[a].x).toBeLessThan(positions[doc.rootId].x);
    expect(positions[b].x).toBeGreaterThan(positions[doc.rootId].x);
    expect(connectors.every((c2) => c2.dir === 'down')).toBe(true);
  });
});

describe('layoutFishbone 6M 对称型与梳状', () => {
  it('6M：前三根大骨在上、后三根在下，同排左右配对', () => {
    const doc = sixBranchDoc();
    const { positions } = run(doc, 'fishbone-6m');
    const [a, b, c, d, e, f] = doc.nodes[doc.rootId].children;
    for (const id of [a, b, c]) {
      expect(positions[id].y).toBeLessThan(positions[doc.rootId].y);
    }
    for (const id of [d, e, f]) {
      expect(positions[id].y).toBeGreaterThan(positions[doc.rootId].y);
    }
    expect(positions[a].x).toBe(positions[d].x);
    expect(positions[b].x).toBe(positions[e].x);
    expect(positions[c].x).toBe(positions[f].x);
  });

  it('梳状：大骨垂直鱼脊，标签落在鱼脊两侧', () => {
    const doc = threeLevelDoc();
    const { positions } = run(doc, 'fishbone-comb');
    const [a, b, c] = doc.nodes[doc.rootId].children;
    expect(positions[a].x).toBeLessThan(positions[doc.rootId].x);
    expect(positions[b].x).toBeLessThan(positions[a].x);
    expect(positions[c].x).toBeLessThan(positions[b].x);
    expect(Math.abs(positions[a].y - positions[doc.rootId].y)).toBeGreaterThanOrEqual(64);
    expect(Math.abs(positions[b].y - positions[doc.rootId].y)).toBeGreaterThanOrEqual(64);
    expect(positions[a].y).toBeLessThan(positions[doc.rootId].y);
    expect(positions[b].y).toBeGreaterThan(positions[doc.rootId].y);
  });
});

describe('fishbone 预设与分发', () => {
  it('六个鱼骨预设均为 ready 且结构互不相同', () => {
    const items = LAYOUT_PRESETS.filter((p) => p.category === 'fishbone');
    expect(items.length).toBe(6);
    expect(items.every((p) => p.ready)).toBe(true);
    expect(new Set(items.map((p) => p.structure))).toEqual(
      new Set(['fishbone-rl', 'fishbone-lr', 'fishbone-bt', 'fishbone-tb', 'fishbone-6m', 'fishbone-comb']),
    );
  });

  it('旧鱼骨预设迁移到新六套', () => {
    expect(normalizeLayoutId('fishbone-1')).toBe('fishbone-classic');
    expect(normalizeLayoutId('fishbone-2')).toBe('fishbone-6m');
    expect(normalizeLayoutId('fishbone-3')).toBe('fishbone-comb');
    expect(normalizeLayoutId('fishbone-right')).toBe('fishbone-classic');
    const applied = applyLayoutPreset(createDocument(), 'fishbone-classic');
    expect(applied.layout).toBe('fishbone-classic');
  });

  it('layoutDocument 按预设分发到鱼骨策略', () => {
    const doc = { ...threeLevelDoc(), layout: 'fishbone-classic' };
    const { positions } = layoutDocument(doc, theme, widthOf);
    const [a, b, c] = doc.nodes[doc.rootId].children;
    expect(positions[a].x).toBeLessThan(positions[doc.rootId].x);
    expect(positions[b].x).toBeLessThan(positions[a].x);
    expect(positions[a].y).toBeLessThan(positions[doc.rootId].y);
    expect(positions[b].y).toBeGreaterThan(positions[doc.rootId].y);
    expect(positions[c].y).toBeLessThan(positions[doc.rootId].y);
  });
});
