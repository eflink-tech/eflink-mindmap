// FreeMind / Freeplane .mm 导出：层级、备注、链接、折叠、一级左右分侧、内置图标、
// 字体/连线样式与连线（arrowlink）尽量保真；字段与本项目 FreeMind 导入器对称。
import type { Marker, MindMapDocument, MindMapNode } from '../../types/mindmap';

function escAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#10;');
}

function escText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function iconOf(marker: Marker): string | null {
  switch (marker.type) {
    case 'priority':
      return `full-${marker.level}`;
    case 'task':
      return marker.state === 'done' ? 'button_ok' : null;
    case 'flag':
    case 'star':
    case 'people':
      return `${marker.type}-${marker.color}`;
    default:
      return null;
  }
}

const EDGE_STYLE: Record<string, string> = {
  curve: 'bezier',
  straight: 'linear',
  elbow: 'sharp',
};

interface Ctx {
  doc: MindMapDocument;
  /** 文档节点 id → FreeMind 节点 ID（arrowlink 目标用） */
  ids: Map<string, string>;
  counter: number;
}

function nodeId(ctx: Ctx, id: string): string {
  const existing = ctx.ids.get(id);
  if (existing) return existing;
  ctx.counter += 1;
  const generated = `n${ctx.counter}`;
  ctx.ids.set(id, generated);
  return generated;
}

function nodeXml(ctx: Ctx, node: MindMapNode, depth: number, indent: string): string {
  const attrs = [`ID="${nodeId(ctx, node.id)}"`, `TEXT="${escAttr(node.text)}"`];
  if (depth === 1 && node.metadata?.side) attrs.push(`POSITION="${node.metadata.side}"`);
  if (node.metadata?.collapsed) attrs.push('FOLDED="true"');
  if (node.metadata?.link) attrs.push(`LINK="${escAttr(node.metadata.link)}"`);
  if (node.style?.textColor) attrs.push(`COLOR="${escAttr(node.style.textColor)}"`);
  if (node.style?.fillColor) attrs.push(`BACKGROUND_COLOR="${escAttr(node.style.fillColor)}"`);

  const children = node.children
    .map((id) => ctx.doc.nodes[id])
    .filter((child): child is MindMapNode => Boolean(child));
  const arrows = ctx.doc.relations.filter((relation) => relation.from === node.id);
  const icons = (node.metadata?.markers ?? []).map(iconOf).filter((id): id is string => Boolean(id));

  const inner: { indent: string; text: string }[] = [];
  if (node.metadata?.note) {
    inner.push({
      indent: `${indent}  `,
      text: `<richcontent TYPE="NOTE"><html><head></head><body><p>${escText(node.metadata.note)}</p></body></html></richcontent>`,
    });
  }
  for (const icon of icons) inner.push({ indent: `${indent}  `, text: `<icon BUILTIN="${icon}"/>` });
  if (node.style?.connectorColor || node.style?.connectorWidth !== undefined || node.style?.connectorType) {
    const edgeAttrs: string[] = [];
    if (node.style.connectorType && EDGE_STYLE[node.style.connectorType]) {
      edgeAttrs.push(`STYLE="${EDGE_STYLE[node.style.connectorType]}"`);
    }
    if (node.style.connectorColor) edgeAttrs.push(`COLOR="${escAttr(node.style.connectorColor)}"`);
    if (node.style.connectorWidth !== undefined) edgeAttrs.push(`WIDTH="${node.style.connectorWidth}"`);
    inner.push({ indent: `${indent}  `, text: `<edge ${edgeAttrs.join(' ')}/>` });
  }
  if (
    node.style?.fontSize ||
    node.style?.fontWeight === 'bold' ||
    node.style?.italic ||
    node.style?.fontFamily
  ) {
    const fontAttrs: string[] = [];
    if (node.style.fontSize) fontAttrs.push(`SIZE="${Math.round(node.style.fontSize * 0.75)}"`);
    if (node.style.fontWeight === 'bold') fontAttrs.push('BOLD="true"');
    if (node.style.italic) fontAttrs.push('ITALIC="true"');
    if (node.style.fontFamily) fontAttrs.push(`NAME="${escAttr(node.style.fontFamily)}"`);
    inner.push({ indent: `${indent}  `, text: `<font ${fontAttrs.join(' ')}/>` });
  }
  for (const relation of arrows) {
    // 目标节点必须在 ids 中：先登记全部节点再写 XML
    const dest = ctx.ids.get(relation.to);
    if (!dest) continue;
    const label = relation.label ? ` MIDDLE_LABEL="${escAttr(relation.label)}"` : '';
    inner.push({ indent: `${indent}  `, text: `<arrowlink DESTINATION="${dest}"${label}/>` });
  }
  for (const child of children) inner.push({ indent: `${indent}  `, text: nodeXml(ctx, child, depth + 1, `${indent}  `) });

  if (!inner.length) return `${indent}<node ${attrs.join(' ')}/>`;
  const body = inner.map((line) => line.text).join('\n');
  return `${indent}<node ${attrs.join(' ')}>\n${body}\n${indent}</node>`;
}

export function exportToFreeMind(doc: MindMapDocument): string {
  const ctx: Ctx = { doc, ids: new Map(), counter: 0 };
  // 先为所有节点分配 ID，arrowlink 可引用尚未输出的节点
  for (const node of Object.values(doc.nodes)) nodeId(ctx, node.id);
  const root = nodeXml(ctx, doc.nodes[doc.rootId], 0, '');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<map version="1.0.1">\n${root}\n</map>\n`;
}
