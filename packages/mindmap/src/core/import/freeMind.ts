// FreeMind / Freeplane .mm 导入（单个 XML 文件）
// 保留层级、备注、链接、折叠、左右分侧、内置图标（优先级/任务/旗帜/星星/表情）与基础字体/连线样式。
import type { MindMapDocument, NodeStyle } from '../../types/mindmap';
import { mindT } from '../../i18n/runtime';
import { DEFAULT_LAYOUT_PRESET_ID } from '../layout/presets';
import { buildDocumentFromTree, type ImportedRelation, type ImportedTopic } from './document';
import { normalizeMarkers } from './markers';
import { colorValue, fontSizeToPx, sizeValue, trimText } from './values';
import { directChild, directChildren, htmlToText, parseXml } from './xml';

export interface FreeMindImportOptions {
  /** 文件名（含扩展名），用于文档标题兜底 */
  fileName?: string;
}

export function parseFreeMind(text: string, options: FreeMindImportOptions = {}): MindMapDocument {
  const dom = parseXml(text, mindT('mind.store.freemind.parseFailed'));
  const map = dom.documentElement;
  const rootElement = map?.localName === 'map' ? directChild(map, 'node') : null;
  if (!map || !rootElement) throw new Error(mindT('mind.store.freemind.parseFailed'));

  let counter = 0;
  const nextId = () => `fm-${++counter}`;
  const relations: ImportedRelation[] = [];
  const root = topicFromElement(rootElement, 0, nextId, relations);

  return buildDocumentFromTree(
    { root, layout: layoutFromSides(root), relations },
    { fileName: options.fileName },
  );
}

function topicFromElement(
  element: Element,
  depth: number,
  nextId: () => string,
  relations: ImportedRelation[],
): ImportedTopic {
  const sourceId = element.getAttribute('ID') || nextId();
  const richNode = richContent(element, 'NODE');
  const noteElement = richContent(element, 'NOTE');
  const text = trimText(element.getAttribute('TEXT') ?? undefined) ??
    (richNode ? trimText(htmlToText(richNode.innerHTML)) : undefined) ??
    '';

  const children = directChildren(element, 'node').map((child) =>
    topicFromElement(child, depth + 1, nextId, relations),
  );

  for (const arrow of directChildren(element, 'arrowlink')) {
    const to = arrow.getAttribute('DESTINATION');
    if (!to) continue;
    relations.push({
      from: sourceId,
      to,
      label: trimText(arrow.getAttribute('MIDDLE_LABEL') ?? undefined),
    });
  }

  return {
    sourceId,
    text,
    children,
    note: noteElement ? trimText(htmlToText(noteElement.innerHTML)) : undefined,
    link: trimText(element.getAttribute('LINK') ?? undefined),
    collapsed: element.getAttribute('FOLDED') === 'true',
    side: depth === 1 ? sideOf(element.getAttribute('POSITION')) : undefined,
    markers: normalizeMarkers(iconIds(element).map(freeMindIconId)),
    style: freeMindStyle(element),
  };
}

function richContent(element: Element, type: string): Element | null {
  return directChildren(element, 'richcontent').find((item) => item.getAttribute('TYPE') === type) ?? null;
}

function iconIds(element: Element): string[] {
  return directChildren(element, 'icon')
    .map((icon) => icon.getAttribute('BUILTIN') ?? '')
    .filter(Boolean);
}

/** FreeMind 的 full-1..7 图标即优先级；button_ok 视为已完成 */
function freeMindIconId(raw: string): string {
  const id = raw.trim().toLowerCase();
  const full = /^full-([1-7])$/.exec(id);
  if (full) return `priority-${full[1]}`;
  if (id === 'button_ok') return 'task-done';
  return id;
}

function freeMindStyle(element: Element): NodeStyle | undefined {
  const style: NodeStyle = {};
  const textColor = colorValue(element.getAttribute('COLOR'));
  if (textColor) style.textColor = textColor;
  const fillColor = colorValue(element.getAttribute('BACKGROUND_COLOR'));
  if (fillColor) style.fillColor = fillColor;

  const font = directChild(element, 'font');
  if (font) {
    const size = font.getAttribute('SIZE');
    // FreeMind 的 SIZE 单位为 pt
    const fontSize = size ? fontSizeToPx(`${size}pt`) : undefined;
    if (fontSize) style.fontSize = fontSize;
    if (font.getAttribute('BOLD') === 'true') style.fontWeight = 'bold';
    if (font.getAttribute('ITALIC') === 'true') style.italic = true;
    const family = trimText(font.getAttribute('NAME') ?? undefined);
    if (family) style.fontFamily = family;
  }

  const edge = directChild(element, 'edge');
  if (edge) {
    const color = colorValue(edge.getAttribute('COLOR'));
    if (color) style.connectorColor = color;
    const width = sizeValue(edge.getAttribute('WIDTH'));
    if (width !== undefined && width >= 0) style.connectorWidth = width;
    const connectorType = edgeConnectorType(edge.getAttribute('STYLE'));
    if (connectorType) style.connectorType = connectorType;
  }

  return Object.keys(style).length ? style : undefined;
}

function edgeConnectorType(value: string | null): NodeStyle['connectorType'] {
  switch (value) {
    case 'bezier':
      return 'curve';
    case 'linear':
      return 'straight';
    case 'sharp':
      return 'elbow';
    default:
      return undefined;
  }
}

function sideOf(value: string | null): 'left' | 'right' | undefined {
  return value === 'left' || value === 'right' ? value : undefined;
}

/** 一级分支都在同一侧时选用单侧布局，否则保持双侧思维导图 */
function layoutFromSides(root: ImportedTopic): string {
  const sides = new Set(root.children.map((child) => child.side).filter(Boolean));
  if (sides.size !== 1) return DEFAULT_LAYOUT_PRESET_ID;
  if (sides.has('left')) return 'map-left';
  if (sides.has('right')) return 'map-right-curve';
  return DEFAULT_LAYOUT_PRESET_ID;
}
