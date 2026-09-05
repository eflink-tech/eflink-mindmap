import { getCanvasOptions } from '../../style/canvasOptions';
import {
  placeRootSide,
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
