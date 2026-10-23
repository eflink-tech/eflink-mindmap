import type { LayoutStructureId } from '../../../types/mindmap';
import { getCanvasOptions } from '../../style/canvasOptions';
import { layoutRadial } from './radial';
import {
  placeRootSide,
  placeRootSideV,
  splitRootSides,
  visibleChildren,
  type LayoutCtx,
} from './shared';

/** map-balanced：按 canvasOptions.balanced 分两侧，否则全右 */
export function layoutMapBalanced(ctx: LayoutCtx): void {
  const { doc, theme } = ctx;
  const kids = visibleChildren(ctx, doc.rootId);
  const rootSize = ctx.sizes[doc.rootId];
  const { left, right } = getCanvasOptions(doc).balanced
    ? splitRootSides(ctx, kids)
    : { left: [] as string[], right: kids };
  placeRootSide(ctx, doc, theme, rootSize, right, 1);
  placeRootSide(ctx, doc, theme, rootSize, left, -1);
}

/** map-right：始终全右，忽略 canvasOptions.balanced 与 metadata.side */
export function layoutMapRight(ctx: LayoutCtx): void {
  const { doc, theme } = ctx;
  const kids = visibleChildren(ctx, doc.rootId);
  placeRootSide(ctx, doc, theme, ctx.sizes[doc.rootId], kids, 1);
}

function layoutMapSide(ctx: LayoutCtx, dir: 1 | -1): void {
  const { doc, theme } = ctx;
  const kids = visibleChildren(ctx, doc.rootId);
  placeRootSide(ctx, doc, theme, ctx.sizes[doc.rootId], kids, dir);
}

function layoutMapVertical(ctx: LayoutCtx, dir: 1 | -1): void {
  const { doc, theme } = ctx;
  const kids = visibleChildren(ctx, doc.rootId);
  placeRootSideV(ctx, doc, theme, ctx.sizes[doc.rootId], kids, dir);
}

/** 思维导图：双向/左右单向/上下发散/放射 */
export function layoutMap(
  ctx: LayoutCtx,
  structure: LayoutStructureId,
): void {
  switch (structure) {
    case 'map-right':
      layoutMapRight(ctx);
      return;
    case 'map-left':
      layoutMapSide(ctx, -1);
      return;
    case 'map-down':
      layoutMapVertical(ctx, 1);
      return;
    case 'map-up':
      layoutMapVertical(ctx, -1);
      return;
    case 'map-radial':
      layoutRadial(ctx);
      return;
    default:
      layoutMapBalanced(ctx);
  }
}
