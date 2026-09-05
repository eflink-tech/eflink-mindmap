import { placeRootSide, visibleChildren, type LayoutCtx } from './shared';

/** tree-right：根在左，子树向右分层；父 y 对齐子树中心 */
export function layoutTreeRight(ctx: LayoutCtx): void {
  const { doc, theme } = ctx;
  const kids = visibleChildren(ctx, doc.rootId);
  placeRootSide(ctx, doc, theme, ctx.sizes[doc.rootId], kids, 1);
}
