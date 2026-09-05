// 布局引擎：按 getStructure(doc) 分发到 map / logic / org / tree / brace / timeline / fishbone / matrix 策略
import type {
  Box,
  LayoutResult,
  MindMapDocument,
  SizeMap,
  ThemeConfig,
} from '../../types/mindmap';
import { getCanvasOptions } from '../style/canvasOptions';
import { measureAllNodes, type WidthFn } from './measure';
import { applyStructure } from './structures';
import { makeCtx } from './strategies/shared';

/** 水平间距（对齐 XMind 的紧凑层级距离） */
export const H_GAP = 40;
/** 垂直间距 */
export const V_GAP = 16;

/** 计算包围所有节点的最小矩形（单次遍历） */
function contentBounds(positions: Record<string, Box>): Box {
  const boxes = Object.values(positions);
  if (!boxes.length) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const b of boxes) {
    const l = b.x - b.width / 2, r = b.x + b.width / 2;
    const t = b.y - b.height / 2, bt = b.y + b.height / 2;
    if (l < minX) minX = l;
    if (r > maxX) maxX = r;
    if (t < minY) minY = t;
    if (bt > maxY) maxY = bt;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * 同级等宽：每个父节点的子节点中，无 fixedWidth 的取兄弟最大宽度；
 * 有 fixedWidth 的保持不变（且计入 max 基准）。
 */
function applyUnifySiblingWidth(doc: MindMapDocument, sizes: SizeMap): SizeMap {
  const next: SizeMap = { ...sizes };
  for (const node of Object.values(doc.nodes)) {
    const kids = node.children;
    if (kids.length < 2) continue;
    let maxWidth = 0;
    for (const id of kids) {
      maxWidth = Math.max(maxWidth, next[id].width);
    }
    for (const id of kids) {
      if (doc.nodes[id].style?.fixedWidth == null) {
        next[id] = { ...next[id], width: maxWidth };
      }
    }
  }
  return next;
}

/**
 * 布局整个文档
 * @param doc 思维导图文档
 * @param theme 主题配置
 * @param widthOf 可选的文本宽度测量函数
 * @returns 布局结果（节点位置、连线路径、内容边界）
 */
export function layoutDocument(
  doc: MindMapDocument,
  theme: ThemeConfig,
  widthOf: WidthFn | undefined = undefined,
): LayoutResult {
  const opts = getCanvasOptions(doc);
  const gapScale = opts.compact ? 0.7 : 1;
  const hGap = H_GAP * gapScale;
  const vGap = V_GAP * gapScale;

  let sizes = widthOf
    ? measureAllNodes(doc, theme, widthOf)
    : measureAllNodes(doc, theme);
  if (opts.unifySiblingWidth) {
    sizes = applyUnifySiblingWidth(doc, sizes);
  }

  const ctx = makeCtx(doc, sizes, theme, hGap, vGap);
  const rootSize = sizes[doc.rootId];
  ctx.positions[doc.rootId] = {
    x: 0,
    y: 0,
    width: rootSize.width,
    height: rootSize.height,
  };

  applyStructure(ctx);

  return {
    positions: ctx.positions,
    connectors: ctx.connectors,
    contentBounds: contentBounds(ctx.positions),
  };
}
