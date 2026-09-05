import type { BorderStyle, MindMapDocument, NodeShape, TextAlign, ThemeConfig } from '../../types/mindmap';
import { getCanvasOptions } from './canvasOptions';
import { FONT_FAMILY } from '../layout/measure';

/** sRGB hex → 相对亮度（IEC 61966-2-1） */
export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  if (h.length < 6) return 1;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  if ([r, g, b].some((c) => Number.isNaN(c))) return 1;
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * 彩虹分支可用填充色：排除近白（白底上看不见）与近黑（与中心描边角色冲突）。
 * 对齐 XMind「活力」等方案——色条含白/灰/黑，但一级填充只用红/黄/蓝等可辨色。
 * 过滤后不足 2 色则回退整表，避免色板过窄。
 */
export function fillableBranchColors(branches: string[]): string[] {
  const filtered = branches.filter((c) => {
    const L = relativeLuminance(c);
    return L <= 0.85 && L >= 0.08;
  });
  return filtered.length >= 2 ? filtered : branches.length ? branches : ['#3B82F6'];
}

// 向上找到一级分支，取其索引色；根节点用 primary
export function branchColorOf(
  doc: MindMapDocument,
  theme: ThemeConfig,
  nodeId: string,
): string {
  let cur = doc.nodes[nodeId];
  if (!cur) return theme.colors.primary;
  if (cur.parentId === null) return theme.colors.primary;
  if (!getCanvasOptions(doc).rainbowBranches) return theme.colors.primary;
  let depth = 0;
  // 向上回溯，直到找到父节点是根（即当前节点是一级分支）或当前节点自身是根
  while (cur.parentId !== null && doc.nodes[cur.parentId]?.parentId != null && depth < 100) {
    cur = doc.nodes[cur.parentId]!;
    depth++;
  }
  if (cur.parentId === null) return theme.colors.primary; // 根节点
  // cur 现在是一级分支节点
  const index = doc.nodes[doc.rootId].children.indexOf(cur.id);
  const colors = fillableBranchColors(theme.colors.branches);
  return colors[((index % colors.length) + colors.length) % colors.length] ?? theme.colors.primary;
}

/** sRGB hex → relative luminance; L > 0.30 → dark text */
export function contrastTextColor(hex: string): '#FFFFFF' | '#1E293B' {
  const L = relativeLuminance(hex);
  return L > 0.3 ? '#1E293B' : '#FFFFFF';
}

export interface ResolvedStyle {
  fillColor: string;
  textColor: string;
  borderColor: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  shape: NodeShape;
  borderStyle: BorderStyle;
  borderWidth: number;
  fontFamily: string;
  textAlign: TextAlign;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  fixedWidth?: number;
  handDrawn?: boolean;
  rootDecoration?: 'none' | 'heart' | 'quote';
}

export function resolveNodeStyle(
  doc: MindMapDocument,
  theme: ThemeConfig,
  nodeId: string,
  depth?: number,
): ResolvedStyle {
  const node = doc.nodes[nodeId];
  const defaults = doc.layoutDefaults;
  const isRoot = node.parentId === null;
  const base = branchColorOf(doc, theme, nodeId);
  // 按深度递减字体大小：根节点 +4，一级分支 +2，二级及更深不变
  const fontBonus = isRoot ? 4 : (depth ?? getNodeDepth(doc, nodeId)) === 1 ? 2 : 0;
  const fontSize = node.style?.fontSize ?? (theme.node.fontSize + fontBonus);
  // 二级：浅色背景 + 深色文字；三级及更深：与 XMind 一致，所有深层同一纯文字风格、无背景
  const nodeDepth = isRoot ? 0 : (depth ?? getNodeDepth(doc, nodeId));
  const canvasOptions = getCanvasOptions(doc);

  // XMind 默认变体：深色 primary 作中心描边，填充用白；浅/中 primary 仍作实心填充
  const rootUsesOutline = isRoot && relativeLuminance(theme.colors.primary) < 0.15;

  const fillColor =
    node.style?.fillColor ??
    (isRoot
      ? rootUsesOutline
        ? '#FFFFFF'
        : theme.colors.primary
      : nodeDepth === 1
        ? base
        : nodeDepth === 2
          ? tintColor(base, 0.85)
          : 'transparent');

  const defaultBorder =
    nodeDepth === 2
      ? base
      : rootUsesOutline
        ? theme.colors.primary
        : 'transparent';

  const defaultText =
    nodeDepth >= 2
      ? '#1E293B'
      : fillColor === 'transparent'
        ? '#1E293B'
        : contrastTextColor(fillColor);

  return {
    fillColor,
    textColor: node.style?.textColor ?? defaultText,
    borderColor: node.style?.borderColor ?? defaultBorder,
    fontSize,
    fontWeight: node.style?.fontWeight ?? theme.node.fontWeight,
    shape: node.style?.shape ?? defaults?.shape ?? theme.node.shape,
    borderStyle: node.style?.borderStyle ?? defaults?.borderStyle ?? 'solid',
    borderWidth: node.style?.borderWidth ?? defaults?.borderWidth ?? (rootUsesOutline || nodeDepth === 2 ? 2 : 1),
    fontFamily: node.style?.fontFamily ?? canvasOptions.fontFamily ?? FONT_FAMILY,
    textAlign: node.style?.textAlign ?? 'left',
    italic: node.style?.italic ?? false,
    underline: node.style?.underline ?? false,
    strikethrough: node.style?.strikethrough ?? false,
    fixedWidth: node.style?.fixedWidth,
    handDrawn: defaults?.handDrawn,
    rootDecoration: defaults?.rootDecoration,
  };
}

/** 计算节点深度（根节点为 0） */
function getNodeDepth(doc: MindMapDocument, nodeId: string): number {
  const node = doc.nodes[nodeId];
  if (!node || node.parentId === null) return 0;
  let d = 1;
  let cur = doc.nodes[node.parentId];
  while (cur && cur.parentId !== null) {
    d++;
    cur = doc.nodes[cur.parentId];
  }
  return d;
}

/** 将颜色与白色混合，产生浅色版本 */
function tintColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const tr = Math.round(r + (255 - r) * amount);
  const tg = Math.round(g + (255 - g) * amount);
  const tb = Math.round(b + (255 - b) * amount);
  return `#${tr.toString(16).padStart(2, '0')}${tg.toString(16).padStart(2, '0')}${tb.toString(16).padStart(2, '0')}`;
}
