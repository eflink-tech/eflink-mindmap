// AI 产物 → 导图节点（通过 store.act 批量落树，整体一个撤销单元）
import { addChild, updateText } from '../core/editor/nodeOps';
import type { MindMapDocument } from '../types/mindmap';
import { useMindMapStore } from '../store/mindMapStore';
import { isPlaceholderRoot } from './systemPrompt';
import type { AITree, AITreeNode } from './types';

/**
 * 把 AI 导图树应用到当前文档：
 * - 根节点（或默认占位文本的根）优先应用 tree.root 重命名；
 * - 有选中节点时把分支挂到选中节点下，否则挂到中心主题下；
 * - 单次 act() 完成，Ctrl+Z 一步回退。
 * @returns 新增节点数
 */
export function applyAITree(tree: AITree): number {
  const store = useMindMapStore.getState();
  if (!store.doc) throw new Error('导图尚未就绪');
  // 选中节点同步捕获（act 前无异步间隙，快照安全）
  const targetId = store.selectedId && store.doc.nodes[store.selectedId] ? store.selectedId : store.doc.rootId;

  let applied = 0;
  store.act((d) => {
    const result = buildTreeDoc(d, tree, targetId);
    applied = result.count;
    return result.doc;
  });
  if (!applied) throw new Error('未能写入任何节点');
  return applied;
}

/** 纯函数：把 AI 树落到文档上（不改则原样返回） */
function buildTreeDoc(doc: MindMapDocument, tree: AITree, targetId: string): { doc: MindMapDocument; count: number } {
  const target = doc.nodes[targetId];
  if (!target) return { doc, count: 0 };

  let next: MindMapDocument = doc;
  // 根节点仍是占位文本时，用 AI 给出的中心主题重命名
  if (targetId === doc.rootId && tree.root && isPlaceholderRoot(target.text)) {
    next = updateText(next, doc.rootId, tree.root);
  }

  let count = 0;
  for (const child of tree.children) {
    const appliedDoc = appendSubtree(next, targetId, child);
    if (appliedDoc === next) continue; // 该分支未成功写入
    next = appliedDoc;
    count += countNodes(child);
  }
  return { doc: next, count };
}

/** 递归把子树追加到 parent 下（基于 addChild 纯函数） */
function appendSubtree(doc: MindMapDocument, parentId: string, node: AITreeNode): MindMapDocument {
  const created = addChild(doc, parentId, node.text);
  if (created === doc) return doc;
  // addChild 把新节点追加到 parent.children 末尾
  const parent = created.nodes[parentId];
  const childId = parent.children[parent.children.length - 1];
  let next = created;
  for (const sub of node.children ?? []) {
    next = appendSubtree(next, childId, sub);
  }
  return next;
}

function countNodes(node: AITreeNode): number {
  return 1 + (node.children ?? []).reduce((sum, c) => sum + countNodes(c), 0);
}

/** 选中节点文本；无选中返回空串 */
export function getSelectedNodeText(): string {
  const { doc, selectedId } = useMindMapStore.getState();
  if (!doc || !selectedId) return '';
  return doc.nodes[selectedId]?.text ?? '';
}

/** 当前导图大纲（缩进文本，供 AI 上下文），超长截断 */
export function getOutlineContext(maxLength = 2000): string {
  const { doc } = useMindMapStore.getState();
  if (!doc) return '';
  const lines: string[] = [];
  const walk = (id: string, depth: number) => {
    const node = doc.nodes[id];
    if (!node) return;
    lines.push(`${'  '.repeat(depth)}- ${node.text}`);
  };
  walk(doc.rootId, 0);
  const root = doc.nodes[doc.rootId];
  const stack = (root?.children ?? []).slice().reverse().map((id) => ({ id, depth: 1 }));
  while (stack.length && lines.length < 120) {
    const { id, depth } = stack.pop()!;
    walk(id, depth);
    const node = doc.nodes[id];
    for (const child of (node?.children ?? []).slice().reverse()) {
      stack.push({ id: child, depth: depth + 1 });
    }
  }
  const text = lines.join('\n');
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n…（已省略）` : text;
}
