import { describe, expect, it } from 'vitest';
import type { MindMapDocument, ThemeConfig } from '../../../types/mindmap';
import { addChild, createDocument } from '../../editor/nodeOps';
import { layoutDocument } from '../engine';
import { LAYOUT_PRESETS } from '../presets';

const widthOf = (text: string) => text.length * 10;

const theme: ThemeConfig = {
  name: 't',
  colors: { primary: '#000', branches: ['#f00', '#0f0'], background: '#fff' },
  node: { shape: 'rounded', padding: [14, 8], fontSize: 14, fontWeight: 'normal' },
  connector: { type: 'curve', width: 2 },
};

function sampleDoc(): MindMapDocument {
  let doc = createDocument();
  doc = addChild(doc, doc.rootId, 'A');
  doc = addChild(doc, doc.rootId, 'B');
  const [a, b] = doc.nodes[doc.rootId].children;
  doc = addChild(doc, a, 'A1');
  doc = addChild(doc, a, 'A2');
  doc = addChild(doc, b, 'B1');
  return doc;
}

function withLayout(doc: MindMapDocument, layout: string): MindMapDocument {
  return { ...doc, layout };
}

function idsOf(doc: MindMapDocument): string[] {
  return Object.keys(doc.nodes);
}

function layoutOf(layout: string) {
  const doc = withLayout(sampleDoc(), layout);
  return { doc, result: layoutDocument(doc, theme, widthOf) };
}

const sixEach = LAYOUT_PRESETS.filter((p) =>
  ['mindmap', 'logic', 'brace', 'org', 'tree', 'timeline', 'matrix'].includes(
    p.category,
  ),
);

describe('模板完整性', () => {
  it('七类预设全部 ready 且能布局出全部可见节点', () => {
    for (const preset of sixEach) {
      expect(preset.ready, preset.id).toBe(true);
      const doc = withLayout(sampleDoc(), preset.id);
      const result = layoutDocument(doc, theme, widthOf);
      for (const id of idsOf(doc)) {
        expect(result.positions[id], `${preset.id} / ${id}`).toBeDefined();
      }
    }
  });
});

describe('逻辑图六向', () => {
  const cases: Array<[string, (child: { x: number; y: number }, parent: { x: number; y: number }) => boolean]> = [
    ['logic-right', (c, p) => c.x > p.x],
    ['logic-left', (c, p) => c.x < p.x],
    ['logic-down', (c, p) => c.y > p.y],
    ['logic-up', (c, p) => c.y < p.y],
  ];

  it.each(cases)('%s 子级沿指定方向展开', (layout, check) => {
    const { doc, result } = layoutOf(layout);
    for (const node of Object.values(doc.nodes)) {
      if (!node.parentId) continue;
      expect(check(result.positions[node.id], result.positions[node.parentId]), node.id).toBe(true);
    }
  });

  it('logic-balanced 一级分支左右分列', () => {
    const { doc, result } = layoutOf('logic-balanced');
    const [a, b] = doc.nodes[doc.rootId].children;
    expect(result.positions[a].x).toBeGreaterThan(result.positions[doc.rootId].x);
    expect(result.positions[b].x).toBeLessThan(result.positions[doc.rootId].x);
  });

  it('logic-outline 逐级缩进、纵向阅读且不画连线', () => {
    const { doc, result } = layoutOf('logic-outline');
    const [a, b] = doc.nodes[doc.rootId].children;
    const [a1, a2] = doc.nodes[a].children;
    expect(result.connectors).toHaveLength(0);
    expect(result.positions[a1].x).toBeGreaterThan(result.positions[a].x);
    expect(result.positions[a2].x).toBeGreaterThan(result.positions[a].x);
    expect(result.positions[a].y).toBeLessThan(result.positions[a1].y);
    expect(result.positions[a1].y).toBeLessThan(result.positions[a2].y);
    expect(result.positions[a2].y).toBeLessThan(result.positions[b].y);
  });
});

describe('组织结构图六向', () => {
  it('org-up / org-right / org-left 子级方向正确', () => {
    const up = layoutOf('org-up');
    const upNode = up.doc.nodes[up.doc.nodes[up.doc.rootId].children[0]];
    expect(up.result.positions[upNode.id].y).toBeLessThan(up.result.positions[up.doc.rootId].y);

    const right = layoutOf('org-right');
    const rNode = right.doc.nodes[right.doc.nodes[right.doc.rootId].children[0]];
    expect(right.result.positions[rNode.id].x).toBeGreaterThan(right.result.positions[right.doc.rootId].x);

    const left = layoutOf('org-left');
    const lNode = left.doc.nodes[left.doc.nodes[left.doc.rootId].children[0]];
    expect(left.result.positions[lNode.id].x).toBeLessThan(left.result.positions[left.doc.rootId].x);
  });

  it('org-balanced 一级左右分列', () => {
    const { doc, result } = layoutOf('org-balanced');
    const [a, b] = doc.nodes[doc.rootId].children;
    expect(result.positions[a].x).toBeGreaterThan(result.positions[doc.rootId].x);
    expect(result.positions[b].x).toBeLessThan(result.positions[doc.rootId].x);
  });

  it('org-classic 向下分层且父子连线为圆角正交线', () => {
    const { doc, result } = layoutOf('org-classic');
    const [a, b] = doc.nodes[doc.rootId].children;
    expect(result.positions[a].y).toBeGreaterThan(result.positions[doc.rootId].y);
    expect(result.positions[b].y).toBe(result.positions[a].y);
    const a1 = doc.nodes[a].children[0];
    expect(result.positions[a1].y).toBeGreaterThan(result.positions[a].y);
    expect(result.connectors.length).toBe(idsOf(doc).length - 1);
    for (const c of result.connectors) {
      expect(c.d, c.id).not.toContain('C ');
    }
    // 单一子节点垂直对齐时退化为直角折线，其余拐角倒圆
    expect(result.connectors.some((c) => c.d.includes('Q '))).toBe(true);
  });

  it('org-radial 围绕根成环，每个节点都有连线且为直线段', () => {
    const { doc, result } = layoutOf('org-radial');
    const root = result.positions[doc.rootId];
    const kids = doc.nodes[doc.rootId].children;
    const angles = kids.map((k) =>
      Math.atan2(result.positions[k].y - root.y, result.positions[k].x - root.x),
    );
    expect(new Set(angles.map((a) => a.toFixed(3))).size).toBe(kids.length);
    expect(result.connectors).toHaveLength(idsOf(doc).length - 1);
    for (const c of result.connectors) {
      expect(c.d).toMatch(/^M [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+$/);
    }
  });
});

describe('树形图六向', () => {
  it('tree-down / tree-up / tree-left 子级方向正确', () => {
    const down = layoutOf('tree-down');
    const dNode = down.doc.nodes[down.doc.nodes[down.doc.rootId].children[0]];
    expect(down.result.positions[dNode.id].y).toBeGreaterThan(down.result.positions[down.doc.rootId].y);

    const up = layoutOf('tree-up');
    const uNode = up.doc.nodes[up.doc.nodes[up.doc.rootId].children[0]];
    expect(up.result.positions[uNode.id].y).toBeLessThan(up.result.positions[up.doc.rootId].y);

    const left = layoutOf('tree-left');
    const lNode = left.doc.nodes[left.doc.nodes[left.doc.rootId].children[0]];
    expect(left.result.positions[lNode.id].x).toBeLessThan(left.result.positions[left.doc.rootId].x);
  });

  it('tree-wbs 根下横向分列，列内逐级缩进向下堆叠', () => {
    let doc = withLayout(sampleDoc(), 'tree-wbs');
    const [a, b] = doc.nodes[doc.rootId].children;
    const [a1, a2] = doc.nodes[a].children;
    doc = addChild(doc, a1, 'A11');
    const a11 = doc.nodes[a1].children[0];
    const result = layoutDocument(doc, theme, widthOf);

    expect(result.positions[a].y).toBe(result.positions[b].y);
    expect(result.positions[a].y).toBeGreaterThan(result.positions[doc.rootId].y);
    expect(result.positions[a].x).toBeLessThan(result.positions[b].x);

    expect(result.positions[a1].y).toBeGreaterThan(result.positions[a].y);
    expect(result.positions[a2].y).toBeGreaterThan(result.positions[a1].y);
    expect(result.positions[a1].x).toBeGreaterThan(result.positions[a].x);
    expect(result.positions[a2].x).toBe(result.positions[a1].x);

    expect(result.positions[a11].y).toBeGreaterThan(result.positions[a1].y);
    expect(result.positions[a11].x).toBeGreaterThan(result.positions[a1].x);

    expect(result.connectors).toHaveLength(idsOf(doc).length - 1);
    for (const c of result.connectors) {
      expect(c.d, c.id).not.toContain('C ');
    }
  });

  it('tree-balanced 一级左右分列，tree-radial 有 5 条连线', () => {
    const balanced = layoutOf('tree-balanced');
    const [a, b] = balanced.doc.nodes[balanced.doc.rootId].children;
    expect(balanced.result.positions[a].x).toBeGreaterThan(balanced.result.positions[balanced.doc.rootId].x);
    expect(balanced.result.positions[b].x).toBeLessThan(balanced.result.positions[balanced.doc.rootId].x);

    const radial = layoutOf('tree-radial');
    expect(radial.result.connectors).toHaveLength(5);
  });
});

describe('思维导图六向', () => {
  it('左右上下单侧方向正确', () => {
    const right = layoutOf('map-right');
    const rNode = right.doc.nodes[right.doc.nodes[right.doc.rootId].children[0]];
    expect(right.result.positions[rNode.id].x).toBeGreaterThan(
      right.result.positions[right.doc.rootId].x,
    );

    const left = layoutOf('map-left');
    const lNode = left.doc.nodes[left.doc.nodes[left.doc.rootId].children[0]];
    expect(left.result.positions[lNode.id].x).toBeLessThan(
      left.result.positions[left.doc.rootId].x,
    );

    const down = layoutOf('map-down');
    const dNode = down.doc.nodes[down.doc.nodes[down.doc.rootId].children[0]];
    expect(down.result.positions[dNode.id].y).toBeGreaterThan(
      down.result.positions[down.doc.rootId].y,
    );

    const up = layoutOf('map-up');
    const uNode = up.doc.nodes[up.doc.nodes[up.doc.rootId].children[0]];
    expect(up.result.positions[uNode.id].y).toBeLessThan(
      up.result.positions[up.doc.rootId].y,
    );
  });

  it('双向平衡一级分列两侧，放射布局有直线连线', () => {
    const balanced = layoutOf('map-balanced-curve');
    const [a, b] = balanced.doc.nodes[balanced.doc.rootId].children;
    expect(balanced.result.positions[a].x).toBeGreaterThan(
      balanced.result.positions[balanced.doc.rootId].x,
    );
    expect(balanced.result.positions[b].x).toBeLessThan(
      balanced.result.positions[balanced.doc.rootId].x,
    );

    const radial = layoutOf('map-radial');
    expect(radial.result.connectors).toHaveLength(5);
    for (const c of radial.result.connectors) {
      expect(c.d).toMatch(/^M [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+$/);
    }
  });
});

describe('括号图六向', () => {
  it('四向层级与双向分列', () => {
    const right = layoutOf('brace-right');
    const rNode = right.doc.nodes[right.doc.nodes[right.doc.rootId].children[0]];
    expect(right.result.positions[rNode.id].x).toBeGreaterThan(
      right.result.positions[right.doc.rootId].x,
    );

    const left = layoutOf('brace-left');
    const lNode = left.doc.nodes[left.doc.nodes[left.doc.rootId].children[0]];
    expect(left.result.positions[lNode.id].x).toBeLessThan(
      left.result.positions[left.doc.rootId].x,
    );

    const down = layoutOf('brace-down');
    const dNode = down.doc.nodes[down.doc.nodes[down.doc.rootId].children[0]];
    expect(down.result.positions[dNode.id].y).toBeGreaterThan(
      down.result.positions[down.doc.rootId].y,
    );

    const up = layoutOf('brace-up');
    const uNode = up.doc.nodes[up.doc.nodes[up.doc.rootId].children[0]];
    expect(up.result.positions[uNode.id].y).toBeLessThan(
      up.result.positions[up.doc.rootId].y,
    );

    const balanced = layoutOf('brace-balanced');
    const [a, b] = balanced.doc.nodes[balanced.doc.rootId].children;
    expect(balanced.result.positions[a].x).toBeGreaterThan(
      balanced.result.positions[balanced.doc.rootId].x,
    );
    expect(balanced.result.positions[b].x).toBeLessThan(
      balanced.result.positions[balanced.doc.rootId].x,
    );
  });

  it('缩进括号不画连线且逐级缩进', () => {
    const { doc, result } = layoutOf('brace-outline');
    expect(result.connectors).toHaveLength(0);
    const [a, b] = doc.nodes[doc.rootId].children;
    const [a1] = doc.nodes[a].children;
    expect(result.positions[a1].x).toBeGreaterThan(result.positions[a].x);
    expect(result.positions[a].y).toBeLessThan(result.positions[b].y);
  });
});
