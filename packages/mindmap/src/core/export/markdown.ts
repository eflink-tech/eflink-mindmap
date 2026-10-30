// src/core/export/markdown.ts
// Markdown 双向转换：导出用 # 数量映射深度；导入同时接受标题层级与缩进列表
import type { MindMapDocument, MindMapNode, Marker } from '../../types/mindmap';
import { mindT } from '../../i18n/runtime';
import { createDocument } from '../editor/nodeOps';

interface OutlineEntry {
  depth: number;
  text: string;
  /** 任务复选框：[ ] 未开始，[x] 已完成 */
  done?: boolean;
}

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
  const entries = collectOutline(md);
  const doc = createDocument(entries[0]?.text || mindT('mind.doc.defaultTitle'));
  if (!entries.length) return doc;

  // 确定性 id，避免测试随机性
  let counter = 0;
  const genId = () => `${doc.id}-md${++counter}`;
  const nodes: Record<string, MindMapNode> = { ...doc.nodes };
  const rootId = doc.rootId;

  const first = entries[0];
  const rootMarkers = taskMarkers(first);
  if (rootMarkers) nodes[rootId] = { ...nodes[rootId], metadata: { markers: rootMarkers } };

  // stack: [{ id, level }]，弹栈直到栈顶 level < 当前 level
  const stack: { id: string; level: number }[] = [{ id: rootId, level: first.depth }];
  for (const entry of entries.slice(1)) {
    while (stack.length > 1 && stack[stack.length - 1].level >= entry.depth) stack.pop();
    const parent = stack[stack.length - 1];
    const id = genId();
    const node: MindMapNode = { id, parentId: parent.id, children: [], text: entry.text };
    const markers = taskMarkers(entry);
    if (markers) node.metadata = { markers };
    nodes[id] = node;
    nodes[parent.id] = { ...nodes[parent.id], children: [...nodes[parent.id].children, id] };
    stack.push({ id, level: entry.depth });
  }

  return { ...doc, nodes, updatedAt: Date.now() };
}

function taskMarkers(entry: OutlineEntry | undefined): Marker[] | undefined {
  if (!entry || entry.done === undefined) return undefined;
  return [{ type: 'task', state: entry.done ? 'done' : 'start' }];
}

/**
 * 提取大纲行：标题按 # 数量定深度，列表按缩进层级定深度（2 或 4 空格均可）。
 * 跳过代码块与 front matter，避免其中的 "- " 被误判为节点。
 */
function collectOutline(md: string): OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  const lines = md.split(/\r?\n/);
  let headingBase = 0;
  const indentStack: number[] = [];
  let inFence = false;
  let inFrontMatter = lines[0]?.trim() === '---';
  let index = inFrontMatter ? 1 : 0;

  for (; index < lines.length; index += 1) {
    const line = lines[index].replace(/\t/g, '  ');
    if (inFrontMatter) {
      if (/^(---|\.\.\.)\s*$/.test(line)) inFrontMatter = false;
      continue;
    }
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    // 不限制 # 数量上限，与导出侧 '#'.repeat(depth) 对称，避免深树 round-trip 丢节点
    const heading = /^(#+)\s+(.*\S)\s*$/.exec(line);
    if (heading) {
      headingBase = heading[1].length;
      indentStack.length = 0;
      entries.push({ depth: headingBase, text: heading[2].trim() });
      continue;
    }

    const bullet = /^(\s*)(?:[-*+]|\d+[.)])\s+(.*\S)\s*$/.exec(line);
    if (!bullet) continue;
    const indent = bullet[1].length;
    while (indentStack.length && indent < indentStack[indentStack.length - 1]) indentStack.pop();
    if (!indentStack.length || indent > indentStack[indentStack.length - 1]) indentStack.push(indent);
    const { text, done } = splitCheckbox(bullet[2].trim());
    entries.push({ depth: headingBase + indentStack.length, text, done });
  }
  return entries;
}

function splitCheckbox(text: string): { text: string; done?: boolean } {
  const match = /^\[([ xX])\]\s*(.*)$/.exec(text);
  if (!match) return { text };
  return { text: match[2].trim() || text, done: /x/i.test(match[1]) };
}
