import type { Box } from '../../../types/mindmap';
import { branchColorOf } from '../../style/apply';
import { diagonalPath, fishboneRibPath } from '../../style/connectorStyle';
import { visibleChildren, type LayoutCtx } from './shared';

function ribSign(index: number): 1 | -1 {
  return index % 2 === 0 ? -1 : 1;
}

/** 子树沿斜骨的水平跨度（自身 + 间隙 + 子女之和） */
function ribSpanH(ctx: LayoutCtx, id: string): number {
  const size = ctx.sizes[id];
  const kids = visibleChildren(ctx, id);
  if (!kids.length) return size.width;
  const sum =
    kids.reduce((s, k) => s + ribSpanH(ctx, k), 0) + ctx.hGap * (kids.length - 1);
  return size.width + ctx.hGap + sum;
}

/** 子树沿斜骨的垂直跨度 */
function ribSpanV(ctx: LayoutCtx, id: string): number {
  const size = ctx.sizes[id];
  const kids = visibleChildren(ctx, id);
  if (!kids.length) return size.height;
  const sum =
    kids.reduce((s, k) => s + ribSpanV(ctx, k), 0) + ctx.vGap * (kids.length - 1);
  return size.height + ctx.vGap + sum;
}

/** 沿斜骨向外放置：+x，sy 决定上(-1)/下(+1) */
function placeAlongRib(
  ctx: LayoutCtx,
  id: string,
  nearX: number,
  nearY: number,
  sy: 1 | -1,
  color: string,
): void {
  const size = ctx.sizes[id];
  const box: Box = {
    x: nearX + size.width / 2,
    y: nearY + sy * (size.height / 2),
    width: size.width,
    height: size.height,
  };
  ctx.positions[id] = box;

  const kids = visibleChildren(ctx, id);
  let nextX = box.x + size.width / 2 + ctx.hGap;
  let nextY = box.y + sy * (size.height / 2 + ctx.vGap);
  for (const k of kids) {
    placeAlongRib(ctx, k, nextX, nextY, sy, color);
    ctx.connectors.push({
      id: `${id}->${k}`,
      from: id,
      to: k,
      d: diagonalPath(box, ctx.positions[k], 'right'),
      color,
      dir: 'right',
    });
    nextX += ribSpanH(ctx, k) + ctx.hGap;
    nextY += sy * (ribSpanV(ctx, k) + ctx.vGap);
  }
}

/** fishbone-right：主脊水平向右；一级交替上下斜骨；更深节点沿骨向外 */
export function layoutFishboneRight(ctx: LayoutCtx): void {
  const { doc, theme } = ctx;
  const rootBox = ctx.positions[doc.rootId];
  const kids = visibleChildren(ctx, doc.rootId);
  let edgeX = rootBox.x + rootBox.width / 2 + ctx.hGap;

  kids.forEach((k, i) => {
    const sy = ribSign(i);
    const color = branchColorOf(doc, theme, k);
    placeAlongRib(ctx, k, edgeX, rootBox.y + sy * ctx.vGap, sy, color);
    ctx.connectors.push({
      id: `${doc.rootId}->${k}`,
      from: doc.rootId,
      to: k,
      d: fishboneRibPath(rootBox, ctx.positions[k]),
      color,
      dir: 'right',
    });
    edgeX += ribSpanH(ctx, k) + ctx.hGap;
  });
}
