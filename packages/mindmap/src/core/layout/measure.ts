// 文本测量与换行：计算节点尺寸，支持自动换行与缓存
import type { CanvasOptions, Marker, MindMapDocument, NodeSize, SizeMap, ThemeConfig } from '../../types/mindmap';
import { markerId, markersRowHeight, markersRowWidth } from '../markers/registry';
import { getCanvasOptions } from '../style/canvasOptions';

export const MAX_CONTENT_WIDTH = 400;
export const LINE_HEIGHT_RATIO = 1.4;
export const FONT_FAMILY = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

export type WidthFn = (text: string, font: string) => number;

// 单例 canvas 用于文本测量
let _canvas: HTMLCanvasElement | null = null;
let _ctx: CanvasRenderingContext2D | null = null;

// 生产环境用离屏 canvas 测量；测试注入确定性函数
export function canvasWidthOf(text: string, font: string): number {
  if (!_canvas) {
    _canvas = document.createElement('canvas');
    _ctx = _canvas.getContext('2d');
  }
  if (!_ctx) return text.length * 14;
  _ctx.font = font;
  return _ctx.measureText(text).width;
}

export function fontString(
  theme: ThemeConfig,
  fontSize?: number,
  fontWeight?: string,
  fontFamily: string = FONT_FAMILY,
  italic?: boolean,
): string {
  const weight = fontWeight ?? theme.node.fontWeight;
  const size = fontSize ?? theme.node.fontSize;
  const style = italic ? 'italic ' : '';
  return `${style}${weight} ${size}px ${fontFamily}`;
}

export function wrapText(text: string, maxWidth: number, font: string, widthOf: WidthFn): string[] {
  const lines: string[] = [];
  for (const raw of text.split('\n')) {
    if (raw === '' || widthOf(raw, font) <= maxWidth) {
      lines.push(raw);
      continue;
    }
    let cur = '';
    for (const ch of raw) {
      const next = cur + ch;
      if (cur && widthOf(next, font) > maxWidth) {
        lines.push(cur);
        cur = ch === ' ' ? '' : ch;
      } else {
        cur = next;
      }
    }
    lines.push(cur);
  }
  return lines.length ? lines : [''];
}

interface Cached extends NodeSize {
  key: string;
}

const cache = new Map<string, Cached>();

export function clearMeasureCache(): void {
  cache.clear();
}

export interface MeasurableNode {
  text: string;
  style?: {
    fontSize?: number;
    fontWeight?: string;
    fontFamily?: string;
    fixedWidth?: number;
    italic?: boolean;
  };
  /** 节点元数据：标记行占文字左侧宽度，标签胶囊行占节点下方高度（与 MindMapNode 结构对齐） */
  metadata?: { markers?: Marker[]; labels?: string[] };
}

// ---------- 标签胶囊行（节点下方） ----------

export const LABEL_CHIP_FONT = '11px system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
export const LABEL_CHIP_HEIGHT = 18;
export const LABEL_ROW_GAP = 4;
/** 胶囊文字左右的内边距 */
export const LABEL_CHIP_PAD_X = 6;

/** 标签胶囊行的总宽；无标签时为 0 */
export function labelsRowWidth(labels?: string[]): number {
  if (!labels?.length) return 0;
  return (
    labels.reduce(
      (sum, l) => sum + Math.ceil(canvasWidthOf(l, LABEL_CHIP_FONT)) + LABEL_CHIP_PAD_X * 2 + LABEL_ROW_GAP,
      -LABEL_ROW_GAP,
    )
  );
}

export function measureNode(
  node: MeasurableNode,
  theme: ThemeConfig,
  widthOf: WidthFn = canvasWidthOf,
  depth: number = 0,
  canvasOptions?: CanvasOptions,
): NodeSize {
  // 按深度递减字体大小：根节点 +4，一级分支 +2，二级及更深不变
  const fontBonus = depth === 0 ? 4 : depth === 1 ? 2 : 0;
  const fontSize = node.style?.fontSize ?? (theme.node.fontSize + fontBonus);
  const fontWeight = node.style?.fontWeight ?? theme.node.fontWeight;
  const fontFamily = node.style?.fontFamily ?? canvasOptions?.fontFamily ?? FONT_FAMILY;
  const italic = !!node.style?.italic;
  const font = fontString(theme, fontSize, fontWeight, fontFamily, italic);
  const markers = node.metadata?.markers;
  const labels = node.metadata?.labels;
  const markerKey = markers?.length ? markers.map(markerId).join(',') : '';
  const labelKey = labels?.length ? labels.join('¦') : '';
  const key = `${node.text}|${font}|${node.style?.fixedWidth ?? ''}|${italic ? 'i' : ''}|${markerKey}|${labelKey}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const [padX, padY] = theme.node.padding;
  // 标记行显示在文字左侧（对齐 XMind）：占据宽度并等量压缩文字可用宽
  const markersWidth = markersRowWidth(markers);
  const markersHeight = markersRowHeight(markers);
  // 标签胶囊行显示在节点下方（对齐 XMind）：计入节点高度，形状本身不变高
  const labelsExtra = labels?.length ? LABEL_CHIP_HEIGHT + LABEL_ROW_GAP : 0;
  const fixedWidth = node.style?.fixedWidth;
  const maxContentWidth = Math.max(
    1,
    (fixedWidth != null ? fixedWidth - padX * 2 : MAX_CONTENT_WIDTH) - markersWidth,
  );
  const lines = wrapText(node.text, maxContentWidth, font, widthOf);
  const lineHeight = fontSize * LINE_HEIGHT_RATIO;
  const contentWidth = Math.min(
    maxContentWidth,
    Math.max(...lines.map((l) => widthOf(l, font)), 1),
  );
  const size: Cached = {
    key,
    width: fixedWidth != null ? fixedWidth : contentWidth + padX * 2 + markersWidth,
    height: Math.max(lines.length * lineHeight, markersHeight) + padY * 2 + labelsExtra,
    lines,
  };
  if (cache.size > 2000) cache.clear();
  cache.set(key, size);
  return size;
}

export function measureAllNodes(
  doc: MindMapDocument,
  theme: ThemeConfig,
  widthOf: WidthFn = canvasWidthOf,
): SizeMap {
  const depths = computeDepths(doc);
  const canvasOptions = getCanvasOptions(doc);
  return Object.fromEntries(
    Object.values(doc.nodes).map((n) => [
      n.id,
      measureNode(n, theme, widthOf, depths[n.id] ?? 0, canvasOptions),
    ]),
  );
}

/** 计算所有节点的深度（根节点为 0） */
export function computeDepths(doc: MindMapDocument): Record<string, number> {
  const depths: Record<string, number> = {};
  depths[doc.rootId] = 0;
  for (const node of Object.values(doc.nodes)) {
    if (node.id === doc.rootId) continue;
    // 从当前节点向上回溯到根，计算深度
    let d = 0;
    let cur = node;
    while (cur.parentId !== null && cur.parentId !== doc.rootId) {
      d++;
      cur = doc.nodes[cur.parentId];
      if (!cur) break;
    }
    depths[node.id] = cur.parentId === doc.rootId ? d + 1 : d;
  }
  return depths;
}
