// *.efm.json 双向转换：完整序列化 MindMapDocument，保留样式/布局/关联等
// 抛错文案经 mindT 多语化（部分路径会经 catch 展示给用户）
import { mindT } from '../../i18n/runtime';
import type { MindMapDocument, MindMapNode } from '../../types/mindmap';
import { newId } from '../../utils/id';

export const EFM_FORMAT = 'eflink-mindmap';
export const EFM_VERSION = 1;
export const EFM_EXTENSION = 'efm.json';

export interface EfmDocumentFile {
  format: typeof EFM_FORMAT;
  version: number;
  document: MindMapDocument;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isMindMapNode(v: unknown): v is MindMapNode {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === 'string' &&
    (v.parentId === null || typeof v.parentId === 'string') &&
    Array.isArray(v.children) &&
    v.children.every((c) => typeof c === 'string') &&
    typeof v.text === 'string'
  );
}

/** 校验并收窄为 MindMapDocument；缺少数组字段时补空数组以兼容历史草稿 */
export function parseMindMapDocument(raw: unknown): MindMapDocument {
  if (!isRecord(raw)) throw new Error(mindT('mind.store.efm.invalidDoc'));
  if (typeof raw.id !== 'string' || !raw.id) throw new Error(mindT('mind.store.efm.missingField', { field: 'id' }));
  if (typeof raw.title !== 'string') throw new Error(mindT('mind.store.efm.missingField', { field: 'title' }));
  if (typeof raw.rootId !== 'string' || !raw.rootId) throw new Error(mindT('mind.store.efm.missingField', { field: 'rootId' }));
  if (typeof raw.themeId !== 'string') throw new Error(mindT('mind.store.efm.missingField', { field: 'themeId' }));
  if (typeof raw.layout !== 'string') throw new Error(mindT('mind.store.efm.missingField', { field: 'layout' }));
  if (!isRecord(raw.nodes)) throw new Error(mindT('mind.store.efm.missingField', { field: 'nodes' }));
  if (!isRecord(raw.viewport)) throw new Error(mindT('mind.store.efm.missingField', { field: 'viewport' }));

  const nodes: Record<string, MindMapNode> = {};
  for (const [key, node] of Object.entries(raw.nodes)) {
    if (!isMindMapNode(node)) throw new Error(mindT('mind.store.efm.invalidNode', { key }));
    nodes[key] = node;
  }
  if (!nodes[raw.rootId]) throw new Error(mindT('mind.store.efm.rootMissing'));

  const viewport = raw.viewport;
  if (
    typeof viewport.x !== 'number' ||
    typeof viewport.y !== 'number' ||
    typeof viewport.scale !== 'number'
  ) {
    throw new Error(mindT('mind.store.efm.invalidViewport'));
  }

  return {
    ...(raw as unknown as MindMapDocument),
    id: raw.id,
    title: raw.title,
    rootId: raw.rootId,
    nodes,
    themeId: raw.themeId,
    layout: raw.layout,
    viewport: { x: viewport.x, y: viewport.y, scale: viewport.scale },
    relations: Array.isArray(raw.relations) ? (raw.relations as MindMapDocument['relations']) : [],
    boundaries: Array.isArray(raw.boundaries)
      ? (raw.boundaries as MindMapDocument['boundaries'])
      : [],
    summaries: Array.isArray(raw.summaries) ? (raw.summaries as MindMapDocument['summaries']) : [],
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

export function exportToEfmJson(doc: MindMapDocument): string {
  const payload: EfmDocumentFile = {
    format: EFM_FORMAT,
    version: EFM_VERSION,
    document: doc,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * 解析 *.efm.json 文本。
 * 支持包装格式 { format, version, document }，也兼容直接导出的 MindMapDocument。
 * 导入时分配新文档 id，避免覆盖本地已有同 id 文档。
 */
export function importFromEfmJson(text: string): MindMapDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(mindT('mind.store.efm.invalidJson'));
  }

  let documentRaw: unknown = parsed;
  if (isRecord(parsed) && parsed.format === EFM_FORMAT && isRecord(parsed.document)) {
    documentRaw = parsed.document;
  } else if (isRecord(parsed) && typeof parsed.format === 'string' && parsed.format !== EFM_FORMAT) {
    throw new Error(mindT('mind.store.efm.unsupportedFormat', { format: String(parsed.format) }));
  }

  const doc = parseMindMapDocument(documentRaw);
  const now = Date.now();
  return { ...doc, id: newId(), updatedAt: now };
}
