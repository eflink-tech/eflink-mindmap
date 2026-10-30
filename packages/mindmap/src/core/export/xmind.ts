// XMind 2020+ 导出：content.json + metadata.json + manifest.json 打包为 ZIP。
// 结构与样式字段对齐本项目 XMind 导入器（content.json 分支），保证导出后可原样读回；
// 内嵌 data URL 图片写入 resources/ 并以 xap:resources/ 引用。
import { strToU8, zipSync } from 'fflate';
import type { LayoutStructureId, Marker, MindMapDocument, MindMapNode, NodeStyle } from '../../types/mindmap';
import { getPreset } from '../layout/presets';

const LAYOUT_CLASS: Record<LayoutStructureId, string> = {
  'map-balanced': 'org.xmind.ui.map.unbalanced',
  'map-right': 'org.xmind.ui.map.right',
  'map-left': 'org.xmind.ui.map.left',
  'map-down': 'org.xmind.ui.map.down',
  'map-up': 'org.xmind.ui.map.up',
  'map-radial': 'org.xmind.ui.map.clockwise',
  'logic-right': 'org.xmind.ui.logic.right',
  'logic-left': 'org.xmind.ui.logic.left',
  'logic-down': 'org.xmind.ui.logic.down',
  'logic-up': 'org.xmind.ui.logic.up',
  'logic-balanced': 'org.xmind.ui.logic.balanced',
  'logic-outline': 'org.xmind.ui.logic.outline',
  'brace-right': 'org.xmind.ui.brace.right',
  'brace-left': 'org.xmind.ui.brace.left',
  'brace-balanced': 'org.xmind.ui.brace.balanced',
  'brace-down': 'org.xmind.ui.brace.down',
  'brace-up': 'org.xmind.ui.brace.up',
  'brace-outline': 'org.xmind.ui.brace.outline',
  'org-down': 'org.xmind.ui.org-chart.down',
  'org-up': 'org.xmind.ui.org-chart.up',
  'org-right': 'org.xmind.ui.org-chart.right',
  'org-left': 'org.xmind.ui.org-chart.left',
  'org-balanced': 'org.xmind.ui.org-chart.balanced',
  'org-radial': 'org.xmind.ui.org-chart.radial',
  'org-classic': 'org.xmind.ui.org-chart.down',
  'tree-right': 'org.xmind.ui.tree.right',
  'tree-left': 'org.xmind.ui.tree.left',
  'tree-down': 'org.xmind.ui.tree.down',
  'tree-up': 'org.xmind.ui.tree.up',
  'tree-balanced': 'org.xmind.ui.tree.balanced',
  'tree-radial': 'org.xmind.ui.tree.radial',
  'tree-wbs': 'org.xmind.ui.tree.wbs',
  'timeline-h': 'org.xmind.ui.timeline.horizontal',
  'timeline-h-top': 'org.xmind.ui.timeline.horizontal',
  'timeline-h-bottom': 'org.xmind.ui.timeline.horizontal',
  'timeline-v': 'org.xmind.ui.timeline.vertical',
  'timeline-v-left': 'org.xmind.ui.timeline.vertical',
  'timeline-v-right': 'org.xmind.ui.timeline.vertical',
  'fishbone-rl': 'org.xmind.ui.fishbone.leftHeaded',
  'fishbone-lr': 'org.xmind.ui.fishbone.rightHeaded',
  'fishbone-bt': 'org.xmind.ui.fishbone.vertical',
  'fishbone-tb': 'org.xmind.ui.fishbone.vertical',
  'fishbone-6m': 'org.xmind.ui.fishbone.comb',
  'fishbone-6m-effect': 'org.xmind.ui.fishbone.comb',
  'fishbone-comb': 'org.xmind.ui.fishbone.comb',
  'matrix-2x2': 'org.xmind.ui.spreadsheet',
  'matrix-2x3': 'org.xmind.ui.spreadsheet',
  'matrix-3x2': 'org.xmind.ui.spreadsheet',
  'matrix-3x3': 'org.xmind.ui.spreadsheet',
  'matrix-1x2': 'org.xmind.ui.spreadsheet',
  'matrix-1x3': 'org.xmind.ui.spreadsheet',
};

const SHAPE_CLASS: Record<string, string> = {
  rounded: 'org.xmind.ui.roundedRect',
  rectangle: 'org.xmind.ui.rect',
  ellipse: 'org.xmind.ui.ellipse',
  hexagon: 'org.xmind.ui.hexagon',
  pill: 'org.xmind.ui.capsule',
};

const CONNECTOR_CLASS: Record<string, string> = {
  curve: 'org.xmind.ui.curve',
  straight: 'org.xmind.ui.straight',
  elbow: 'org.xmind.ui.elbow',
  brace: 'org.xmind.ui.brace',
};

const TASK_MARKER: Record<string, string> = {
  start: 'task-start',
  p25: 'task-quarter',
  p50: 'task-half',
  p75: 'task-3quarter',
  p100: 'task-full',
  done: 'task-done',
};

function markerIdOf(marker: Marker): string | null {
  switch (marker.type) {
    case 'priority':
      return `priority-${marker.level}`;
    case 'task':
      return TASK_MARKER[marker.state] ?? null;
    case 'flag':
    case 'star':
    case 'people':
      return `${marker.type}-${marker.color}`;
    case 'progress':
      return `task-${marker.percent}`;
    default:
      return null;
  }
}

const DATA_URL = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/;

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
};

function dataUrlBytes(src: string): { data: Uint8Array; ext: string } | null {
  const match = DATA_URL.exec(src);
  if (!match) return null;
  const mime = (match[1] ?? 'image/png').toLowerCase();
  const ext = EXT_BY_MIME[mime] ?? 'png';
  const payload = match[3];
  if (match[2]) {
    const binary = atob(payload);
    const data = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);
    return { data, ext };
  }
  return { data: strToU8(decodeURIComponent(payload)), ext };
}

function styleProperties(style: NodeStyle): Record<string, string> | null {
  const props: Record<string, string> = {};
  if (style.fillColor) props['svg:fill'] = style.fillColor;
  if (style.textColor) props['fo:color'] = style.textColor;
  if (style.borderColor) props['border-line-color'] = style.borderColor;
  if (style.borderWidth !== undefined) props['border-line-width'] = String(style.borderWidth);
  if (style.borderStyle === 'dashed') props['border-line-pattern'] = 'dash';
  if (style.shape) props['shape-class'] = SHAPE_CLASS[style.shape] ?? style.shape;
  // 内部字号为 px，XMind 用 pt：换算后导入器按 96dpi 再乘回 4/3
  if (style.fontSize) props['fo:font-size'] = `${style.fontSize * 0.75}pt`;
  if (style.fontWeight) props['fo:font-weight'] = style.fontWeight === 'bold' ? 'bold' : 'normal';
  if (style.italic) props['fo:font-style'] = 'italic';
  if (style.underline) props['fo:text-decoration'] = 'underline';
  if (style.strikethrough) props['fo:text-decoration'] = 'line-through';
  if (style.textAlign) props['fo:text-align'] = style.textAlign;
  if (style.fontFamily) props['fo:font-family'] = style.fontFamily;
  if (style.connectorColor) props['line-color'] = style.connectorColor;
  if (style.connectorWidth !== undefined) props['line-width'] = String(style.connectorWidth);
  if (style.connectorType) props['line-class'] = CONNECTOR_CLASS[style.connectorType] ?? style.connectorType;
  return Object.keys(props).length ? props : null;
}

interface ExportContext {
  doc: MindMapDocument;
  resources: Map<string, Uint8Array>;
  resourceCounter: number;
}

function imageSource(ctx: ExportContext, src: string): string {
  const parsed = dataUrlBytes(src);
  if (!parsed) return src;
  ctx.resourceCounter += 1;
  const path = `resources/image-${ctx.resourceCounter}.${parsed.ext}`;
  ctx.resources.set(path, parsed.data);
  return `xap:${path}`;
}

/** 节点 id 在父节点 children 中的下标区间（左闭右开） */
function childRange(doc: MindMapDocument, parentId: string, ids: string[]): [number, number] | null {
  const parent = doc.nodes[parentId];
  if (!parent) return null;
  const indexes = ids.map((id) => parent.children.indexOf(id)).filter((i) => i >= 0);
  if (!indexes.length) return null;
  return [Math.min(...indexes), Math.max(...indexes) + 1];
}

function topicJson(ctx: ExportContext, node: MindMapNode): Record<string, unknown> {
  const topic: Record<string, unknown> = {
    id: node.id,
    class: 'topic',
    title: node.text,
  };
  const attached = node.children
    .map((id) => ctx.doc.nodes[id])
    .filter((child): child is MindMapNode => Boolean(child))
    .map((child) => topicJson(ctx, child));
  if (attached.length) topic.children = { attached };

  const markers = (node.metadata?.markers ?? [])
    .map(markerIdOf)
    .filter((id): id is string => Boolean(id))
    .map((markerId) => ({ markerId }));
  if (markers.length) topic.markers = markers;

  if (node.metadata?.note) topic.notes = { plain: { content: node.metadata.note } };
  if (node.metadata?.labels?.length) topic.labels = node.metadata.labels;
  if (node.metadata?.link) topic.href = node.metadata.link;
  if (node.metadata?.image) topic.image = { src: imageSource(ctx, node.metadata.image) };
  if (node.metadata?.collapsed) topic.branch = 'folded';
  if (node.metadata?.side) topic.position = node.metadata.side;

  const style = node.style ? styleProperties(node.style) : null;
  if (style) topic.style = { id: `style-${node.id}`, properties: style };

  // 外框：nodeIds → 子节点下标区间（XMind range 右开）
  const boundaries: Record<string, unknown>[] = [];
  for (const boundary of ctx.doc.boundaries) {
    const parentId = ctx.doc.nodes[boundary.nodeIds[0]]?.parentId;
    if (!parentId || parentId !== node.id) continue;
    // 跨父节点的外框无法用单个区间表达，跳过
    if (boundary.nodeIds.some((id) => ctx.doc.nodes[id]?.parentId !== parentId)) continue;
    const range = childRange(ctx.doc, parentId, boundary.nodeIds);
    if (!range) continue;
    boundaries.push({
      id: boundary.id,
      range: `(${range[0]},${range[1]})`,
      title: boundary.title ?? '',
    });
  }
  if (boundaries.length) topic.boundaries = boundaries;

  const summaries = ctx.doc.summaries
    .filter((summary) => summary.parentId === node.id)
    .map((summary) => ({
      id: summary.id,
      range: `(${summary.range[0]},${summary.range[1] + 1})`,
      topic: { id: `${summary.id}-topic`, title: summary.text },
    }));
  if (summaries.length) topic.summaries = summaries;

  return topic;
}

export function exportToXmind(doc: MindMapDocument): Uint8Array {
  const ctx: ExportContext = { doc, resources: new Map(), resourceCounter: 0 };
  const rootTopic = topicJson(ctx, doc.nodes[doc.rootId]);
  const structure = getPreset(doc.layout)?.structure ?? 'map-balanced';
  rootTopic.structureClass = LAYOUT_CLASS[structure] ?? LAYOUT_CLASS['map-balanced'];

  const sheet = {
    id: doc.id,
    class: 'sheet',
    title: doc.title,
    rootTopic,
    relationships: doc.relations.map((relation) => ({
      id: relation.id,
      end1Id: relation.from,
      end2Id: relation.to,
      ...(relation.label ? { title: relation.label } : {}),
    })),
  };

  const files: Record<string, Uint8Array> = {
    'content.json': strToU8(JSON.stringify([sheet])),
    'metadata.json': strToU8(
      JSON.stringify({ creator: { name: 'DocuLuma', version: '1.0' } }),
    ),
    'manifest.json': strToU8(
      JSON.stringify({
        'file-entries': {
          'content.json': {},
          'metadata.json': {},
          ...Object.fromEntries([...ctx.resources.keys()].map((path) => [path, {}])),
        },
      }),
    ),
  };
  for (const [path, data] of ctx.resources) files[path] = data;
  return zipSync(files);
}
