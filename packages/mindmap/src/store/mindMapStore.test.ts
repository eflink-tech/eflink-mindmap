import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addRelation, createDocument, updateSummaryText } from '../core/editor/nodeOps';
import { getCanvasOptions } from '../core/style/canvasOptions';
import { useMindMapStore } from './mindMapStore';
import { useUiStore } from './uiStore';

const { mockRenameDocument, mockRefresh } = vi.hoisted(() => ({
  mockRenameDocument: vi.fn(async () => undefined),
  mockRefresh: vi.fn(async () => undefined),
}));

vi.mock('../core/persistence/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../core/persistence/db')>();
  return {
    ...actual,
    renameDocument: mockRenameDocument,
  };
});

vi.mock('./documentsStore', () => ({
  useDocumentsStore: {
    getState: () => ({
      refresh: mockRefresh,
      // renameTitle 现统一走 documentsStore.renameDoc（内部再做 renameDocument + refresh）
      renameDoc: mockRenameDocument,
    }),
  },
}));

beforeEach(() => {
  useMindMapStore.getState().open(createDocument());
  // 重置联系线创建模式，避免用例间状态泄漏
  useUiStore.setState({ linking: false, linkFrom: null });
});

describe('mindMapStore', () => {
  it('act 应用操作并产生历史', () => {
    const s = useMindMapStore.getState();
    const before = s.doc!;
    s.act((doc) => ({ ...doc, title: '改名' }));
    const s2 = useMindMapStore.getState();
    expect(s2.doc!.title).toBe('改名');
    expect(s2.layoutResult).not.toBeNull();
    s2.undo();
    expect(useMindMapStore.getState().doc!.title).toBe(before.title);
    useMindMapStore.getState().redo();
    expect(useMindMapStore.getState().doc!.title).toBe('改名');
  });

  it('addTopic 选中新节点', () => {
    const s = useMindMapStore.getState();
    s.select(s.doc!.rootId);
    s.addTopic('child');
    const s2 = useMindMapStore.getState();
    expect(s2.selectedId).not.toBe(s2.doc!.rootId);
    expect(s2.doc!.nodes[s2.selectedId!].parentId).toBe(s2.doc!.rootId);
  });

  it('removeSelected 后选中父节点', () => {
    const s = useMindMapStore.getState();
    s.select(s.doc!.rootId);
    s.addTopic('child');
    const childId = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().removeSelected();
    const s2 = useMindMapStore.getState();
    expect(s2.doc!.nodes[childId]).toBeUndefined();
    expect(s2.selectedId).toBe(s2.doc!.rootId);
  });
});

describe('多选（框选 / Shift+点击）', () => {
  // 建 3 个同级子节点并返回其 id
  function threeSiblings(): [string, string, string] {
    const s = useMindMapStore.getState();
    s.addTopic('child');
    const a = useMindMapStore.getState().selectedId!;
    s.addTopic('sibling');
    const b = useMindMapStore.getState().selectedId!;
    s.addTopic('sibling');
    const c = useMindMapStore.getState().selectedId!;
    return [a, b, c];
  }

  it('toggleSelect 加入/移出多选，锚点跟随最后操作', () => {
    const [a, , c] = threeSiblings(); // 建完后锚点是第三个兄弟 c
    useMindMapStore.getState().toggleSelect(a);
    let s = useMindMapStore.getState();
    expect(new Set(s.selectedIds)).toEqual(new Set([c, a]));
    expect(s.selectedId).toBe(a);
    useMindMapStore.getState().toggleSelect(a);
    s = useMindMapStore.getState();
    expect(s.selectedIds).toEqual([c]);
    // 移出的是锚点时回退到剩余最后一个
    useMindMapStore.getState().toggleSelect(c);
    expect(useMindMapStore.getState().selectedId).toBeNull();
    expect(useMindMapStore.getState().selectedIds).toEqual([]);
  });

  it('selectMany 整体替换多选，普通 select 恢复单选', () => {
    const [a, b, c] = threeSiblings();
    useMindMapStore.getState().selectMany([a, c]);
    const s = useMindMapStore.getState();
    expect(new Set(s.selectedIds)).toEqual(new Set([a, c]));
    // 锚点 c 不在原选中里 → 取新集合最后一个
    expect(s.selectedId).toBe(c);
    useMindMapStore.getState().select(b);
    expect(useMindMapStore.getState().selectedIds).toEqual([b]);
  });

  it('selectMany 过滤已删除的节点', () => {
    const [a, b] = threeSiblings();
    useMindMapStore.getState().removeSelected(); // 删除 c（当前锚点）
    useMindMapStore.getState().selectMany([a, b, 'ghost']);
    expect(useMindMapStore.getState().selectedIds).toEqual([a, b]);
  });

  it('selectRelation 清空多选，select 清空联系线选中', () => {
    const [a, b] = threeSiblings();
    useMindMapStore.getState().act((d) => addRelation(d, a, b));
    const relId = useMindMapStore.getState().doc!.relations[0].id;
    useMindMapStore.getState().selectMany([a, b]);
    useMindMapStore.getState().selectRelation(relId);
    expect(useMindMapStore.getState().selectedIds).toEqual([]);
    expect(useMindMapStore.getState().selectedRelationId).toBe(relId);
    useMindMapStore.getState().select(a);
    expect(useMindMapStore.getState().selectedRelationId).toBeNull();
  });

  it('多选批量删除进入同一条历史，undo 一次恢复', () => {
    const [a, b, c] = threeSiblings();
    useMindMapStore.getState().selectMany([a, b]);
    useMindMapStore.getState().removeSelected();
    const s = useMindMapStore.getState();
    expect(s.doc!.nodes[a]).toBeUndefined();
    expect(s.doc!.nodes[b]).toBeUndefined();
    expect(s.doc!.nodes[c]).toBeDefined();
    expect(s.selectedId).toBe(s.doc!.rootId);
    s.undo();
    const after = useMindMapStore.getState().doc!;
    expect(after.nodes[a]).toBeDefined();
    expect(after.nodes[b]).toBeDefined();
  });

  it('多选同级节点创建区间概要', () => {
    const [a, , c] = threeSiblings();
    useMindMapStore.getState().selectMany([c, a]); // 顺序无关，取区间 [min, max]
    useMindMapStore.getState().addSummarySelected();
    const doc = useMindMapStore.getState().doc!;
    expect(doc.summaries).toHaveLength(1);
    expect(doc.summaries[0].parentId).toBe(doc.rootId);
    expect(doc.summaries[0].range).toEqual([0, 2]);
  });

  it('多选相邻子集创建对应区间概要', () => {
    const [, b, c] = threeSiblings();
    useMindMapStore.getState().selectMany([b, c]);
    useMindMapStore.getState().addSummarySelected();
    expect(useMindMapStore.getState().doc!.summaries[0].range).toEqual([1, 2]);
  });

  it('跨父节点的多选不创建概要', () => {
    const [a] = threeSiblings();
    useMindMapStore.getState().select(a);
    useMindMapStore.getState().addTopic('child'); // a1 的父是 a，与根下其他节点不同父
    const a1 = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().selectMany([a, a1]);
    const before = useMindMapStore.getState().doc;
    useMindMapStore.getState().addSummarySelected();
    expect(useMindMapStore.getState().doc).toBe(before);
    expect(useMindMapStore.getState().doc!.summaries).toHaveLength(0);
  });

  it('多选同级节点整体加外框', () => {
    const [a, b] = threeSiblings();
    useMindMapStore.getState().selectMany([a, b]);
    useMindMapStore.getState().addBoundarySelected();
    const doc = useMindMapStore.getState().doc!;
    expect(doc.boundaries).toHaveLength(1);
    expect(new Set(doc.boundaries[0].nodeIds)).toEqual(new Set([a, b]));
  });

  it('undo/redo 后多选集合始终指向存在的节点', () => {
    const [a, b] = threeSiblings();
    useMindMapStore.getState().selectMany([a, b]);
    useMindMapStore.getState().removeSelected(); // 选中回落到根节点
    const rootId = useMindMapStore.getState().doc!.rootId;
    expect(useMindMapStore.getState().selectedIds).toEqual([rootId]);
    useMindMapStore.getState().undo(); // a、b 恢复
    const s = useMindMapStore.getState();
    expect(s.doc!.nodes[a]).toBeDefined();
    expect(s.doc!.nodes[b]).toBeDefined();
    expect(s.selectedIds.every((id) => s.doc!.nodes[id])).toBe(true);
    useMindMapStore.getState().redo(); // 再次删除，多选集合不能残留悬空 id
    const s2 = useMindMapStore.getState();
    expect(s2.selectedIds.every((id) => s2.doc!.nodes[id])).toBe(true);
  });
});

describe('样式 actions', () => {
  it('setTheme 切换主题并进入历史', () => {
    useMindMapStore.getState().open(createDocument());
    // 固定时间戳，严格断言 updatedAt 被刷新
    const FUTURE = 4102444800000; // 2100-01-01
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(FUTURE);
    useMindMapStore.getState().setTheme('dancing');
    nowSpy.mockRestore();
    expect(useMindMapStore.getState().doc?.themeId).toBe('dancing');
    expect(useMindMapStore.getState().doc!.updatedAt).toBe(FUTURE);
    useMindMapStore.getState().undo();
    expect(useMindMapStore.getState().doc?.themeId).toBe('classic');
  });

  it('setTheme 拒绝非法主题 id', () => {
    useMindMapStore.getState().open(createDocument());
    const before = useMindMapStore.getState().doc;
    useMindMapStore.getState().setTheme('not-exist');
    expect(useMindMapStore.getState().doc).toBe(before);
    expect(useMindMapStore.getState().doc?.themeId).toBe('classic');
  });

  it('重复选择当前主题不产生新历史', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().setTheme('dancing');
    const historyBefore = useMindMapStore.getState().history;
    useMindMapStore.getState().setTheme('dancing');
    expect(useMindMapStore.getState().history).toBe(historyBefore);
  });

  it('旧主题 id 归一写入新 id', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().setTheme('candy');
    expect(useMindMapStore.getState().doc?.themeId).toBe('dancing');
  });

  it('setNodeStyle 合并样式到选中节点', () => {
    useMindMapStore.getState().open(createDocument());
    const id = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().setNodeStyle({ fillColor: '#FF0000' });
    expect(useMindMapStore.getState().doc?.nodes[id].style?.fillColor).toBe('#FF0000');
  });

  it('clearNodeStyle 清除选中节点样式', () => {
    useMindMapStore.getState().open(createDocument());
    const id = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().setNodeStyle({ fillColor: '#FF0000' });
    useMindMapStore.getState().clearNodeStyle();
    expect(useMindMapStore.getState().doc?.nodes[id].style).toBeUndefined();
  });

  it('setNodeStyle 传 undefined 可清除 fixedWidth', () => {
    useMindMapStore.getState().open(createDocument());
    const id = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().setNodeStyle({ fixedWidth: 180, fillColor: '#00FF00' });
    expect(useMindMapStore.getState().doc?.nodes[id].style?.fixedWidth).toBe(180);
    useMindMapStore.getState().setNodeStyle({ fixedWidth: undefined });
    const style = useMindMapStore.getState().doc?.nodes[id].style;
    expect(style?.fillColor).toBe('#00FF00');
    expect(style && 'fixedWidth' in style).toBe(false);
  });

  it('无选中节点时 setNodeStyle 无效', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().select(null);
    const before = useMindMapStore.getState().doc;
    useMindMapStore.getState().setNodeStyle({ fillColor: '#FF0000' });
    expect(useMindMapStore.getState().doc).toBe(before);
  });

  it('setCanvasOption 合并并进入历史', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().setCanvasOption({ compact: true });
    expect(getCanvasOptions(useMindMapStore.getState().doc!).compact).toBe(true);
    expect(useMindMapStore.getState().canUndo()).toBe(true);
    useMindMapStore.getState().undo();
    expect(getCanvasOptions(useMindMapStore.getState().doc!).compact).toBe(false);
  });

  it('setCanvasOption 无变化时不进入历史', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().setCanvasOption({ balanced: true });
    expect(useMindMapStore.getState().canUndo()).toBe(false);
    useMindMapStore.getState().setCanvasOption({});
    expect(useMindMapStore.getState().canUndo()).toBe(false);
  });
});

describe('复制/剪切/粘贴', () => {
  it('copySelected + paste 在选中节点下生成副本', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().addTopic('child');
    const childId = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().editSelectedText('待复制');
    useMindMapStore.getState().select(childId);
    useMindMapStore.getState().copySelected();
    useMindMapStore.getState().select(useMindMapStore.getState().doc!.rootId);
    useMindMapStore.getState().paste();
    const texts = Object.values(useMindMapStore.getState().doc!.nodes).map((n) => n.text);
    expect(texts.filter((t) => t === '待复制')).toHaveLength(2);
  });

  it('cutSelected + paste 移动子树', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().addTopic('child');
    const childId = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().editSelectedText('待剪切');
    useMindMapStore.getState().select(childId);
    useMindMapStore.getState().cutSelected();
    expect(useMindMapStore.getState().doc!.nodes[childId]).toBeUndefined();
    useMindMapStore.getState().paste();
    const texts = Object.values(useMindMapStore.getState().doc!.nodes).map((n) => n.text);
    expect(texts.filter((t) => t === '待剪切')).toHaveLength(1);
  });

  it('无剪贴板时 paste 无效', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().clearClipboard();
    const before = useMindMapStore.getState().doc;
    useMindMapStore.getState().paste();
    expect(useMindMapStore.getState().doc).toBe(before);
  });

  it('cutSelected 拒绝剪切根节点', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().select(useMindMapStore.getState().doc!.rootId);
    useMindMapStore.getState().cutSelected();
    expect(useMindMapStore.getState().clipboard).toBeNull();
    expect(Object.keys(useMindMapStore.getState().doc!.nodes)).toHaveLength(1);
  });

  it('无选中节点时 copySelected/paste 不动作', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().select(null);
    const before = useMindMapStore.getState().doc;
    useMindMapStore.getState().copySelected();
    expect(useMindMapStore.getState().clipboard).toBeNull();
    useMindMapStore.getState().paste();
    expect(useMindMapStore.getState().doc).toBe(before);
  });
});

describe('关系结构 actions', () => {
  it('addBoundarySelected 对选中节点创建外框', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().addBoundarySelected();
    const doc = useMindMapStore.getState().doc!;
    expect(doc.boundaries).toHaveLength(1);
    expect(doc.boundaries[0].nodeIds).toEqual([doc.rootId]);
  });

  it('addSummarySelected 对选中节点创建概要', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().addTopic('child');
    const childId = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().select(childId);
    useMindMapStore.getState().addSummarySelected();
    const doc = useMindMapStore.getState().doc!;
    expect(doc.summaries).toHaveLength(1);
    expect(doc.summaries[0].parentId).toBe(doc.rootId);
  });

  it('startLinking 以选中节点为起点，pickLinkNode 一次点击创建联系线', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().addTopic('child');
    const a = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().addTopic('sibling');
    const b = useMindMapStore.getState().selectedId!;
    useUiStore.getState().startLinking();
    expect(useUiStore.getState().linkFrom).toBe(b);
    useMindMapStore.getState().pickLinkNode(a);
    const doc = useMindMapStore.getState().doc!;
    expect(doc.relations).toHaveLength(1);
    expect(doc.relations[0]).toMatchObject({ from: b, to: a });
    expect(useUiStore.getState().linking).toBe(false);
  });

  it('无选中时 startLinking 保留两次点击流程', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().addTopic('child');
    const a = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().addTopic('sibling');
    const b = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().select(null);
    useUiStore.getState().startLinking();
    expect(useUiStore.getState().linkFrom).toBeNull();
    useMindMapStore.getState().pickLinkNode(a);
    expect(useUiStore.getState().linkFrom).toBe(a);
    useMindMapStore.getState().pickLinkNode(b);
    const doc = useMindMapStore.getState().doc!;
    expect(doc.relations).toHaveLength(1);
    expect(doc.relations[0]).toMatchObject({ from: a, to: b });
    expect(useUiStore.getState().linking).toBe(false);
  });

  it('pickLinkNode 第二次点击起点：保持连线模式与起点', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().addTopic('child');
    const a = useMindMapStore.getState().selectedId!;
    useUiStore.getState().startLinking();
    useMindMapStore.getState().pickLinkNode(a);
    useMindMapStore.getState().pickLinkNode(a); // 再次点击起点：不建自连线、不退出模式
    expect(useUiStore.getState().linking).toBe(true);
    expect(useUiStore.getState().linkFrom).toBe(a);
    expect(useMindMapStore.getState().doc!.relations).toHaveLength(0);
  });

  it('selectRelation 选中联系线并与节点选中互斥', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().addTopic('child');
    const a = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().addTopic('sibling');
    const b = useMindMapStore.getState().selectedId!;
    useUiStore.getState().startLinking();
    useMindMapStore.getState().pickLinkNode(a); // 起点取自当前选中 b
    useMindMapStore.getState().pickLinkNode(b);
    const relId = useMindMapStore.getState().doc!.relations[0].id;

    useMindMapStore.getState().selectRelation(relId);
    expect(useMindMapStore.getState().selectedRelationId).toBe(relId);
    expect(useMindMapStore.getState().selectedId).toBeNull();
    // 反向：选中节点清掉联系线选中
    useMindMapStore.getState().select(a);
    expect(useMindMapStore.getState().selectedRelationId).toBeNull();
    expect(useMindMapStore.getState().selectedId).toBe(a);
  });

  it('removeRelationById 删除选中联系线后清空选中', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().addTopic('child');
    const a = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().addTopic('sibling');
    const b = useMindMapStore.getState().selectedId!;
    useUiStore.getState().startLinking();
    useMindMapStore.getState().pickLinkNode(a);
    useMindMapStore.getState().pickLinkNode(b);
    const relId = useMindMapStore.getState().doc!.relations[0].id;
    useMindMapStore.getState().selectRelation(relId);

    useMindMapStore.getState().removeRelationById(relId);
    expect(useMindMapStore.getState().doc!.relations).toHaveLength(0);
    expect(useMindMapStore.getState().selectedRelationId).toBeNull();
  });

  it('undo 撤销建线后清空悬空的联系线选中', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().addTopic('child');
    const a = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().addTopic('sibling');
    const b = useMindMapStore.getState().selectedId!;
    useUiStore.getState().startLinking();
    useMindMapStore.getState().pickLinkNode(a);
    useMindMapStore.getState().pickLinkNode(b);
    const relId = useMindMapStore.getState().doc!.relations[0].id;
    useMindMapStore.getState().selectRelation(relId);

    useMindMapStore.getState().undo();
    expect(useMindMapStore.getState().doc!.relations).toHaveLength(0);
    expect(useMindMapStore.getState().selectedRelationId).toBeNull();
  });

  it('updateMetadataSelected 合并元数据到选中节点', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().updateMetadataSelected({ link: 'https://x.com' });
    const doc = useMindMapStore.getState().doc!;
    expect(doc.nodes[doc.rootId].metadata?.link).toBe('https://x.com');
  });
});

describe('概要选中', () => {
  it('selectSummary 与节点选中互斥，删除选中概要后清空', () => {
    useMindMapStore.getState().addTopic('child');
    const childId = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().addSummarySelected();
    const sumId = useMindMapStore.getState().doc!.summaries[0].id;
    useMindMapStore.getState().selectSummary(sumId);
    expect(useMindMapStore.getState().selectedSummaryId).toBe(sumId);
    expect(useMindMapStore.getState().selectedId).toBeNull();
    // 反向：选中节点清掉概要选中
    useMindMapStore.getState().select(childId);
    expect(useMindMapStore.getState().selectedSummaryId).toBeNull();
    // 删除当前选中概要 → 选中清空
    useMindMapStore.getState().selectSummary(sumId);
    useMindMapStore.getState().removeSummaryById(sumId);
    expect(useMindMapStore.getState().selectedSummaryId).toBeNull();
    expect(useMindMapStore.getState().doc!.summaries).toHaveLength(0);
  });

  it('undo 删除概要后清理悬空的概要选中', () => {
    useMindMapStore.getState().addTopic('child');
    useMindMapStore.getState().addSummarySelected();
    const sumId = useMindMapStore.getState().doc!.summaries[0].id;
    useMindMapStore.getState().removeSummaryById(sumId);
    useMindMapStore.getState().undo();
    expect(useMindMapStore.getState().doc!.summaries).toHaveLength(1);
    useMindMapStore.getState().selectSummary(sumId);
    useMindMapStore.getState().redo(); // 概要又被删除
    expect(useMindMapStore.getState().selectedSummaryId).toBeNull();
  });

  it('setEditingSummary 进入编辑态，节点选中/编辑互斥清理', () => {
    useMindMapStore.getState().addTopic('child');
    useMindMapStore.getState().addSummarySelected();
    const sumId = useMindMapStore.getState().doc!.summaries[0].id;
    useMindMapStore.getState().setEditingSummary(sumId);
    expect(useMindMapStore.getState().editingSummaryId).toBe(sumId);
    // 同时选中该概要保持高亮
    expect(useMindMapStore.getState().selectedSummaryId).toBe(sumId);
    // 选中节点退出概要编辑
    useMindMapStore.getState().select(useMindMapStore.getState().doc!.rootId);
    expect(useMindMapStore.getState().editingSummaryId).toBeNull();
    // 编辑节点同样退出概要编辑
    useMindMapStore.getState().setEditingSummary(sumId);
    useMindMapStore.getState().setEditing(useMindMapStore.getState().doc!.rootId);
    expect(useMindMapStore.getState().editingSummaryId).toBeNull();
    // 提交文本（编辑浮层的保存路径）
    useMindMapStore.getState().act((d) => updateSummaryText(d, sumId, '新概要'));
    expect(useMindMapStore.getState().doc!.summaries[0].text).toBe('新概要');
  });
});

describe('标记 actions', () => {
  it('setMarkerSelected 设置优先级标记', () => {
    useMindMapStore.getState().open(createDocument());
    const id = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().setMarkerSelected({ type: 'priority', level: 3 });
    const markers = useMindMapStore.getState().doc!.nodes[id].metadata?.markers;
    expect(markers).toContainEqual({ type: 'priority', level: 3 });
  });

  it('setMarkerSelected 同类型不同级别替换而非追加', () => {
    useMindMapStore.getState().open(createDocument());
    const id = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().setMarkerSelected({ type: 'priority', level: 1 });
    useMindMapStore.getState().setMarkerSelected({ type: 'priority', level: 5 });
    const markers = useMindMapStore.getState().doc!.nodes[id].metadata?.markers ?? [];
    expect(markers.filter((m) => m.type === 'priority')).toEqual([{ type: 'priority', level: 5 }]);
    expect(markers).toHaveLength(1);
  });

  it('setMarkerSelected 不同类型追加', () => {
    useMindMapStore.getState().open(createDocument());
    const id = useMindMapStore.getState().selectedId!;
    useMindMapStore.getState().setMarkerSelected({ type: 'priority', level: 2 });
    useMindMapStore.getState().setMarkerSelected({ type: 'progress', percent: 50 });
    const markers = useMindMapStore.getState().doc!.nodes[id].metadata?.markers ?? [];
    expect(markers).toHaveLength(2);
    expect(markers).toContainEqual({ type: 'progress', percent: 50 });
  });

  it('无选中节点时 setMarkerSelected 不动作', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().select(null);
    const before = useMindMapStore.getState().doc;
    useMindMapStore.getState().setMarkerSelected({ type: 'emoji', value: '🔥' });
    expect(useMindMapStore.getState().doc).toBe(before);
  });

  it('toggleMarkerSelected 已应用则移除，未应用则写入', () => {
    const s = useMindMapStore.getState();
    const id = s.selectedId!;
    s.toggleMarkerSelected({ type: 'star', color: 'red' });
    expect(useMindMapStore.getState().doc!.nodes[id].metadata?.markers).toContainEqual({ type: 'star', color: 'red' });
    useMindMapStore.getState().toggleMarkerSelected({ type: 'star', color: 'red' });
    expect(useMindMapStore.getState().doc!.nodes[id].metadata?.markers ?? []).toHaveLength(0);
  });

  it('toggleMarkerSelected 多选时整体应用，锚点已有则整体移除', () => {
    const s = useMindMapStore.getState();
    s.select(s.selectedId!);
    s.addTopic('child');
    s.addTopic('child');
    const root = useMindMapStore.getState().doc!.rootId;
    const children = useMindMapStore.getState().doc!.nodes[root].children;
    useMindMapStore.getState().selectMany(children);
    useMindMapStore.getState().toggleMarkerSelected({ type: 'flag', color: 'blue' });
    for (const c of children) {
      expect(useMindMapStore.getState().doc!.nodes[c].metadata?.markers).toContainEqual({ type: 'flag', color: 'blue' });
    }
    // 锚点已有该标记 → 再次切换整体移除
    useMindMapStore.getState().toggleMarkerSelected({ type: 'flag', color: 'blue' });
    for (const c of children) {
      expect(useMindMapStore.getState().doc!.nodes[c].metadata?.markers ?? []).toHaveLength(0);
    }
  });
});

describe('外框选中与备注', () => {
  it('selectBoundary 互斥：选中节点后选中外框清空节点选中，反之亦然', () => {
    const s = useMindMapStore.getState();
    s.select(s.selectedId!);
    s.addTopic('child');
    const child = useMindMapStore.getState().doc!.nodes[useMindMapStore.getState().doc!.rootId].children[0];
    useMindMapStore.getState().addBoundarySelected();
    const bId = useMindMapStore.getState().doc!.boundaries[0].id;
    // 节点选中 → 选中外框：节点选中清空
    useMindMapStore.getState().select(child);
    expect(useMindMapStore.getState().selectedBoundaryId).toBeNull();
    useMindMapStore.getState().selectBoundary(bId);
    expect(useMindMapStore.getState().selectedBoundaryId).toBe(bId);
    expect(useMindMapStore.getState().selectedIds).toHaveLength(0);
    // 选中外框 → 点节点：外框选中清空
    useMindMapStore.getState().select(child);
    expect(useMindMapStore.getState().selectedBoundaryId).toBeNull();
  });

  it('updateBoundaryTitleById 写入备注，removeBoundaryById 清除选中与编辑态', () => {
    useMindMapStore.getState().addTopic('child');
    useMindMapStore.getState().addBoundarySelected();
    const bId = useMindMapStore.getState().doc!.boundaries[0].id;
    useMindMapStore.getState().setEditingBoundary(bId);
    useMindMapStore.getState().updateBoundaryTitleById(bId, '大幅度');
    expect(useMindMapStore.getState().doc!.boundaries[0].title).toBe('大幅度');
    // 编辑态保持（标题提交后可继续编辑）
    expect(useMindMapStore.getState().editingBoundaryId).toBe(bId);
    useMindMapStore.getState().removeBoundaryById(bId);
    expect(useMindMapStore.getState().doc!.boundaries).toHaveLength(0);
    expect(useMindMapStore.getState().selectedBoundaryId).toBeNull();
    expect(useMindMapStore.getState().editingBoundaryId).toBeNull();
  });
});

describe('updateMetadataNode', () => {
  it('按 id 写入元数据，不受当前选中节点影响', () => {
    useMindMapStore.getState().open(createDocument());
    const rootId = useMindMapStore.getState().doc!.rootId;
    useMindMapStore.getState().addTopic('child'); // 选中节点变为子节点
    useMindMapStore.getState().updateMetadataNode(rootId, { note: '备注' });
    const doc = useMindMapStore.getState().doc!;
    expect(doc.nodes[rootId].metadata?.note).toBe('备注');
    expect(doc.nodes[useMindMapStore.getState().selectedId!].metadata?.note).toBeUndefined();
  });

  it('未知 id 为无操作，不产生历史', () => {
    useMindMapStore.getState().open(createDocument());
    const before = useMindMapStore.getState().doc;
    useMindMapStore.getState().updateMetadataNode('nope', { note: '备注' });
    expect(useMindMapStore.getState().doc).toBe(before);
  });
});

describe('renameTitle', () => {
  beforeEach(() => {
    mockRenameDocument.mockClear();
    mockRefresh.mockClear();
  });

  it('先经 documentsStore.renameDoc 持久化，成功后更新内存 doc.title', async () => {
    const doc = createDocument('旧标题');
    useMindMapStore.getState().open(doc);
    await useMindMapStore.getState().renameTitle('新标题');
    expect(mockRenameDocument).toHaveBeenCalledWith(doc.id, '新标题');
    expect(useMindMapStore.getState().doc?.title).toBe('新标题');
    expect(useMindMapStore.getState().canUndo()).toBe(false);
  });

  it('空串保留原标题', async () => {
    const doc = createDocument('保留我');
    useMindMapStore.getState().open(doc);
    await useMindMapStore.getState().renameTitle('   ');
    expect(useMindMapStore.getState().doc?.title).toBe('保留我');
    expect(mockRenameDocument).not.toHaveBeenCalled();
  });

  it('改名不影响 dirty', async () => {
    useMindMapStore.getState().open(createDocument());
    await useMindMapStore.getState().renameTitle('只改标题');
    expect(useMindMapStore.getState().dirty).toBe(false);
  });

  it('持久化失败时不改本地 title 并 toast 提示', async () => {
    mockRenameDocument.mockRejectedValueOnce(new Error('网络错误'));
    const doc = createDocument('原标题');
    useMindMapStore.getState().open(doc);
    await useMindMapStore.getState().renameTitle('新标题');
    expect(useMindMapStore.getState().doc?.title).toBe('原标题');
    expect(useUiStore.getState().toast).toContain('失败');
  });
});

describe('dirty 状态（手动保存契约）', () => {
  it('act/undo 置 dirty，markSaved 后清除', () => {
    useMindMapStore.getState().open(createDocument());
    expect(useMindMapStore.getState().dirty).toBe(false);
    const s = useMindMapStore.getState();
    s.act((doc) => ({ ...doc, title: '改名' }));
    expect(useMindMapStore.getState().dirty).toBe(true);
    // 保存期间无新编辑（doc 引用一致）→ 清除 dirty
    useMindMapStore.getState().markSaved(useMindMapStore.getState().doc!);
    expect(useMindMapStore.getState().dirty).toBe(false);
  });

  it('保存期间又有编辑（doc 引用变化）时 markSaved 保持 dirty', () => {
    useMindMapStore.getState().open(createDocument());
    const s = useMindMapStore.getState();
    s.act((doc) => ({ ...doc, title: '第一次' }));
    const staleDoc = useMindMapStore.getState().doc;
    s.act((doc) => ({ ...doc, title: '第二次' }));
    useMindMapStore.getState().markSaved(staleDoc!);
    expect(useMindMapStore.getState().dirty).toBe(true);
  });

  it('打开文档重置 dirty，视口变化不影响 dirty', () => {
    useMindMapStore.getState().open(createDocument());
    // 视口变化只写草稿，不算导图结构/节点变化
    useMindMapStore.getState().setViewport({ scale: 1, x: 0, y: 0 });
    expect(useMindMapStore.getState().dirty).toBe(false);
    const s = useMindMapStore.getState();
    s.act((doc) => ({ ...doc, title: '改名' }));
    expect(useMindMapStore.getState().dirty).toBe(true);
    useMindMapStore.getState().open(createDocument());
    expect(useMindMapStore.getState().dirty).toBe(false);
  });
});

describe('连线态跨场景清理', () => {
  it('open 新文档会退出连线模式', () => {
    useUiStore.getState().startLinking();
    expect(useUiStore.getState().linking).toBe(true);
    useMindMapStore.getState().open(createDocument());
    expect(useUiStore.getState().linking).toBe(false);
    expect(useUiStore.getState().linkFrom).toBeNull();
  });

  it('removeSelected 会退出连线模式', () => {
    useMindMapStore.getState().open(createDocument());
    useMindMapStore.getState().addTopic('child');
    const childId = useMindMapStore.getState().selectedId!;
    useUiStore.getState().startLinking();
    useUiStore.getState().pickLinkFrom(childId);
    useMindMapStore.getState().removeSelected();
    expect(useUiStore.getState().linking).toBe(false);
    expect(useUiStore.getState().linkFrom).toBeNull();
  });
});
