import { branchColorOf } from '../../style/apply';
import {
  connectorD,
  placeV,
  subtreeSpan,
  visibleChildren,
  type LayoutCtx,
} from './shared';

/** org-down：所有子节点在根下方，垂直排列 */
export function layoutOrgDown(ctx: LayoutCtx): void {
  const { doc, theme } = ctx;
  const kids = visibleChildren(ctx, doc.rootId);
  const rootSize = ctx.sizes[doc.rootId];
  const spans = kids.map((k) => subtreeSpan(ctx, k, 'h'));
  const total =
    spans.reduce((a, b) => a + b, 0) + ctx.vGap * Math.max(0, kids.length - 1);
  let x = -total / 2;
  kids.forEach((k, i) => {
    placeV(
      ctx,
      k,
      x + spans[i] / 2,
      rootSize.height / 2 + ctx.vGap,
      branchColorOf(doc, theme, k),
    );
    ctx.connectors.push({
      id: `${doc.rootId}->${k}`,
      from: doc.rootId,
      to: k,
      d: connectorD(ctx.positions[doc.rootId], ctx.positions[k], 'down'),
      color: branchColorOf(doc, theme, k),
      dir: 'down',
    });
    x += spans[i] + ctx.vGap;
  });
}
