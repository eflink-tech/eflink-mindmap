// 子树剪贴板测试
import { describe, expect, it } from 'vitest';
import { addChild, createDocument, pasteSubtree } from './nodeOps';
import { copySubtree, copySubtrees } from './clipboard';

function threeLevelDoc() {
  let doc = createDocument();
  doc = addChild(doc, doc.rootId, '一级');
  const l1 = Object.values(doc.nodes).find((n) => n.text === '一级')!;
  doc = addChild(doc, l1.id, '二级');
  return { doc, l1Id: l1.id };
}

describe('copySubtree', () => {
  it('序列化子树文本与层级结构', () => {
    const { doc, l1Id } = threeLevelDoc();
    const clip = copySubtree(doc, l1Id);
    expect(clip!.root.text).toBe('一级');
    expect(clip!.root.children).toHaveLength(1);
    expect(clip!.root.children[0].text).toBe('二级');
  });

  it('不存在的节点返回 null', () => {
    const doc = createDocument();
    expect(copySubtree(doc, 'nope')).toBeNull();
  });
});

describe('copySubtrees', () => {
  it('保留最外层子树，剔除被选中祖先的选中后代', () => {
    const { doc, l1Id } = threeLevelDoc();
    const l2Id = doc.nodes[l1Id].children[0];
    const clip = copySubtrees(doc, [l2Id, l1Id])!;
    expect(clip.roots).toHaveLength(1);
    expect(clip.root.text).toBe('一级');
    expect(clip.root.children[0].text).toBe('二级');
  });

  it('多选时 root 兼容字段等于 roots[0]', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    doc = addChild(doc, doc.rootId, 'B');
    const ids = doc.nodes[doc.rootId].children;
    const clip = copySubtrees(doc, [...ids, ids[0]])!;
    expect(clip.roots).toHaveLength(2);
    expect(clip.root).toBe(clip.roots![0]);
  });

  it('空选择/无效 id 返回 null', () => {
    const doc = createDocument();
    expect(copySubtrees(doc, [])).toBeNull();
    expect(copySubtrees(doc, ['nope'])).toBeNull();
  });
});

describe('pasteSubtree', () => {
  it('多选粘贴按顺序展开为多个子节点', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    doc = addChild(doc, doc.rootId, 'B');
    const aId = Object.values(doc.nodes).find((n) => n.text === 'A')!.id;
    const bId = Object.values(doc.nodes).find((n) => n.text === 'B')!.id;
    const clip = copySubtrees(doc, [bId, aId])!;
    const target = addChild(doc, doc.rootId, '目标');
    const targetId = Object.values(target.nodes).find((n) => n.text === '目标')!.id;
    const next = pasteSubtree(target, targetId, clip);
    const children = next.nodes[targetId].children.map((id) => next.nodes[id].text);
    expect(children).toEqual(['B', 'A']);
  });

  it('粘贴为目标节点的子节点，生成新 id', () => {
    const { doc, l1Id } = threeLevelDoc();
    const clip = copySubtree(doc, l1Id)!;
    const target = addChild(doc, doc.rootId, '目标');
    const targetNode = Object.values(target.nodes).find((n) => n.text === '目标')!;
    const next = pasteSubtree(target, targetNode.id, clip);
    const pasted = next.nodes[targetNode.id].children.map((id) => next.nodes[id]);
    expect(pasted).toHaveLength(1);
    expect(pasted[0].text).toBe('一级');
    expect(pasted[0].id).not.toBe(l1Id);
    expect(next.nodes[pasted[0].children[0]].text).toBe('二级');
  });

  it('粘贴保留样式', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, '带样式');
    const src = Object.values(doc.nodes).find((n) => n.text === '带样式')!;
    const clip = copySubtree(doc, src.id)!;
    clip.root.style = { fillColor: '#FF0000' };
    const next = pasteSubtree(doc, doc.rootId, clip);
    const pastedId = next.nodes[doc.rootId].children.find((id) => id !== src.id)!;
    expect(next.nodes[pastedId].style?.fillColor).toBe('#FF0000');
  });

  it('不存在的目标返回原文档', () => {
    const { doc, l1Id } = threeLevelDoc();
    const clip = copySubtree(doc, l1Id)!;
    expect(pasteSubtree(doc, 'nope', clip)).toBe(doc);
  });

  it('多次粘贴不复用剪贴板元数据数组引用', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, '带标签');
    const src = Object.values(doc.nodes).find((n) => n.text === '带标签')!;
    const clip = copySubtree(doc, src.id)!;
    clip.root.metadata = { labels: ['重要'], markers: [{ type: 'priority', level: 1 }] };
    const twice = pasteSubtree(pasteSubtree(doc, doc.rootId, clip), doc.rootId, clip);
    const ids = twice.nodes[doc.rootId].children;
    const m1 = twice.nodes[ids[ids.length - 2]].metadata!;
    const m2 = twice.nodes[ids[ids.length - 1]].metadata!;
    expect(m1.labels).toEqual(['重要']);
    expect(m1.labels).not.toBe(m2.labels);
    expect(m1.markers).not.toBe(m2.markers);
    expect(m1.labels).not.toBe(clip.root.metadata!.labels);
  });
});
