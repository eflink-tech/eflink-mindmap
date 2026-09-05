// src/core/export/markdown.ts
// Markdown 双向转换：# 数量映射节点深度（根 = 1 个 #）
import type { MindMapDocument, MindMapNode } from '../../types/mindmap';
import { createDocument } from '../editor/nodeOps';

function walk(
  doc: MindMapDocument,
  nodeId: string,
  depth: number,
  lines: string[],
): void {
  const node = doc.nodes[nodeId];
  lines.push(`${'#'.repeat(depth)} ${node.text}`);
  for (const childId of node.children) walk(doc, childId, depth + 1, lines);
}

export function exportToMarkdown(doc: MindMapDocument): string {
  const lines: string[] = [];
  walk(doc, doc.rootId, 1, lines);
  return lines.join('\n') + '\n';
}

export function importFromMarkdown(md: string): MindMapDocument {
  const headings: { level: number; text: string }[] = [];
  for (const line of md.split('\n')) {
    // 不限制 # 数量上限，与导出侧 '#'.repeat(depth) 对称，避免深树 round-trip 丢节点
    const m = /^(#+)\s+(.*)$/.exec(line.trim());
    if (m) headings.push({ level: m[1].length, text: m[2].trim() });
  }

  const doc = createDocument(headings[0]?.text || '思维导图');
  if (!headings.length) return doc;

  // 确定性 id，避免测试随机性
  let counter = 0;
  const genId = () => `${doc.id}-md${++counter}`;
  const nodes: Record<string, MindMapNode> = { ...doc.nodes };
  const rootId = doc.rootId;

  // stack: [{ id, level }]，弹栈直到栈顶 level < 当前 level
  const stack: { id: string; level: number }[] = [{ id: rootId, level: headings[0].level }];
  for (const h of headings.slice(1)) {
    while (stack.length > 1 && stack[stack.length - 1].level >= h.level) stack.pop();
    const parent = stack[stack.length - 1];
    const id = genId();
    nodes[id] = { id, parentId: parent.id, children: [], text: h.text };
    nodes[parent.id] = { ...nodes[parent.id], children: [...nodes[parent.id].children, id] };
    stack.push({ id, level: h.level });
  }

  return { ...doc, nodes, updatedAt: Date.now() };
}
