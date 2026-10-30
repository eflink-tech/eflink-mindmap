// 百度脑图 / KityMinder .km 导入（JSON：root.data.text + children）
// 保留备注、超链接、图片、优先级/进度标记、折叠状态与模板布局。
import type { LayoutPresetId, Marker, MindMapDocument } from '../../types/mindmap';
import { mindT } from '../../i18n/runtime';
import { DEFAULT_LAYOUT_PRESET_ID } from '../layout/presets';
import { buildDocumentFromTree, type ImportedTopic } from './document';
import { asArray, asNumber, asRecord, asString, trimText } from './values';
import { htmlToText } from './xml';

export interface KityMinderImportOptions {
  /** 文件名（含扩展名），用于文档标题兜底 */
  fileName?: string;
}

interface KityNode {
  data?: unknown;
  children?: unknown;
}

export function parseKityMinder(text: string, options: KityMinderImportOptions = {}): MindMapDocument {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(mindT('mind.store.kityminder.parseFailed'));
  }
  const container = asRecord(raw);
  const rootNode = asRecord(container?.root);
  if (!container || !rootNode) throw new Error(mindT('mind.store.kityminder.parseFailed'));

  return buildDocumentFromTree(
    { root: topicFromNode(rootNode), layout: layoutFromTemplate(asString(container.template)) },
    { fileName: options.fileName },
  );
}

function topicFromNode(node: Record<string, unknown>): ImportedTopic {
  const data = asRecord((node as KityNode).data) ?? {};
  const markers: Marker[] = [];

  const priority = asNumber(data.priority);
  if (priority !== undefined && priority > 0) {
    const level = Math.min(7, Math.max(1, Math.round(priority)));
    markers.push({ type: 'priority', level: level as 1 | 2 | 3 | 4 | 5 | 6 | 7 });
  }
  const task = taskFromProgress(asNumber(data.progress));
  if (task) markers.push({ type: 'task', state: task });

  return {
    text: nodeText(asString(data.text)),
    children: asArray((node as KityNode).children)
      .map((child) => asRecord(child))
      .filter((child): child is Record<string, unknown> => child !== null)
      .map((child) => topicFromNode(child)),
    note: trimText(asString(data.note)),
    link: trimText(asString(data.hyperlink)),
    imageSrc: imageSource(asString(data.image)),
    collapsed: data.expandState === 'collapse',
    markers: markers.length ? markers : undefined,
  };
}

function nodeText(value: string | undefined): string {
  const text = trimText(value) ?? '';
  // 部分 .km 把富文本塞进 text；无标签时原样保留，避免误伤 "< 3" 这类文本
  return /<[a-z][\s\S]*>/i.test(text) ? htmlToText(text) : text;
}

function imageSource(value: string | undefined): string | undefined {
  const src = trimText(value);
  if (!src) return undefined;
  return /^(data:|https?:|blob:)/i.test(src) ? src : undefined;
}

/** KityMinder 进度为 1–9（9 视为完成），也兼容直接给 0–100 */
function taskFromProgress(value: number | undefined): 'start' | 'p25' | 'p50' | 'p75' | 'p100' | 'done' | undefined {
  if (value === undefined || value <= 0) return undefined;
  if (value === 9 || value >= 100) return 'done';
  if (value < 9) {
    if (value >= 7) return 'p75';
    if (value >= 5) return 'p50';
    if (value >= 3) return 'p25';
    return 'start';
  }
  if (value >= 75) return 'p75';
  if (value >= 50) return 'p50';
  if (value >= 25) return 'p25';
  return 'start';
}

function layoutFromTemplate(template: string | undefined): LayoutPresetId {
  switch (template?.toLowerCase()) {
    case 'right':
      return 'map-right-curve';
    case 'left':
      return 'map-left';
    case 'down':
      return 'map-down';
    case 'up':
      return 'map-up';
    case 'filetree':
      return 'tree-right';
    case 'fish-bone':
      return 'fishbone-classic';
    case 'tianpan':
      return 'org-radial';
    case 'structure':
      return 'logic-right';
    case 'organization':
      return 'org-down';
    case 'timeline':
      return 'timeline-h';
    default:
      return DEFAULT_LAYOUT_PRESET_ID;
  }
}
