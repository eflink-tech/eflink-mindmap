// OPML 2.0 导出：层级映射为 <outline>，备注/链接写入 _note / _link（与导入器对称）
import type { MindMapDocument, MindMapNode } from '../../types/mindmap';

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function outline(doc: MindMapDocument, node: MindMapNode, indent: string): string {
  const attrs = [`text="${esc(node.text)}"`];
  if (node.metadata?.note) attrs.push(`_note="${esc(node.metadata.note)}"`);
  if (node.metadata?.link) attrs.push(`_link="${esc(node.metadata.link)}"`);
  const open = `${indent}<outline ${attrs.join(' ')}`;
  if (!node.children.length) return `${open}/>`;
  const children = node.children
    .map((id) => doc.nodes[id])
    .filter((child): child is MindMapNode => Boolean(child))
    .map((child) => outline(doc, child, `${indent}  `));
  return `${open}>\n${children.join('\n')}\n${indent}</outline>`;
}

export function exportToOpml(doc: MindMapDocument): string {
  const body = outline(doc, doc.nodes[doc.rootId], '    ');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    '  <head>',
    `    <title>${esc(doc.title)}</title>`,
    `    <dateCreated>${new Date(doc.createdAt).toUTCString()}</dateCreated>`,
    '  </head>',
    '  <body>',
    body,
    '  </body>',
    '</opml>',
    '',
  ].join('\n');
}
