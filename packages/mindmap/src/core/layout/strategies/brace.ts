import { bracePath } from '../../style/connectorStyle';
import { placeRootSide, visibleChildren, type LayoutCtx } from './shared';

/** brace-right：父左子右垂直排列；连线为竖托架 + 水平臂 */
export function layoutBraceRight(ctx: LayoutCtx): void {
  const { doc, theme } = ctx;
  const kids = visibleChildren(ctx, doc.rootId);
  placeRootSide(ctx, doc, theme, ctx.sizes[doc.rootId], kids, 1);
  for (const c of ctx.connectors) {
    const from = ctx.positions[c.from];
    const to = ctx.positions[c.to];
    if (!from || !to) continue;
    c.d = bracePath(from, to, c.dir ?? 'right');
  }
}
