// 查找与替换：纯函数，按先序遍历返回命中节点，替换忽略大小写
import type { MindMapDocument } from '../../types/mindmap';

function preorder(doc: MindMapDocument): string[] {
  const out: string[] = [];
  const stack = [doc.rootId];
  while (stack.length) {
    const id = stack.pop()!;
    const node = doc.nodes[id];
    if (!node) continue;
    out.push(id);
    // 逆序入栈保证按 children 顺序出栈
    for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
  }
  return out;
}

/** 文本命中的节点 id（先序，忽略大小写与首尾空白） */
export function searchNodes(doc: MindMapDocument, query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return preorder(doc).filter((id) => doc.nodes[id].text.toLowerCase().includes(q));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 忽略大小写把 text 中的所有 query 替换为 replacement；query 为空时原样返回 */
export function replaceAllText(text: string, query: string, replacement: string): string {
  if (!query) return text;
  return text.replace(new RegExp(escapeRegExp(query), 'gi'), replacement);
}
