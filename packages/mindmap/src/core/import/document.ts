// 各导入格式共用的树模型与文档构建：统一分配 id、落元数据、处理外框/概要/联系线/标题
import type {
  Boundary,
  LayoutPresetId,
  Marker,
  MindMapDocument,
  MindMapNode,
  NodeMetadata,
  NodeStyle,
  Relation,
  Summary,
} from '../../types/mindmap';
import { newId } from '../../utils/id';
import { translateTitle } from '../../i18n/assetTitles';
import { mindT } from '../../i18n/runtime';
import { DEFAULT_LAYOUT_PRESET_ID } from '../layout/presets';
import { DEFAULT_CANVAS_BACKGROUND, DEFAULT_CANVAS_OPTIONS } from '../style/canvasOptions';
import { colorValue } from './values';

export interface ImportedTopic {
  /** 源文件内的节点 id，用于还原联系线等引用 */
  sourceId?: string;
  text: string;
  children: ImportedTopic[];
  note?: string;
  link?: string;
  imageSrc?: string;
  labels?: string[];
  markers?: Marker[];
  collapsed?: boolean;
  side?: 'left' | 'right';
  style?: NodeStyle;
  /** 索引针对 children，range 为左闭右开（XMind 语义） */
  boundaries?: { start: number; end: number; title?: string }[];
  /** 索引针对 children，range 为左闭右开（XMind 语义） */
  summaries?: { start: number; end: number; text: string }[];
}

export interface ImportedRelation {
  from: string;
  to: string;
  label?: string;
}

export interface ImportedTree {
  root: ImportedTopic;
  title?: string;
  layout?: LayoutPresetId;
  background?: string;
  relations?: ImportedRelation[];
}

export interface BuildDocumentOptions {
  /** 文件名（含扩展名），用于在文件内无标题时兜底文档标题 */
  fileName?: string;
  /** 解析图片引用（如 .xmind 内嵌资源）；未提供或返回空则忽略图片 */
  resolveImage?: (src: string) => string | undefined;
}

export function buildDocumentFromTree(tree: ImportedTree, options: BuildDocumentOptions = {}): MindMapDocument {
  const nodes: Record<string, MindMapNode> = {};
  const idMap = new Map<string, string>();
  const boundaries: Boundary[] = [];
  const summaries: Summary[] = [];
  const now = Date.now();

  const walk = (topic: ImportedTopic, parentId: string | null, depth: number): string => {
    const id = newId();
    if (topic.sourceId) idMap.set(topic.sourceId, id);
    const childIds = topic.children.map((child) => walk(child, id, depth + 1));

    const node: MindMapNode = {
      id,
      parentId,
      children: childIds,
      text: topic.text || translateTitle(depth === 0 ? '中心主题' : '分支主题'),
    };
    if (topic.style) node.style = topic.style;

    const metadata: NodeMetadata = {};
    if (topic.note) metadata.note = topic.note;
    if (topic.labels) metadata.labels = topic.labels;
    if (topic.markers) metadata.markers = topic.markers;
    if (topic.link) metadata.link = topic.link;
    if (topic.collapsed) metadata.collapsed = true;
    if (depth === 1 && topic.side) metadata.side = topic.side;
    if (topic.imageSrc) {
      const image = options.resolveImage ? options.resolveImage(topic.imageSrc) : topic.imageSrc;
      if (image) metadata.image = image;
    }
    if (Object.keys(metadata).length) node.metadata = metadata;
    nodes[id] = node;

    for (const boundary of topic.boundaries ?? []) {
      const memberIds = childIds.slice(clampIndex(boundary.start, childIds.length), clampIndex(boundary.end, childIds.length));
      if (!memberIds.length) continue;
      boundaries.push({ id: newId(), nodeIds: memberIds, title: boundary.title });
    }
    for (const summary of topic.summaries ?? []) {
      const start = clampIndex(summary.start, childIds.length);
      const end = clampIndex(summary.end, childIds.length) - 1;
      if (start > end || start >= childIds.length) continue;
      summaries.push({ id: newId(), parentId: id, range: [start, end], text: summary.text });
    }
    return id;
  };

  const rootId = walk(tree.root, null, 0);

  const relations: Relation[] = [];
  for (const relationship of tree.relations ?? []) {
    const from = idMap.get(relationship.from);
    const to = idMap.get(relationship.to);
    if (!from || !to || from === to) continue;
    relations.push({ id: newId(), from, to, label: relationship.label });
  }

  const fileTitle = fileBaseName(options.fileName);
  const title = fileTitle || tree.title || tree.root.text.trim() || mindT('mind.doc.defaultTitle');
  const doc: MindMapDocument = {
    id: newId(),
    title,
    rootId,
    nodes,
    themeId: 'classic',
    layout: tree.layout ?? DEFAULT_LAYOUT_PRESET_ID,
    viewport: { x: 0, y: 0, scale: 1 },
    relations,
    boundaries,
    summaries,
    createdAt: now,
    updatedAt: now,
  };
  const background = colorValue(tree.background);
  if (background && background.toLowerCase() !== DEFAULT_CANVAS_BACKGROUND.toLowerCase()) {
    doc.canvasOptions = { ...DEFAULT_CANVAS_OPTIONS, background };
  }
  return doc;
}

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(length, Math.trunc(index)));
}

function fileBaseName(fileName?: string): string | undefined {
  if (!fileName) return undefined;
  const base = fileName.split(/[\\/]/).pop() ?? '';
  const withoutExtension = base.replace(/\.[^.]+$/, '');
  return withoutExtension.trim() || undefined;
}
