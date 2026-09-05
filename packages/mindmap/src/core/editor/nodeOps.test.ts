// 节点操作纯函数测试
import { describe, expect, it } from 'vitest';
import type { MindMapDocument, MindMapNode } from '../../types/mindmap';
import {
  addBoundary,
  addChild,
  addRelation,
  addSibling,
  addSummary,
  createDocument,
  moveNode,
  removeBoundary,
  removeMarker,
  removeNode,
  removeRelation,
  removeSummary,
  setMarker,
  subtreeIds,
  toggleCollapse,
  toggleMarker,
  updateBoundaryTitle,
  updateMetadata,
  updateRelationLabel,
  updateStyle,
  updateSummaryText,
  updateText,
} from './nodeOps';

function docWithChain(): MindMapDocument {
  let doc = createDocument();
  doc = addChild(doc, doc.rootId, 'A');
  doc = addChild(doc, doc.rootId, 'B');
  return doc;
}

function byText(doc: MindMapDocument, text: string): string {
  const node = Object.values(doc.nodes).find((n) => n.text === text);
  if (!node) throw new Error(`node ${text} not found`);
  return node.id;
}

// 旧文档：一级分支均无 metadata.side，布局按「少的一侧、平局靠右」推断 a=右 b=左 c=右
function legacyDoc(): MindMapDocument {
  const root = 'root';
  const nodes: Record<string, MindMapNode> = {
    [root]: { id: root, parentId: null, children: ['a', 'b', 'c'], text: '中心主题' },
    a: { id: 'a', parentId: root, children: [], text: 'A' },
    b: { id: 'b', parentId: root, children: [], text: 'B' },
    c: { id: 'c', parentId: root, children: [], text: 'C' },
  };
  return { ...createDocument(), rootId: root, nodes };
}

describe('createDocument', () => {
  it('只含一个根节点，parentId 为 null', () => {
    const doc = createDocument();
    expect(Object.keys(doc.nodes)).toHaveLength(1);
    expect(doc.nodes[doc.rootId].parentId).toBeNull();
    expect(doc.nodes[doc.rootId].text).toBe('中心主题');
  });
});

describe('addChild', () => {
  it('追加子节点并维护 parentId/children', () => {
    let d = createDocument();
    d = addChild(d, d.rootId, 'A');
    const a = byText(d, 'A');
    expect(d.nodes[d.rootId].children).toEqual([a]);
    expect(d.nodes[a].parentId).toBe(d.rootId);
  });

  it('父节点折叠时自动展开', () => {
    let d = docWithChain();
    const a = byText(d, 'A');
    d = toggleCollapse(d, a);
    expect(d.nodes[a].metadata?.collapsed).toBe(true);
    d = addChild(d, a, 'A1');
    expect(d.nodes[a].metadata?.collapsed).toBe(false);
  });

  it('不修改入参（不可变）', () => {
    const before = createDocument();
    const frozen = before.nodes[before.rootId].children;
    addChild(before, before.rootId, 'A');
    expect(before.nodes[before.rootId].children).toBe(frozen);
    expect(before.nodes[before.rootId].children).toHaveLength(0);
  });
});

describe('addSibling', () => {
  it('插入到目标节点之后', () => {
    let d = docWithChain(); // root -> [A, B]
    const a = byText(d, 'A');
    d = addSibling(d, a, 'A2');
    expect(d.nodes[d.rootId].children.map((id) => d.nodes[id].text)).toEqual(['A', 'A2', 'B']);
  });

  it('根节点上降级为 addChild', () => {
    let d = createDocument();
    d = addSibling(d, d.rootId, 'C');
    expect(Object.keys(d.nodes)).toHaveLength(2);
    expect(d.nodes[d.rootId].children).toHaveLength(1);
  });

  it('一级分支的新同级继承目标分支已标注的侧', () => {
    let d = createDocument();
    d = addChild(d, d.rootId, 'L');
    const l = byText(d, 'L');
    d = updateMetadata(d, l, { side: 'left' });
    d = addSibling(d, l);
    const created = d.nodes[d.rootId].children[1];
    expect(created).not.toBe(l);
    expect(d.nodes[created].parentId).toBe(d.rootId);
    expect(d.nodes[created].metadata?.side).toBe('left');
  });

  it('旧文档未标注侧的一级分支按布局推断侧继承，保证新同级落在同一侧', () => {
    const d0 = legacyDoc(); // 推断 b=左
    const b = byText(d0, 'B');
    const d = addSibling(d0, b);
    const created = d.nodes[d.rootId].children[2];
    expect(d.nodes[created].metadata?.side).toBe('left');
  });

  it('非一级分支的新同级不写 side', () => {
    let d = docWithChain();
    const a = byText(d, 'A');
    d = addChild(d, a, 'A1');
    const a1 = byText(d, 'A1');
    d = addSibling(d, a1);
    const created = d.nodes[a].children[1];
    expect(d.nodes[created].metadata?.side).toBeUndefined();
  });

  it('position=before 时插入到目标节点之前', () => {
    let d = docWithChain(); // root -> [A, B]
    d = addSibling(d, byText(d, 'B'), 'B0', 'before');
    expect(d.nodes[d.rootId].children.map((id) => d.nodes[id].text)).toEqual(['A', 'B0', 'B']);
  });
});

describe('updateText', () => {
  it('只更新目标节点', () => {
    let d = docWithChain();
    const a = byText(d, 'A');
    const before = d;
    d = updateText(d, a, 'A!');
    expect(d.nodes[a].text).toBe('A!');
    expect(before.nodes[a].text).toBe('A');
  });
});

describe('removeNode', () => {
  it('删除整棵子树', () => {
    let d = docWithChain();
    const a = byText(d, 'A');
    d = addChild(d, a, 'A1');
    const a1 = byText(d, 'A1');
    d = removeNode(d, a);
    expect(d.nodes[a]).toBeUndefined();
    expect(d.nodes[a1]).toBeUndefined();
    expect(d.nodes[d.rootId].children).toEqual([byText(d, 'B')]);
  });

  it('根节点不可删', () => {
    const d = createDocument();
    expect(removeNode(d, d.rootId)).toBe(d);
  });
});

describe('moveNode', () => {
  it('同级重排', () => {
    let d = docWithChain();
    const a = byText(d, 'A');
    d = moveNode(d, a, d.rootId, 1);
    expect(d.nodes[d.rootId].children.map((id) => d.nodes[id].text)).toEqual(['B', 'A']);
  });

  it('换父', () => {
    let d = docWithChain();
    const a = byText(d, 'A');
    const b = byText(d, 'B');
    d = moveNode(d, b, a, 0);
    expect(d.nodes[a].children).toEqual([b]);
    expect(d.nodes[b].parentId).toBe(a);
    expect(d.nodes[d.rootId].children).toEqual([a]);
  });

  it('拒绝移入自身后代', () => {
    let d = docWithChain();
    const a = byText(d, 'A');
    d = addChild(d, a, 'A1');
    const a1 = byText(d, 'A1');
    const before = d;
    const after = moveNode(d, a, a1, 0);
    expect(after).toBe(before);
  });

  it('根节点不可拖', () => {
    const d = docWithChain();
    expect(moveNode(d, d.rootId, byText(d, 'A'), 0)).toBe(d);
  });
});

describe('subtreeIds / toggleCollapse', () => {
  it('subtreeIds 含自身与全部后代', () => {
    let d = docWithChain();
    const a = byText(d, 'A');
    d = addChild(d, a, 'A1');
    expect(subtreeIds(d, a)).toHaveLength(2);
  });

  it('toggleCollapse 翻转', () => {
    let d = docWithChain();
    const a = byText(d, 'A');
    d = toggleCollapse(d, a);
    expect(d.nodes[a].metadata?.collapsed).toBe(true);
    d = toggleCollapse(d, a);
    expect(d.nodes[a].metadata?.collapsed).toBe(false);
  });
});

describe('updateStyle', () => {
  it('合并样式到节点', () => {
    const doc = createDocument();
    const next = updateStyle(doc, doc.rootId, { fillColor: '#FF0000' });
    expect(next.nodes[doc.rootId].style?.fillColor).toBe('#FF0000');
    const next2 = updateStyle(next, doc.rootId, { fontSize: 20 });
    expect(next2.nodes[doc.rootId].style).toEqual({ fillColor: '#FF0000', fontSize: 20 });
  });

  it('传 null 清除样式', () => {
    const base = createDocument();
    const withStyle = updateStyle(base, base.rootId, { fillColor: '#FF0000' });
    const cleared = updateStyle(withStyle, base.rootId, null);
    expect(cleared.nodes[base.rootId].style).toBeUndefined();
  });

  it('不存在的节点返回原文档', () => {
    const doc = createDocument();
    expect(updateStyle(doc, 'no-such', { fillColor: '#000' })).toBe(doc);
  });

  it('空对象补丁视为无操作', () => {
    const doc = createDocument();
    expect(updateStyle(doc, doc.rootId, {})).toBe(doc);
    const withStyle = updateStyle(doc, doc.rootId, { fillColor: '#FF0000' });
    expect(updateStyle(withStyle, doc.rootId, {})).toBe(withStyle);
  });

  it('不修改入参', () => {
    const doc = createDocument();
    Object.freeze(doc.nodes);
    updateStyle(doc, doc.rootId, { fillColor: '#FF0000' });
    expect(doc.nodes[doc.rootId].style).toBeUndefined();
  });

  it('undefined 值从样式中删除该键（适合定宽）', () => {
    const doc = createDocument();
    const withWidth = updateStyle(doc, doc.rootId, { fillColor: '#FF0000', fixedWidth: 200 });
    expect(withWidth.nodes[doc.rootId].style).toEqual({ fillColor: '#FF0000', fixedWidth: 200 });
    const cleared = updateStyle(withWidth, doc.rootId, { fixedWidth: undefined });
    expect(cleared.nodes[doc.rootId].style).toEqual({ fillColor: '#FF0000' });
    expect('fixedWidth' in (cleared.nodes[doc.rootId].style ?? {})).toBe(false);
  });

  it('删除最后一个样式键后 style 为 undefined', () => {
    const doc = createDocument();
    const withWidth = updateStyle(doc, doc.rootId, { fixedWidth: 120 });
    const cleared = updateStyle(withWidth, doc.rootId, { fixedWidth: undefined });
    expect(cleared.nodes[doc.rootId].style).toBeUndefined();
  });
});

describe('联系线', () => {
  it('addRelation 在文档中追加联系线', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    doc = addChild(doc, doc.rootId, 'B');
    const [a, b] = doc.nodes[doc.rootId].children;
    const next = addRelation(doc, a, b);
    expect(next.relations).toHaveLength(1);
    expect(next.relations[0]).toMatchObject({ from: a, to: b });
    expect(next.relations[0].id).toBeTruthy();
  });

  it('addRelation 自连或未知节点返回原文档', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    const a = doc.nodes[doc.rootId].children[0];
    expect(addRelation(doc, a, a)).toBe(doc);
    expect(addRelation(doc, a, 'nope')).toBe(doc);
  });

  it('updateRelationLabel 修改标签', () => {
    let d = createDocument();
    d = addChild(d, d.rootId, 'A');
    d = addChild(d, d.rootId, 'B');
    const [a, b] = d.nodes[d.rootId].children;
    d = addRelation(d, a, b);
    const relId = d.relations[0].id;
    const next = updateRelationLabel(d, relId, '依赖');
    expect(next.relations[0].label).toBe('依赖');
  });

  it('removeRelation 删除联系线', () => {
    let d = createDocument();
    d = addChild(d, d.rootId, 'A');
    d = addChild(d, d.rootId, 'B');
    const [a, b] = d.nodes[d.rootId].children;
    d = addRelation(d, a, b);
    const next = removeRelation(d, d.relations[0].id);
    expect(next.relations).toHaveLength(0);
  });

  it('未知 id 的 updateRelationLabel/removeRelation 返回原文档', () => {
    const d = createDocument();
    expect(updateRelationLabel(d, 'nope', '标签')).toBe(d);
    expect(removeRelation(d, 'nope')).toBe(d);
  });
});

describe('外框', () => {
  it('addBoundary 要求同一父节点', () => {
    let d = createDocument();
    d = addChild(d, d.rootId, 'A');
    d = addChild(d, d.rootId, 'B');
    const [a, b] = d.nodes[d.rootId].children;
    const next = addBoundary(d, [a, b]);
    expect(next.boundaries).toHaveLength(1);
    expect(next.boundaries[0].nodeIds).toEqual([a, b]);
  });

  it('addBoundary 跨父节点返回原文档', () => {
    let d = createDocument();
    d = addChild(d, d.rootId, 'A');
    const a = d.nodes[d.rootId].children[0];
    d = addChild(d, a, 'A-1');
    const a1 = d.nodes[a].children[0];
    expect(addBoundary(d, [a, a1])).toBe(d);
  });

  it('addBoundary 空数组或未知节点返回原文档', () => {
    const d = createDocument();
    expect(addBoundary(d, [])).toBe(d);
    expect(addBoundary(d, ['nope'])).toBe(d);
  });

  it('removeBoundary 删除外框，未知 id 返回原文档', () => {
    let d = createDocument();
    d = addChild(d, d.rootId, 'A');
    const a = d.nodes[d.rootId].children[0];
    d = addBoundary(d, [a]);
    expect(d.boundaries).toHaveLength(1);
    const removed = removeBoundary(d, d.boundaries[0].id);
    expect(removed.boundaries).toHaveLength(0);
    expect(removeBoundary(d, 'nope')).toBe(d);
  });
});

describe('概要', () => {
  it('addSummary 在指定区间创建概要', () => {
    let d = createDocument();
    d = addChild(d, d.rootId, 'A');
    d = addChild(d, d.rootId, 'B');
    const next = addSummary(d, d.rootId, [0, 1], '总结');
    expect(next.summaries).toHaveLength(1);
    expect(next.summaries[0]).toMatchObject({ parentId: d.rootId, range: [0, 1], text: '总结' });
  });

  it('updateSummaryText 修改概要文本', () => {
    let d = createDocument();
    d = addChild(d, d.rootId, 'A');
    d = addSummary(d, d.rootId, [0, 0], '总结');
    const next = updateSummaryText(d, d.summaries[0].id, '新总结');
    expect(next.summaries[0].text).toBe('新总结');
  });

  it('addSummary 父缺失/越界/反向区间返回原文档', () => {
    let d = createDocument();
    d = addChild(d, d.rootId, 'A');
    expect(addSummary(d, 'nope', [0, 0], 'x')).toBe(d);
    expect(addSummary(d, d.rootId, [0, 5], 'x')).toBe(d);
    expect(addSummary(d, d.rootId, [-1, 0], 'x')).toBe(d);
    expect(addSummary(d, d.rootId, [1, 0], 'x')).toBe(d);
  });

  it('removeSummary 删除概要，未知 id 返回原文档', () => {
    let d = createDocument();
    d = addChild(d, d.rootId, 'A');
    d = addSummary(d, d.rootId, [0, 0], '总结');
    const removed = removeSummary(d, d.summaries[0].id);
    expect(removed.summaries).toHaveLength(0);
    expect(removeSummary(d, 'nope')).toBe(d);
  });

  it('未知 id 的 updateSummaryText 返回原文档', () => {
    const d = createDocument();
    expect(updateSummaryText(d, 'nope', 'x')).toBe(d);
  });
});

describe('删除节点清理关系结构', () => {
  it('删除子树内节点会同时删除引用它的联系线', () => {
    let d = docWithChain(); // root -> [A, B]
    const [a, b] = d.nodes[d.rootId].children;
    d = addChild(d, a, 'A1');
    const a1 = d.nodes[a].children[0];
    d = addRelation(d, a1, b); // 一端在删除子树内 → 被删
    d = addRelation(d, d.rootId, b); // 两端都在子树外 → 保留
    d = removeNode(d, a);
    expect(d.relations).toHaveLength(1);
    expect(d.relations[0]).toMatchObject({ from: d.rootId, to: b });
  });

  it('删除外框成员：剩余成员保留且 nodeIds 已过滤', () => {
    let d = docWithChain();
    const [a, b] = d.nodes[d.rootId].children;
    d = addBoundary(d, [a, b]);
    d = removeNode(d, a);
    expect(d.boundaries).toHaveLength(1);
    expect(d.boundaries[0].nodeIds).toEqual([b]);
  });

  it('删光外框成员则整个外框被删', () => {
    let d = docWithChain();
    const [a] = d.nodes[d.rootId].children;
    d = addBoundary(d, [a]);
    d = removeNode(d, a);
    expect(d.boundaries).toHaveLength(0);
  });

  it('概要区间内删成员：区间收缩', () => {
    let d = docWithChain();
    d = addChild(d, d.rootId, 'C'); // root -> [A, B, C]
    d = addSummary(d, d.rootId, [0, 2], '总结');
    d = removeNode(d, byText(d, 'B'));
    expect(d.summaries).toHaveLength(1);
    expect(d.summaries[0].range).toEqual([0, 1]);
  });

  it('概要区间唯一成员被删：概要被删', () => {
    let d = docWithChain();
    d = addChild(d, d.rootId, 'C');
    d = addSummary(d, d.rootId, [1, 1], '总结');
    d = removeNode(d, byText(d, 'B'));
    expect(d.summaries).toHaveLength(0);
  });

  it('概要区间之前删兄弟：区间左移', () => {
    let d = docWithChain();
    d = addChild(d, d.rootId, 'C');
    d = addSummary(d, d.rootId, [1, 2], '总结');
    d = removeNode(d, byText(d, 'A'));
    expect(d.summaries).toHaveLength(1);
    expect(d.summaries[0].range).toEqual([0, 1]);
  });

  it('概要区间之后删兄弟：概要原样保留', () => {
    let d = docWithChain();
    d = addChild(d, d.rootId, 'C');
    d = addSummary(d, d.rootId, [0, 1], '总结');
    const before = d.summaries[0];
    d = removeNode(d, byText(d, 'C'));
    expect(d.summaries[0]).toBe(before);
  });

  it('删除无关节点：概要不变', () => {
    let d = docWithChain();
    d = addSummary(d, d.rootId, [0, 1], '总结');
    const a = byText(d, 'A');
    d = addChild(d, a, 'A1');
    const before = d.summaries[0];
    d = removeNode(d, byText(d, 'A1'));
    expect(d.summaries[0]).toBe(before);
    expect(d.summaries[0].range).toEqual([0, 1]);
  });

  it('概要父节点在删除子树内：概要被删', () => {
    let d = docWithChain();
    const a = byText(d, 'A');
    d = addChild(d, a, 'A1');
    d = addChild(d, a, 'A2');
    d = addSummary(d, a, [0, 1], '子概要');
    d = removeNode(d, a);
    expect(d.summaries).toHaveLength(0);
  });
});

describe('元数据', () => {
  it('updateMetadata 合并 patch', () => {
    const d = createDocument();
    const next = updateMetadata(d, d.rootId, { link: 'https://example.com' });
    expect(next.nodes[d.rootId].metadata?.link).toBe('https://example.com');
    const next2 = updateMetadata(next, d.rootId, { note: '备注' });
    expect(next2.nodes[d.rootId].metadata).toMatchObject({ link: 'https://example.com', note: '备注' });
  });

  it('setMarker 追加标记，同类型替换', () => {
    const d = createDocument();
    const d1 = setMarker(d, d.rootId, { type: 'priority', level: 1 });
    expect(d1.nodes[d.rootId].metadata?.markers).toEqual([{ type: 'priority', level: 1 }]);
    const d2 = setMarker(d1, d.rootId, { type: 'priority', level: 3 });
    expect(d2.nodes[d.rootId].metadata?.markers).toEqual([{ type: 'priority', level: 3 }]);
    const d3 = setMarker(d2, d.rootId, { type: 'progress', percent: 50 });
    expect(d3.nodes[d.rootId].metadata?.markers).toHaveLength(2);
  });

  it('setMarker 按分组互斥：task 替换旧版 progress，不同分组共存', () => {
    const d = createDocument();
    const d1 = setMarker(d, d.rootId, { type: 'progress', percent: 50 });
    const d2 = setMarker(d1, d.rootId, { type: 'task', state: 'p75' });
    expect(d2.nodes[d.rootId].metadata?.markers).toEqual([{ type: 'task', state: 'p75' }]);
    const d3 = setMarker(d2, d.rootId, { type: 'flag', color: 'red' });
    expect(d3.nodes[d.rootId].metadata?.markers).toHaveLength(2);
    const d4 = setMarker(d3, d.rootId, { type: 'star', color: 'blue' });
    expect(d4.nodes[d.rootId].metadata?.markers).toHaveLength(3);
  });

  it('toggleMarker 已应用同图标则整组移除，否则按组写入', () => {
    const d = createDocument();
    const d1 = toggleMarker(d, d.rootId, { type: 'star', color: 'red' });
    expect(d1.nodes[d.rootId].metadata?.markers).toEqual([{ type: 'star', color: 'red' }]);
    const d2 = toggleMarker(d1, d.rootId, { type: 'star', color: 'red' });
    expect(d2.nodes[d.rootId].metadata?.markers ?? []).toHaveLength(0);
    // 同组不同色：替换而非移除或叠加
    const d3 = toggleMarker(d1, d.rootId, { type: 'star', color: 'blue' });
    expect(d3.nodes[d.rootId].metadata?.markers).toEqual([{ type: 'star', color: 'blue' }]);
    const d4 = toggleMarker(d, 'nope', { type: 'star', color: 'red' });
    expect(d4).toBe(d);
  });

  it('removeMarker 按类型删除', () => {
    const base = createDocument();
    const d1 = setMarker(base, base.rootId, { type: 'priority', level: 2 });
    const d2 = removeMarker(d1, base.rootId, 'priority');
    expect(d2.nodes[base.rootId].metadata?.markers ?? []).toHaveLength(0);
  });

  it('updateBoundaryTitle 写入与清空标题', () => {
    const base = createDocument();
    const withChild = addChild(base, base.rootId);
    const doc = addBoundary(withChild, [withChild.nodes[withChild.rootId].children[0]]);
    const id = doc.boundaries[0].id;
    const named = updateBoundaryTitle(doc, id, '大幅度');
    expect(named.boundaries[0].title).toBe('大幅度');
    const cleared = updateBoundaryTitle(named, id, '  ');
    expect(cleared.boundaries[0].title).toBeUndefined();
    expect(updateBoundaryTitle(doc, 'nope', 'x')).toBe(doc);
  });

  it('未知节点的 updateMetadata/setMarker/removeMarker 返回原文档', () => {
    const d = createDocument();
    expect(updateMetadata(d, 'nope', { link: 'x' })).toBe(d);
    expect(setMarker(d, 'nope', { type: 'priority', level: 1 })).toBe(d);
    expect(removeMarker(d, 'nope', 'priority')).toBe(d);
  });
});

describe('一级分支左右归属', () => {
  it('addChild 到根节点按少的一侧写入 metadata.side，平局靠右', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    const a = doc.nodes[doc.rootId].children[0];
    expect(doc.nodes[a].metadata?.side).toBe('right');
    doc = addChild(doc, doc.rootId, 'B');
    const b = doc.nodes[doc.rootId].children[1];
    expect(doc.nodes[b].metadata?.side).toBe('left');
    doc = addChild(doc, doc.rootId, 'C');
    const c = doc.nodes[doc.rootId].children[2];
    expect(doc.nodes[c].metadata?.side).toBe('right');
  });

  it('给非根节点添加子节点不写 side', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    const a = doc.nodes[doc.rootId].children[0];
    doc = addChild(doc, a, 'child');
    const child = doc.nodes[a].children[0];
    expect(doc.nodes[child].metadata?.side).toBeUndefined();
  });

  it('已有归属的节点移动/编辑后不被覆盖', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    const a = doc.nodes[doc.rootId].children[0];
    expect(doc.nodes[a].metadata?.side).toBe('right');
    doc = updateText(doc, a, '改文字');
    expect(doc.nodes[a].metadata?.side).toBe('right');
  });
});
