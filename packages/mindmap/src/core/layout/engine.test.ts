import { describe, expect, it } from 'vitest';
import type { MindMapDocument, ThemeConfig } from '../../types/mindmap';
import { addChild, createDocument, toggleCollapse, updateMetadata, updateStyle, updateText } from '../editor/nodeOps';
import { DEFAULT_CANVAS_OPTIONS } from '../style/canvasOptions';
import { layoutDocument } from './engine';
import type { WidthFn } from './measure';
import { getStructure } from './structures';

const widthOf: WidthFn = (text) => text.length * 10;

const theme: ThemeConfig = {
  name: 't',
  colors: { primary: '#000', branches: ['#f00', '#0f0'], background: '#fff' },
  node: { shape: 'rounded', padding: [14, 8], fontSize: 14, fontWeight: 'normal' },
  connector: { type: 'curve', width: 2 },
};

function bigDoc(): MindMapDocument {
  let doc = createDocument();
  for (const t of ['一', '二', '三', '四']) doc = addChild(doc, doc.rootId, t);
  return doc;
}

describe('mindmap 布局', () => {
  it('根节点居中，一级子节点分布两侧', () => {
    const doc = bigDoc();
    const { positions } = layoutDocument(doc, theme, widthOf);
    expect(positions[doc.rootId].x).toBe(0);
    const xs = doc.nodes[doc.rootId].children.map((c) => positions[c].x);
    expect(xs.some((x) => x > 0)).toBe(true);
    expect(xs.some((x) => x < 0)).toBe(true);
  });

  it('同级节点垂直方向不重叠', () => {
    const doc = bigDoc();
    const { positions } = layoutDocument(doc, theme, widthOf);
    const right = doc.nodes[doc.rootId].children
      .map((c) => positions[c])
      .filter((b) => b.x > 0)
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < right.length; i++) {
      expect(right[i].y - right[i - 1].y).toBeGreaterThanOrEqual(
        (right[i].height + right[i - 1].height) / 2,
      );
    }
  });

  it('子节点在父节点外侧（右分支 x 递增）', () => {
    let doc = bigDoc();
    const first = doc.nodes[doc.rootId].children[0];
    doc = addChild(doc, first, '子');
    const { positions } = layoutDocument(doc, theme, widthOf);
    const child = doc.nodes[first].children[0];
    if (positions[first].x > 0) {
      expect(positions[child].x).toBeGreaterThan(positions[first].x);
    }
  });

  it('折叠后子树不参与布局', () => {
    let doc = bigDoc();
    const first = doc.nodes[doc.rootId].children[0];
    doc = addChild(doc, first, '子');
    doc = toggleCollapse(doc, first);
    const { positions } = layoutDocument(doc, theme, widthOf);
    const child = doc.nodes[first].children[0];
    expect(positions[child]).toBeUndefined();
  });

  it('连线数 = 可见边数', () => {
    const doc = bigDoc();
    const { connectors } = layoutDocument(doc, theme, widthOf);
    expect(connectors).toHaveLength(4);
  });

  it('mindmap 连线带布局 dir（左右分支）', () => {
    const doc = bigDoc();
    const { positions, connectors } = layoutDocument(doc, theme, widthOf);
    expect(connectors.every((c) => c.dir === 'left' || c.dir === 'right')).toBe(true);
    for (const c of connectors) {
      if (c.from !== doc.rootId) continue;
      const expected = positions[c.to].x < 0 ? 'left' : 'right';
      expect(c.dir).toBe(expected);
    }
  });
});

describe('logic / tree 布局', () => {
  it('logic 全部子节点在右侧', () => {
    let doc = bigDoc();
    doc = updateText(doc, doc.rootId, 'R');
    doc = { ...doc, layout: 'logic' };
    const { positions } = layoutDocument(doc, theme, widthOf);
    for (const c of doc.nodes[doc.rootId].children) {
      expect(positions[c].x).toBeGreaterThan(0);
    }
  });

  it('tree 子节点在父节点下方', () => {
    let doc = bigDoc();
    doc = { ...doc, layout: 'tree' };
    const first = doc.nodes[doc.rootId].children[0];
    doc = addChild(doc, first, '子');
    const { positions } = layoutDocument(doc, theme, widthOf);
    expect(positions[first].y).toBeGreaterThan(positions[doc.rootId].y);
    const child = doc.nodes[first].children[0];
    expect(positions[child].y).toBeGreaterThan(positions[first].y);
  });

  it('tree 连线 dir 均为 down', () => {
    let doc = bigDoc();
    doc = { ...doc, layout: 'tree' };
    const { connectors } = layoutDocument(doc, theme, widthOf);
    expect(connectors.length).toBeGreaterThan(0);
    expect(connectors.every((c) => c.dir === 'down')).toBe(true);
  });

  it('contentBounds 覆盖所有节点', () => {
    let doc = bigDoc();
    doc = { ...doc, layout: 'tree' };
    const { positions, contentBounds } = layoutDocument(doc, theme, widthOf);
    for (const box of Object.values(positions)) {
      expect(contentBounds.x).toBeLessThanOrEqual(box.x - box.width / 2);
      expect(contentBounds.x + contentBounds.width).toBeGreaterThanOrEqual(box.x + box.width / 2);
    }
  });

  it('空文档（仅 root）：positions 只有 root，connectors 为空', () => {
    const doc = createDocument();
    const { positions, connectors } = layoutDocument(doc, theme, widthOf);
    expect(Object.keys(positions)).toHaveLength(1);
    expect(positions[doc.rootId]).toBeDefined();
    expect(connectors).toHaveLength(0);
  });

  it('深层嵌套（3 层）：孙子节点位置正确', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, '一级');
    const l1Id = doc.nodes[doc.rootId].children[0];
    doc = addChild(doc, l1Id, '二级');
    const l2Id = doc.nodes[l1Id].children[0];
    doc = addChild(doc, l2Id, '三级');
    const l3Id = doc.nodes[l2Id].children[0];
    const { positions } = layoutDocument(doc, theme, widthOf);
    expect(positions[l1Id]).toBeDefined();
    expect(positions[l2Id]).toBeDefined();
    expect(positions[l3Id]).toBeDefined();
    // 三级节点 x 应大于二级节点（右分支方向）
    expect(positions[l3Id].x).toBeGreaterThan(positions[l2Id].x);
    expect(positions[l2Id].x).toBeGreaterThan(positions[l1Id].x);
  });
});

describe('canvasOptions 布局', () => {
  it('compact 缩小内容包围盒', () => {
    let doc = bigDoc();
    for (const c of [...doc.nodes[doc.rootId].children]) {
      doc = addChild(doc, c, '孙');
      doc = addChild(doc, c, '孙2');
    }
    const normal = layoutDocument(
      { ...doc, canvasOptions: { ...DEFAULT_CANVAS_OPTIONS, compact: false } },
      theme,
      widthOf,
    );
    const compact = layoutDocument(
      { ...doc, canvasOptions: { ...DEFAULT_CANVAS_OPTIONS, compact: true } },
      theme,
      widthOf,
    );
    expect(compact.contentBounds.height).toBeLessThan(normal.contentBounds.height);
    expect(compact.contentBounds.width).toBeLessThan(normal.contentBounds.width);
  });

  it('unifySiblingWidth 使同级宽度一致', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, '短');
    doc = addChild(doc, doc.rootId, '这是很长很长的兄弟节点');
    const [shortId, longId] = doc.nodes[doc.rootId].children;
    const off = layoutDocument(
      { ...doc, canvasOptions: { ...DEFAULT_CANVAS_OPTIONS, unifySiblingWidth: false } },
      theme,
      widthOf,
    );
    expect(off.positions[shortId].width).toBeLessThan(off.positions[longId].width);

    const on = layoutDocument(
      { ...doc, canvasOptions: { ...DEFAULT_CANVAS_OPTIONS, unifySiblingWidth: true } },
      theme,
      widthOf,
    );
    expect(on.positions[shortId].width).toBe(on.positions[longId].width);

    // fixedWidth 节点保持自身宽度，不参与被拉宽
    doc = updateStyle(doc, shortId, { fixedWidth: 60 });
    const withFixed = layoutDocument(
      { ...doc, canvasOptions: { ...DEFAULT_CANVAS_OPTIONS, unifySiblingWidth: true } },
      theme,
      widthOf,
    );
    expect(withFixed.positions[shortId].width).toBe(60);
    expect(withFixed.positions[longId].width).toBeGreaterThan(60);
  });

  it('平衡布局分侧稳定：编辑加长文字不引起左右重排', () => {
    let doc = createDocument();
    for (const t of ['一', '二', '三']) doc = addChild(doc, doc.rootId, t);
    const kids = doc.nodes[doc.rootId].children;
    const sideOf = (id: string, ps: Record<string, { x: number }>) =>
      ps[id].x > 0 ? 'right' : 'left';
    const before = layoutDocument(doc, theme, widthOf);
    const sidesBefore = kids.map((k) => sideOf(k, before.positions));

    // 模拟编辑：某个分支文字变得超长（多行）且长出子树，子树尺寸大变
    const target = kids[1];
    doc = updateText(doc, target, '超长文本一行放不下会自动换行变成多行节点'.repeat(3));
    doc = addChild(doc, target, '子');
    doc = addChild(doc, target, '子');
    const after = layoutDocument(doc, theme, widthOf);
    const sidesAfter = kids.map((k) => sideOf(k, after.positions));
    expect(sidesAfter).toEqual(sidesBefore);
  });

  it('metadata.side 指定一级分支左右归属', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    doc = addChild(doc, doc.rootId, 'B');
    const [a, b] = doc.nodes[doc.rootId].children;
    // 插入时即持久化交替归属：A 右、B 左
    expect(doc.nodes[a].metadata?.side).toBe('right');
    expect(doc.nodes[b].metadata?.side).toBe('left');
    // 手动对调归属后布局跟随
    doc = updateMetadata(doc, a, { side: 'left' });
    doc = updateMetadata(doc, b, { side: 'right' });
    const { positions } = layoutDocument(doc, theme, widthOf);
    expect(positions[a].x).toBeLessThan(0);
    expect(positions[b].x).toBeGreaterThan(0);
  });

  it('非平衡布局全部一级子节点在右侧', () => {
    const doc = bigDoc();
    const { positions } = layoutDocument(
      { ...doc, canvasOptions: { ...DEFAULT_CANVAS_OPTIONS, balanced: false } },
      theme,
      widthOf,
    );
    for (const c of doc.nodes[doc.rootId].children) {
      expect(positions[c].x).toBeGreaterThan(0);
    }
  });
});

describe('preset structure 分发', () => {
  it('getStructure 从预设读取 structure（含旧 id 迁移）', () => {
    expect(getStructure({ ...createDocument(), layout: 'map-balanced-curve' })).toBe(
      'map-balanced',
    );
    expect(getStructure({ ...createDocument(), layout: 'map-right-curve' })).toBe('map-right');
    expect(getStructure({ ...createDocument(), layout: 'org-down-rounded' })).toBe('org-down');
    expect(getStructure({ ...createDocument(), layout: 'mindmap' })).toBe('map-balanced');
    expect(getStructure({ ...createDocument(), layout: 'logic' })).toBe('logic-right');
    expect(getStructure({ ...createDocument(), layout: 'tree' })).toBe('org-down');
  });

  it('map-balanced-curve 与旧 mindmap 平衡布局一致：一级子节点分布两侧', () => {
    const doc = { ...bigDoc(), layout: 'map-balanced-curve' };
    const { positions } = layoutDocument(doc, theme, widthOf);
    expect(positions[doc.rootId].x).toBe(0);
    const xs = doc.nodes[doc.rootId].children.map((c) => positions[c].x);
    expect(xs.some((x) => x > 0)).toBe(true);
    expect(xs.some((x) => x < 0)).toBe(true);
  });

  it('map-right-curve 全部一级子节点 x > root（忽略 balanced 与 side）', () => {
    let doc = bigDoc();
    const kids = doc.nodes[doc.rootId].children;
    doc = updateMetadata(doc, kids[0], { side: 'left' });
    doc = {
      ...doc,
      layout: 'map-right-curve',
      canvasOptions: { ...DEFAULT_CANVAS_OPTIONS, balanced: true },
    };
    const { positions } = layoutDocument(doc, theme, widthOf);
    const rootX = positions[doc.rootId].x;
    for (const c of kids) {
      expect(positions[c].x).toBeGreaterThan(rootX);
    }
  });

  it('org-down-rounded 子节点 y > root', () => {
    const doc = { ...bigDoc(), layout: 'org-down-rounded' };
    const { positions } = layoutDocument(doc, theme, widthOf);
    for (const c of doc.nodes[doc.rootId].children) {
      expect(positions[c].y).toBeGreaterThan(positions[doc.rootId].y);
    }
  });

  it('tree-right-1 子节点在根右侧（非 org-down）', () => {
    const doc = { ...bigDoc(), layout: 'tree-right-1' };
    const { positions, connectors } = layoutDocument(doc, theme, widthOf);
    const rootX = positions[doc.rootId].x;
    for (const c of doc.nodes[doc.rootId].children) {
      expect(positions[c].x).toBeGreaterThan(rootX);
    }
    expect(connectors.every((c) => c.dir === 'right')).toBe(true);
  });

  it('brace-solid 子节点在根右侧，连线为括号折线', () => {
    const doc = { ...bigDoc(), layout: 'brace-solid' };
    const { positions, connectors } = layoutDocument(doc, theme, widthOf);
    const rootX = positions[doc.rootId].x;
    for (const c of doc.nodes[doc.rootId].children) {
      expect(positions[c].x).toBeGreaterThan(rootX);
    }
    expect(connectors.every((c) => c.dir === 'right')).toBe(true);
    expect(connectors.every((c) => c.d.includes('L ') && !c.d.includes('C '))).toBe(true);
  });
});
