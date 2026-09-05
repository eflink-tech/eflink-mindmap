import { placeRootSide, visibleChildren, type LayoutCtx } from './shared';

/** logic-right：所有子节点在根右侧 */
export function layoutLogicRight(ctx: LayoutCtx): void {
  const { doc, theme } = ctx;
  const kids = visibleChildren(ctx, doc.rootId);
  placeRootSide(ctx, doc, theme, ctx.sizes[doc.rootId], kids, 1);
}
