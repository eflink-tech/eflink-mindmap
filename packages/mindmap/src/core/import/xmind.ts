// XMind 导入：.xmind 本质是 ZIP。
// - XMind 2020+：content.json（sheet.rootTopic 树）
// - XMind 8 及更早：content.xml + styles.xml（topic 树，style-id 引用样式）
// 仅导入第一个画布；结构、文本、笔记、标签、链接、图片、标记、折叠、外框、概要、联系线尽量保真，
// 主题色只取显式节点样式与 theme 角色样式，不强行套用 XMind 主题（画布背景除外）。
import { unzipSync } from 'fflate';
import type { LayoutPresetId, MindMapDocument, NodeShape, NodeStyle } from '../../types/mindmap';
import { mindT } from '../../i18n/runtime';
import { DEFAULT_LAYOUT_PRESET_ID } from '../layout/presets';
import { buildDocumentFromTree, type ImportedTopic } from './document';
import { normalizeMarkers } from './markers';
import { asArray, asNumber, asRecord, asString, colorValue, fontSizeToPx, sizeValue, trimText, type JsonRecord } from './values';
import { directChild, directChildren, directText, htmlToText, parseXml } from './xml';

export interface XmindImportOptions {
  /** 文件名（不含路径），用于在画布无标题时兜底文档标题 */
  fileName?: string;
}

interface ZipArchive {
  entries: Map<string, Uint8Array>;
  lower: Map<string, Uint8Array>;
}

interface SheetModel {
  title?: string;
  structureClass?: string;
  background?: string;
  relationships: { from: string; to: string; label?: string }[];
  root: ImportedTopic;
}

const DECODER = new TextDecoder('utf-8');

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
};

const LAYOUT_FAMILIES = new Set(['map', 'logic', 'org', 'tree', 'timeline', 'fishbone', 'matrix', 'spreadsheet', 'brace']);

/** XMind structureClass → 本编辑器布局预设 */
export function layoutFromStructureClass(structureClass?: string): LayoutPresetId {
  if (!structureClass) return DEFAULT_LAYOUT_PRESET_ID;
  // org-chart 是 XMind 组织结构图的类名，归一为 org 家族；首个 org 是命名空间前缀需跳过
  const tokens = structureClass
    .toLowerCase()
    .split('.')
    .filter(Boolean)
    .map((token) => (token === 'org-chart' ? 'org' : token));
  const start = tokens[0] === 'org' ? 1 : 0;
  const familyIndex = tokens.findIndex((token, index) => index >= start && LAYOUT_FAMILIES.has(token));
  if (familyIndex < 0) return DEFAULT_LAYOUT_PRESET_ID;
  const family = tokens[familyIndex];
  const variant = tokens.slice(familyIndex + 1).join('.');

  switch (family) {
    case 'map':
      if (/clockwise|radial/.test(variant)) return 'map-radial';
      if (variant.includes('right')) return 'map-right-curve';
      if (variant.includes('left')) return 'map-left';
      if (variant.includes('down')) return 'map-down';
      if (variant.includes('up')) return 'map-up';
      return 'map-balanced-curve';
    case 'logic':
      if (variant.includes('left')) return 'logic-left';
      if (variant.includes('down')) return 'logic-down';
      if (variant.includes('up')) return 'logic-up';
      if (variant.includes('balanced')) return 'logic-balanced';
      if (variant.includes('outline')) return 'logic-outline';
      return 'logic-right';
    case 'org':
      if (variant.includes('up')) return 'org-up';
      if (variant.includes('right')) return 'org-right';
      if (variant.includes('left')) return 'org-left';
      if (variant.includes('balanced')) return 'org-balanced';
      if (variant.includes('radial') || variant.includes('clockwise')) return 'org-radial';
      return 'org-down';
    case 'tree':
      if (variant.includes('left')) return 'tree-left';
      if (variant.includes('down')) return 'tree-down';
      if (variant.includes('up')) return 'tree-up';
      if (variant.includes('balanced')) return 'tree-balanced';
      if (variant.includes('radial') || variant.includes('clockwise')) return 'tree-radial';
      if (variant.includes('wbs')) return 'tree-wbs';
      return 'tree-right';
    case 'timeline':
      return variant.includes('vertical') ? 'timeline-v' : 'timeline-h';
    case 'fishbone':
      if (variant.includes('left')) return 'fishbone-reverse';
      if (variant.includes('up')) return 'fishbone-vertical-up';
      if (variant.includes('down')) return 'fishbone-vertical';
      if (variant.includes('comb')) return 'fishbone-comb';
      return 'fishbone-classic';
    case 'matrix':
    case 'spreadsheet':
      return 'matrix-2x2';
    case 'brace':
      return variant.includes('left') ? 'brace-left' : 'brace-right';
    default:
      return DEFAULT_LAYOUT_PRESET_ID;
  }
}

/**
 * 解析 .xmind 文件。仅使用第一个画布（XMind 多画布文档按文件级单图处理）。
 * 解析失败时抛出已本地化的错误信息，可直接展示给用户。
 */
export async function parseXmind(buffer: ArrayBuffer, options: XmindImportOptions = {}): Promise<MindMapDocument> {
  const archive = openArchive(buffer);
  const jsonText = readText(archive, 'content.json');
  const xmlText = readText(archive, 'content.xml');
  const stylesText = readText(archive, 'styles.xml');

  let sheet: SheetModel | null = null;
  let firstError: Error | null = null;
  if (jsonText) {
    try {
      sheet = parseJsonContent(jsonText);
    } catch (error) {
      firstError = error instanceof Error ? error : new Error(mindT('mind.store.xmind.parseFailed'));
    }
  }
  if (!sheet && xmlText) {
    try {
      sheet = parseXmlContent(xmlText, stylesText);
    } catch (error) {
      firstError ??= error instanceof Error ? error : new Error(mindT('mind.store.xmind.parseFailed'));
    }
  }
  if (!sheet) throw firstError ?? new Error(mindT('mind.store.xmind.noContent'));

  return buildDocumentFromTree(
    {
      root: sheet.root,
      title: sheet.title,
      layout: layoutFromStructureClass(sheet.structureClass),
      background: sheet.background,
      relations: sheet.relationships,
    },
    {
      fileName: options.fileName,
      resolveImage: (src) => resolveImage(src, archive),
    },
  );
}

function openArchive(buffer: ArrayBuffer): ZipArchive {
  let raw: Record<string, Uint8Array>;
  try {
    raw = unzipSync(new Uint8Array(buffer));
  } catch {
    throw new Error(mindT('mind.store.xmind.invalidZip'));
  }
  const entries = new Map<string, Uint8Array>();
  const lower = new Map<string, Uint8Array>();
  for (const [name, data] of Object.entries(raw)) {
    const path = normalizeZipPath(name);
    entries.set(path, data);
    lower.set(path.toLowerCase(), data);
  }
  return { entries, lower };
}

function normalizeZipPath(name: string): string {
  return name.replace(/\\/g, '/').replace(/^\.?\//, '');
}

function findEntry(archive: ZipArchive, path: string): Uint8Array | undefined {
  const normalized = normalizeZipPath(path);
  const direct = archive.entries.get(normalized);
  if (direct) return direct;
  const lower = normalized.toLowerCase();
  const exact = archive.lower.get(lower);
  if (exact) return exact;
  // 少数工具会多包一层目录：按后缀兜底
  for (const [name, data] of archive.entries) {
    if (name.toLowerCase().endsWith(`/${lower}`)) return data;
  }
  return undefined;
}

function readText(archive: ZipArchive, path: string): string | null {
  const data = findEntry(archive, path);
  return data ? DECODER.decode(data) : null;
}

// ---------- content.json ----------

function parseJsonContent(text: string): SheetModel | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(mindT('mind.store.xmind.parseFailed'));
  }
  const container = asRecord(raw);
  const sheets = Array.isArray(raw) ? raw : asArray(container?.sheets);
  const candidates = sheets.length ? sheets : raw && typeof raw === 'object' ? [raw] : [];
  for (const candidate of candidates) {
    const record = asRecord(candidate);
    const root = asRecord(record?.rootTopic);
    if (!record || !root) continue;
    return normalizeJsonSheet(record, root);
  }
  return null;
}

function normalizeJsonSheet(sheet: JsonRecord, root: JsonRecord): SheetModel {
  const theme = asRecord(sheet.theme);
  return {
    title: trimText(asString(sheet.title)),
    structureClass: asString(root.structureClass) ?? asString(sheet.structureClass),
    background: themeBackground(theme),
    relationships: normalizeJsonRelationships(sheet.relationships),
    root: normalizeJsonTopic(root, 0, theme),
  };
}

function normalizeJsonTopic(topic: JsonRecord, depth: number, theme: JsonRecord | null): ImportedTopic {
  const childRecord = topic.children;
  const attached = Array.isArray(childRecord) ? childRecord : asArray(asRecord(childRecord)?.attached);
  const detached = Array.isArray(childRecord) ? [] : asArray(asRecord(childRecord)?.detached);
  const children = [...attached, ...detached]
    .map((child) => asRecord(child))
    .filter((child): child is JsonRecord => child !== null)
    .map((child) => normalizeJsonTopic(child, depth + 1, theme));

  const explicitStyle = mapStyleProperties(asRecord(asRecord(topic.style)?.properties) ?? asRecord(topic.style) ?? {});
  const inheritedStyle = themeRoleStyle(theme, depth);
  const style = explicitStyle || inheritedStyle ? { ...inheritedStyle, ...explicitStyle } : undefined;

  const markers = normalizeMarkers(asArray(topic.markers).map((marker) => {
    if (typeof marker === 'string') return marker;
    return asString(asRecord(marker)?.markerId);
  }));

  const imageValue = topic.image;
  const imageSrc = asString(imageValue) ?? asString(asRecord(imageValue)?.src);

  return {
    sourceId: asString(topic.id),
    text: trimText(asString(topic.title)) ?? '',
    children,
    note: jsonNote(topic.notes),
    labels: normalizeLabels(topic.labels),
    markers,
    link: trimText(asString(topic.href)),
    imageSrc: trimText(imageSrc),
    collapsed: topic.branch === 'folded' || topic.folded === true,
    side: sideOf(topic.position),
    style,
    boundaries: normalizeRanges(topic.boundaries).map((boundary) => ({
      start: boundary.range[0],
      end: boundary.range[1],
      title: trimText(asString(boundary.raw.title)),
    })),
    summaries: normalizeRanges(topic.summaries).map((summary) => {
      const summaryTopic = asRecord(summary.raw.topic);
      return {
        start: summary.range[0],
        end: summary.range[1],
        text: trimText(asString(summaryTopic?.title)) ?? trimText(asString(summary.raw.text)) ?? '',
      };
    }),
  };
}

function normalizeJsonRelationships(value: unknown): SheetModel['relationships'] {
  return asArray(value)
    .map((item) => asRecord(item))
    .filter((item): item is JsonRecord => item !== null)
    .map((item) => ({
      from: asString(item.end1Id) ?? asString(item.end1) ?? '',
      to: asString(item.end2Id) ?? asString(item.end2) ?? '',
      label: trimText(asString(item.title)),
    }))
    .filter((item) => item.from && item.to);
}

function jsonNote(value: unknown): string | undefined {
  const notes = asRecord(value);
  if (!notes) return trimText(asString(value));
  const plain = notes.plain;
  const plainText = asString(plain) ?? asString(asRecord(plain)?.content);
  if (trimText(plainText)) return trimText(plainText);
  const html = asString(asRecord(notes.realHTML)?.content) ?? asString(notes.html);
  return trimText(htmlToText(html ?? ''));
}

function normalizeLabels(value: unknown): string[] | undefined {
  const labels = asArray(value)
    .map((label) => (typeof label === 'string' ? label : asString(asRecord(label)?.text)))
    .map((label) => trimText(label))
    .filter((label): label is string => Boolean(label));
  return labels.length ? labels : undefined;
}

function normalizeRanges(value: unknown): { raw: JsonRecord; range: [number, number] }[] {
  return asArray(value)
    .map((item) => asRecord(item))
    .filter((item): item is JsonRecord => item !== null)
    .map((raw) => ({ raw, range: parseRange(raw.range) }))
    .filter((item): item is { raw: JsonRecord; range: [number, number] } => item.range !== null);
}

/** XMind range 为左闭右开，例 "(0,2)" 覆盖子节点 0、1 */
function parseRange(value: unknown): [number, number] | null {
  if (Array.isArray(value) && value.length >= 2) {
    const start = asNumber(value[0]);
    const end = asNumber(value[1]);
    return start !== undefined && end !== undefined ? [start, end] : null;
  }
  if (typeof value === 'string') {
    const match = /\(?\s*(\d+)\s*,\s*(\d+)\s*\)?/.exec(value);
    if (match) return [Number(match[1]), Number(match[2])];
  }
  const record = asRecord(value);
  if (record) {
    const start = asNumber(record.start);
    const end = asNumber(record.end);
    if (start !== undefined && end !== undefined) return [start, end];
  }
  return null;
}

function themeRoleStyle(theme: JsonRecord | null, depth: number): NodeStyle | undefined {
  if (!theme) return undefined;
  const role = depth === 0 ? 'centralTopic' : depth === 1 ? 'mainTopic' : 'subTopic';
  const roleRecord = asRecord(theme[role]);
  if (!roleRecord) return undefined;
  const properties = asRecord(roleRecord.properties) ?? roleRecord;
  return mapStyleProperties(properties);
}

function themeBackground(theme: JsonRecord | null): string | undefined {
  if (!theme) return undefined;
  return colorValue(theme.backgroundColor) ?? colorValue(theme['background-color']);
}

function sideOf(value: unknown): 'left' | 'right' | undefined {
  return value === 'left' || value === 'right' ? value : undefined;
}

// ---------- content.xml（XMind 8） ----------

function parseXmlContent(contentXml: string, stylesXml: string | null): SheetModel | null {
  const dom = parseXml(contentXml, mindT('mind.store.xmind.parseFailed'));
  const sheet =
    directChild(dom.documentElement, 'sheet') ??
    Array.from(dom.getElementsByTagName('sheet'))[0] ??
    null;
  if (!sheet) return null;
  const root = directChild(sheet, 'topic');
  if (!root) return null;
  const styles = parseLegacyStyles(stylesXml);
  return {
    title: trimText(directText(sheet, 'title')),
    structureClass: root.getAttribute('structure-class') ?? undefined,
    relationships: parseLegacyRelationships(sheet),
    root: normalizeXmlTopic(root, styles),
  };
}

function normalizeXmlTopic(topic: Element, styles: Map<string, Record<string, string>>): ImportedTopic {
  const childrenElement = directChild(topic, 'children');
  const children: ImportedTopic[] = [];
  if (childrenElement) {
    for (const topics of directChildren(childrenElement, 'topics')) {
      for (const child of directChildren(topics, 'topic')) {
        children.push(normalizeXmlTopic(child, styles));
      }
    }
  }

  const notesElement = directChild(topic, 'notes');
  const note = notesElement
    ? trimText(directChild(notesElement, 'plain')?.textContent ?? '') ??
      trimText(htmlToText(directChild(notesElement, 'html')?.textContent ?? ''))
    : undefined;

  const labelsElement = directChild(topic, 'labels');
  const labels = labelsElement
    ? directChildren(labelsElement, 'label')
        .map((label) => trimText(label.textContent ?? undefined))
        .filter((label): label is string => Boolean(label))
    : [];

  const markerRefs = directChild(topic, 'marker-refs');
  const markers = normalizeMarkers(
    markerRefs
      ? directChildren(markerRefs, 'marker-ref').map((ref) => ref.getAttribute('marker-id') ?? '')
      : [],
  );

  const styleId = topic.getAttribute('style-id');
  const styleProps = styleId ? styles.get(styleId) : undefined;
  const style = styleProps ? mapStyleProperties(styleProps) : undefined;

  const boundariesElement = directChild(topic, 'boundaries');
  const boundaries = boundariesElement
    ? directChildren(boundariesElement, 'boundary')
        .map((boundary) => ({
          range: parseRange(boundary.getAttribute('range')),
          title:
            trimText(boundary.getAttribute('title') ?? undefined) ??
            trimText(directText(boundary, 'title')),
        }))
        .filter((boundary): boundary is { range: [number, number]; title: string | undefined } => boundary.range !== null)
        .map((boundary) => ({ start: boundary.range[0], end: boundary.range[1], title: boundary.title }))
    : [];

  const summariesElement = directChild(topic, 'summaries');
  const summaries = summariesElement
    ? directChildren(summariesElement, 'summary')
        .map((summary) => {
          const range = parseRange(summary.getAttribute('range'));
          const summaryTopic = directChild(summary, 'topic');
          return {
            range,
            text:
              (summaryTopic ? directText(summaryTopic, 'title') : undefined) ??
              trimText(directText(summary, 'title')),
          };
        })
        .filter((summary): summary is { range: [number, number]; text: string | undefined } => summary.range !== null)
        .map((summary) => ({ start: summary.range[0], end: summary.range[1], text: summary.text ?? '' }))
    : [];

  const imageElement = directChild(topic, 'img');

  return {
    sourceId: topic.getAttribute('id') ?? undefined,
    text: directText(topic, 'title') ?? '',
    children,
    note,
    labels: labels.length ? labels : undefined,
    markers,
    link: trimText(directChild(topic, 'href')?.textContent ?? undefined),
    imageSrc: trimText(imageElement?.getAttribute('src') ?? undefined),
    collapsed: topic.getAttribute('branch') === 'folded' || topic.getAttribute('folded') === 'true',
    style,
    boundaries,
    summaries,
  };
}

function parseLegacyRelationships(sheet: Element): SheetModel['relationships'] {
  const relationships = directChild(sheet, 'relationships');
  if (!relationships) return [];
  return directChildren(relationships, 'relationship')
    .map((relationship) => ({
      from: relationship.getAttribute('end1') ?? relationship.getAttribute('end1Id') ?? '',
      to: relationship.getAttribute('end2') ?? relationship.getAttribute('end2Id') ?? '',
      label:
        trimText(relationship.getAttribute('title') ?? undefined) ??
        trimText(directText(relationship, 'title')),
    }))
    .filter((relationship) => relationship.from && relationship.to);
}

function parseLegacyStyles(stylesXml: string | null): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();
  if (!stylesXml) return map;
  let dom: Document;
  try {
    dom = parseXml(stylesXml, mindT('mind.store.xmind.parseFailed'));
  } catch {
    return map;
  }
  for (const style of Array.from(dom.getElementsByTagName('style'))) {
    const id = style.getAttribute('id');
    if (!id) continue;
    const properties =
      directChild(style, 'topic-properties') ??
      Array.from(style.getElementsByTagName('topic-properties'))[0] ??
      null;
    if (!properties) continue;
    const values: Record<string, string> = {};
    for (const attribute of Array.from(properties.attributes)) values[attribute.name] = attribute.value;
    map.set(id, values);
  }
  return map;
}

// ---------- 样式 ----------

function mapStyleProperties(props: Record<string, unknown>): NodeStyle | undefined {
  const style: NodeStyle = {};
  const fillColor = colorValue(props['svg:fill']);
  if (fillColor) style.fillColor = fillColor;
  const textColor = colorValue(props['fo:color']);
  if (textColor) style.textColor = textColor;
  const borderColor = colorValue(props['border-line-color']);
  if (borderColor) style.borderColor = borderColor;
  const borderWidth = sizeValue(props['border-line-width']);
  if (borderWidth !== undefined && borderWidth >= 0) style.borderWidth = borderWidth;
  const borderPattern = asString(props['border-line-pattern']);
  if (borderPattern) style.borderStyle = /dash|dot/i.test(borderPattern) ? 'dashed' : 'solid';
  const shape = shapeFromClass(asString(props['shape-class']));
  if (shape) style.shape = shape;
  const fontSize = fontSizeToPx(props['fo:font-size']);
  if (fontSize) style.fontSize = fontSize;
  const fontWeight = asString(props['fo:font-weight']);
  if (fontWeight) style.fontWeight = /bold|[6-9]00/i.test(fontWeight) ? 'bold' : 'normal';
  const fontFamily = trimText(asString(props['fo:font-family']));
  if (fontFamily) style.fontFamily = fontFamily;
  const fontStyle = asString(props['fo:font-style']);
  if (fontStyle) style.italic = /italic|oblique/i.test(fontStyle);
  const decoration = asString(props['fo:text-decoration']);
  if (decoration) {
    if (/underline/i.test(decoration)) style.underline = true;
    if (/line-through/i.test(decoration)) style.strikethrough = true;
  }
  const align = asString(props['fo:text-align']);
  if (align === 'center' || align === 'right' || align === 'left') style.textAlign = align;
  const connectorColor = colorValue(props['line-color']);
  if (connectorColor) style.connectorColor = connectorColor;
  const connectorWidth = sizeValue(props['line-width']);
  if (connectorWidth !== undefined && connectorWidth >= 0) style.connectorWidth = connectorWidth;
  const connectorType = connectorFromClass(asString(props['line-class']));
  if (connectorType) style.connectorType = connectorType;
  return Object.keys(style).length ? style : undefined;
}

function shapeFromClass(className: string | undefined): NodeShape | undefined {
  if (!className) return undefined;
  const tail = className.split('.').pop()?.toLowerCase() ?? '';
  switch (tail) {
    case 'roundedrect':
    case 'roundedrectangle':
      return 'rounded';
    case 'rect':
    case 'rectangle':
      return 'rectangle';
    case 'ellipse':
    case 'circle':
      return 'ellipse';
    case 'hexagon':
      return 'hexagon';
    case 'capsule':
    case 'pill':
      return 'pill';
    default:
      return undefined;
  }
}

function connectorFromClass(className: string | undefined): NodeStyle['connectorType'] {
  if (!className) return undefined;
  const tail = className.split('.').pop()?.toLowerCase() ?? '';
  if (/curve/.test(tail)) return 'curve';
  if (/straight|line/.test(tail)) return 'straight';
  if (/elbow|broken/.test(tail)) return 'elbow';
  if (/brace/.test(tail)) return 'brace';
  return undefined;
}

// ---------- 图片资源 ----------

function resolveImage(src: string, archive: ZipArchive): string | undefined {
  if (/^(data:|https?:|blob:)/i.test(src)) return src;
  let path = src.replace(/^xap:/i, '').replace(/^\/+/, '');
  try {
    path = decodeURIComponent(path);
  } catch {
    // 保留原路径
  }
  const data = findEntry(archive, path);
  if (!data) return undefined;
  const extension = path.split('.').pop()?.toLowerCase() ?? '';
  const mime = MIME_BY_EXT[extension] ?? 'application/octet-stream';
  return `data:${mime};base64,${bytesToBase64(data)}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}
