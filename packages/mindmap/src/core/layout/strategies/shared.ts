import type {
  Box,
  ConnectorPath,
  MindMapDocument,
  NodeSize,
  SizeMap,
  ThemeConfig,
} from '../../../types/mindmap';
import { branchColorOf } from '../../style/apply';

export type Dir = 'right' | 'left' | 'down' | 'up';

export interface LayoutCtx {
  doc: MindMapDocument;
  sizes: SizeMap;
  theme: ThemeConfig;
  positions: Record<string, Box>;
  connectors: ConnectorPath[];
  heights: Map<string, number>;
  widths: Map<string, number>;
  hGap: number;
  vGap: number;
}

/** 获取可见子节点（折叠则返回空） */
export function visibleChildren(ctx: LayoutCtx, id: string): string[] {
  const node = ctx.doc.nodes[id];
  if (!node || node.metadata?.collapsed) return [];
  return node.children;
}

/** 递归计算子树在某轴上的跨度（带缓存） */
export function subtreeSpan(ctx: LayoutCtx, id: string, axis: 'v' | 'h'): number {
  const memo = axis === 'v' ? ctx.heights : ctx.widths;
  const hit = memo.get(id);
  if (hit !== undefined) return hit;
  const size = ctx.sizes[id];
  const own = axis === 'v' ? size.height : size.width;
  const kids = visibleChildren(ctx, id);
  let span = own;
  if (kids.length) {
    const sum =
      kids.reduce((s, k) => s + subtreeSpan(ctx, k, axis), 0) +
      ctx.vGap * (kids.length - 1);
    span = Math.max(own, sum);
  }
  memo.set(id, span);
  return span;
}

/** 生成连线路径 SVG d 属性 */
export function connectorD(from: Box, to: Box, dir: Dir): string {
  if (dir === 'down' || dir === 'up') {
    const s = dir === 'down' ? 1 : -1;
    const x1 = from.x;
    const y1 = from.y + (s * from.height) / 2;
    const x2 = to.x;
    const y2 = to.y - (s * to.height) / 2;
    const my = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
  }
  const s = dir === 'right' ? 1 : -1;
  const x1 = from.x + (s * from.width) / 2;
  const x2 = to.x - (s * to.width) / 2;
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${x2} ${to.y}`;
}

/** 水平方向放置节点（用于 mindmap 左右分支和 logic 右分支） */
export function placeH(
  ctx: LayoutCtx,
  id: string,
  edgeX: number,
  centerY: number,
  dir: 1 | -1,
  color: string,
): void {
  const size = ctx.sizes[id];
  const x = dir === 1 ? edgeX + size.width / 2 : edgeX - size.width / 2;
  const box: Box = { x, y: centerY, width: size.width, height: size.height };
  ctx.positions[id] = box;

  const kids = visibleChildren(ctx, id);
  const spans = kids.map((k) => subtreeSpan(ctx, k, 'v'));
  const total =
    spans.reduce((a, b) => a + b, 0) + ctx.vGap * (kids.length - 1);
  let y = centerY - total / 2;
  const farEdge = x + (dir * size.width) / 2;
  kids.forEach((k, i) => {
    const childColor =
      ctx.doc.nodes[id].parentId === null
        ? branchColorOf(ctx.doc, ctx.theme, k)
        : color;
    const childEdge = farEdge + dir * ctx.hGap;
    placeH(ctx, k, childEdge, y + spans[i] / 2, dir, childColor);
    const connDir: Dir = dir === 1 ? 'right' : 'left';
    ctx.connectors.push({
      id: `${id}->${k}`,
      from: id,
      to: k,
      d: connectorD(box, ctx.positions[k], connDir),
      color: childColor,
      dir: connDir,
    });
    y += spans[i] + ctx.vGap;
  });
}

/** 垂直方向放置节点（用于 org-down 布局） */
export function placeV(
  ctx: LayoutCtx,
  id: string,
  centerX: number,
  edgeY: number,
  color: string,
): void {
  const size = ctx.sizes[id];
  const box: Box = {
    x: centerX,
    y: edgeY + size.height / 2,
    width: size.width,
    height: size.height,
  };
  ctx.positions[id] = box;

  const kids = visibleChildren(ctx, id);
  const spans = kids.map((k) => subtreeSpan(ctx, k, 'h'));
  const total =
    spans.reduce((a, b) => a + b, 0) + ctx.vGap * (kids.length - 1);
  let x = centerX - total / 2;
  kids.forEach((k, i) => {
    const childColor =
      ctx.doc.nodes[id].parentId === null
        ? branchColorOf(ctx.doc, ctx.theme, k)
        : color;
    placeV(
      ctx,
      k,
      x + spans[i] / 2,
      edgeY + size.height + ctx.vGap,
      childColor,
    );
    ctx.connectors.push({
      id: `${id}->${k}`,
      from: id,
      to: k,
      d: connectorD(box, ctx.positions[k], 'down'),
      color: childColor,
      dir: 'down',
    });
    x += spans[i] + ctx.vGap;
  });
}

/** 将一组子节点放置到根的某一侧 */
export function placeRootSide(
  ctx: LayoutCtx,
  doc: MindMapDocument,
  theme: ThemeConfig,
  rootSize: NodeSize,
  list: string[],
  dir: 1 | -1,
): void {
  const spans = list.map((k) => subtreeSpan(ctx, k, 'v'));
  const total =
    spans.reduce((a, b) => a + b, 0) + ctx.vGap * Math.max(0, list.length - 1);
  let y = -total / 2;
  list.forEach((k, i) => {
    const edge =
      dir === 1
        ? rootSize.width / 2 + ctx.hGap
        : -(rootSize.width / 2 + ctx.hGap);
    placeH(ctx, k, edge, y + spans[i] / 2, dir, branchColorOf(doc, theme, k));
    const connDir: Dir = dir === 1 ? 'right' : 'left';
    ctx.connectors.push({
      id: `${doc.rootId}->${k}`,
      from: doc.rootId,
      to: k,
      d: connectorD(ctx.positions[doc.rootId], ctx.positions[k], connDir),
      color: branchColorOf(doc, theme, k),
      dir: connDir,
    });
    y += spans[i] + ctx.vGap;
  });
}

/**
 * 一级分支分侧：以 metadata.side 的持久化归属为准（新增/移动/粘贴时写入），
 * 缺失的按「少的一侧、平局靠右」补齐。全程不依赖子树尺寸，
 * 编辑文字导致节点变高变宽时不会触发左右重排（对齐 XMind 的稳定分侧）。
 */
export function splitRootSides(
  ctx: LayoutCtx,
  kids: string[],
): { left: string[]; right: string[] } {
  const left: string[] = [];
  const right: string[] = [];
  for (const k of kids) {
    const side = ctx.doc.nodes[k].metadata?.side;
    if (side === 'left') left.push(k);
    else if (side === 'right') right.push(k);
    else if (right.length <= left.length) right.push(k);
    else left.push(k);
  }
  return { left, right };
}

/** 创建布局上下文 */
export function makeCtx(
  doc: MindMapDocument,
  sizes: SizeMap,
  theme: ThemeConfig,
  hGap: number,
  vGap: number,
): LayoutCtx {
  return {
    doc,
    sizes,
    theme,
    positions: {},
    connectors: [],
    heights: new Map(),
    widths: new Map(),
    hGap,
    vGap,
  };
}
