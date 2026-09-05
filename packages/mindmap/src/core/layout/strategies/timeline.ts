import type { Box } from '../../../types/mindmap';
import { branchColorOf } from '../../style/apply';
import {
  connectorD,
  visibleChildren,
  type Dir,
  type LayoutCtx,
} from './shared';

type Grow = { axis: 'v' | 'h'; dir: 1 | -1 };

function hangConnector(from: Box, to: Box, grow: Grow): { d: string; dir: Dir } {
  if (grow.axis === 'v') {
    const dir: Dir = grow.dir === 1 ? 'down' : 'up';
    return { d: connectorD(from, to, dir), dir };
  }
  const dir: Dir = grow.dir === 1 ? 'right' : 'left';
  return { d: connectorD(from, to, dir), dir };
}

/** 沿生长轴：自身 + gap + 子树之和 */
function stackSpan(ctx: LayoutCtx, id: string, axis: 'v' | 'h'): number {
  const size = ctx.sizes[id];
  const own = axis === 'v' ? size.height : size.width;
  const gap = axis === 'v' ? ctx.vGap : ctx.hGap;
  const kids = visibleChildren(ctx, id);
  if (!kids.length) return own;
  const sum =
    kids.reduce((s, k) => s + stackSpan(ctx, k, axis), 0) + gap * (kids.length - 1);
  return own + gap + sum;
}

/** 垂直于生长轴的厚度：自身与子孙取 max */
function stackThickness(ctx: LayoutCtx, id: string, axis: 'v' | 'h'): number {
  const size = ctx.sizes[id];
  const own = axis === 'v' ? size.width : size.height;
  const kids = visibleChildren(ctx, id);
  return kids.reduce((m, k) => Math.max(m, stackThickness(ctx, k, axis)), own);
}

function hangThickness(ctx: LayoutCtx, id: string, axis: 'v' | 'h'): number {
  const size = ctx.sizes[id];
  const own = axis === 'v' ? size.width : size.height;
  const kids = visibleChildren(ctx, id);
  let even = own;
  let odd = own;
  kids.forEach((k, i) => {
    const t = stackThickness(ctx, k, axis);
    if (i % 2 === 0) even = Math.max(even, t);
    else odd = Math.max(odd, t);
  });
  return Math.max(own, even, odd);
}

function splitEvenOdd(ids: string[]): { even: string[]; odd: string[] } {
  const even: string[] = [];
  const odd: string[] = [];
  ids.forEach((id, i) => (i % 2 === 0 ? even : odd).push(id));
  return { even, odd };
}

function placeStack(
  ctx: LayoutCtx,
  id: string,
  edge: number,
  perpCenter: number,
  grow: Grow,
  color: string,
): void {
  const size = ctx.sizes[id];
  const box: Box =
    grow.axis === 'v'
      ? {
          x: perpCenter,
          y: edge + grow.dir * (size.height / 2),
          width: size.width,
          height: size.height,
        }
      : {
          x: edge + grow.dir * (size.width / 2),
          y: perpCenter,
          width: size.width,
          height: size.height,
        };
  ctx.positions[id] = box;

  const kids = visibleChildren(ctx, id);
  const gap = grow.axis === 'v' ? ctx.vGap : ctx.hGap;
  const own = grow.axis === 'v' ? size.height : size.width;
  let next = (grow.axis === 'v' ? box.y : box.x) + grow.dir * (own / 2 + gap);
  kids.forEach((k) => {
    const childColor = color;
    placeStack(ctx, k, next, perpCenter, grow, childColor);
    const conn = hangConnector(box, ctx.positions[k], grow);
    ctx.connectors.push({
      id: `${id}->${k}`,
      from: id,
      to: k,
      d: conn.d,
      color: childColor,
      dir: conn.dir,
    });
    next += grow.dir * (stackSpan(ctx, k, grow.axis) + gap);
  });
}

function placeHangList(
  ctx: LayoutCtx,
  parentId: string,
  parentBox: Box,
  list: string[],
  grow: Grow,
  color: string,
): void {
  if (!list.length) return;
  const gap = grow.axis === 'v' ? ctx.vGap : ctx.hGap;
  const parentOwn = grow.axis === 'v' ? parentBox.height : parentBox.width;
  const parentCenter = grow.axis === 'v' ? parentBox.y : parentBox.x;
  const perpCenter = grow.axis === 'v' ? parentBox.x : parentBox.y;
  let edge = parentCenter + grow.dir * (parentOwn / 2 + gap);
  list.forEach((k) => {
    placeStack(ctx, k, edge, perpCenter, grow, color);
    const conn = hangConnector(parentBox, ctx.positions[k], grow);
    ctx.connectors.push({
      id: `${parentId}->${k}`,
      from: parentId,
      to: k,
      d: conn.d,
      color,
      dir: conn.dir,
    });
    edge += grow.dir * (stackSpan(ctx, k, grow.axis) + gap);
  });
}

function placeLevel1(
  ctx: LayoutCtx,
  ids: string[],
  axis: 'v' | 'h',
  axisDir: 1,
  hangEven: Grow,
  hangOdd: Grow,
  rootConnDir: Dir,
): void {
  const { doc, theme } = ctx;
  const rootSize = ctx.sizes[doc.rootId];
  const rootBox = ctx.positions[doc.rootId];
  const gap = axis === 'h' ? ctx.hGap : ctx.vGap;
  const rootOwn = axis === 'h' ? rootSize.width : rootSize.height;
  let edge = (axis === 'h' ? rootBox.x : rootBox.y) + axisDir * (rootOwn / 2 + gap);

  ids.forEach((k) => {
    const size = ctx.sizes[k];
    const slot = hangThickness(ctx, k, hangEven.axis);
    const center = edge + axisDir * (slot / 2);
    const box: Box =
      axis === 'h'
        ? { x: center, y: rootBox.y, width: size.width, height: size.height }
        : { x: rootBox.x, y: center, width: size.width, height: size.height };
    ctx.positions[k] = box;
    const color = branchColorOf(doc, theme, k);
    ctx.connectors.push({
      id: `${doc.rootId}->${k}`,
      from: doc.rootId,
      to: k,
      d: connectorD(rootBox, box, rootConnDir),
      color,
      dir: rootConnDir,
    });
    const gk = visibleChildren(ctx, k);
    const { even, odd } = splitEvenOdd(gk);
    placeHangList(ctx, k, box, even, hangEven, color);
    placeHangList(ctx, k, box, odd, hangOdd, color);
    edge += axisDir * (slot + gap);
  });
}

/** timeline-h：一级沿 +x；子女偶上奇下 */
export function layoutTimelineH(ctx: LayoutCtx): void {
  const kids = visibleChildren(ctx, ctx.doc.rootId);
  placeLevel1(
    ctx,
    kids,
    'h',
    1,
    { axis: 'v', dir: -1 },
    { axis: 'v', dir: 1 },
    'right',
  );
}

/** timeline-v：一级沿 +y；子女偶左奇右 */
export function layoutTimelineV(ctx: LayoutCtx): void {
  const kids = visibleChildren(ctx, ctx.doc.rootId);
  placeLevel1(
    ctx,
    kids,
    'v',
    1,
    { axis: 'h', dir: -1 },
    { axis: 'h', dir: 1 },
    'down',
  );
}
