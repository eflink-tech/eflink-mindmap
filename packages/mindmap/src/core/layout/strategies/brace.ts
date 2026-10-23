import type { LayoutStructureId } from '../../../types/mindmap';
import { bracePath } from '../../style/connectorStyle';
import { layoutOutline } from './outline';
import {
  placeRootSide,
  placeRootSideV,
  splitRootSides,
  visibleChildren,
  type LayoutCtx,
} from './shared';

/** 括号图：四向/双向 + 缩进大纲，连线统一改为托架路径 */
export function layoutBrace(
  ctx: LayoutCtx,
  structure: LayoutStructureId,
): void {
  if (structure === 'brace-outline') {
    layoutOutline(ctx);
    return;
  }

  const { doc, theme } = ctx;
  const rootSize = ctx.sizes[doc.rootId];
  const kids = visibleChildren(ctx, doc.rootId);

  switch (structure) {
    case 'brace-left':
      placeRootSide(ctx, doc, theme, rootSize, kids, -1);
      break;
    case 'brace-balanced': {
      const { left, right } = splitRootSides(ctx, kids);
      placeRootSide(ctx, doc, theme, rootSize, right, 1);
      placeRootSide(ctx, doc, theme, rootSize, left, -1);
      break;
    }
    case 'brace-down':
      placeRootSideV(ctx, doc, theme, rootSize, kids, 1);
      break;
    case 'brace-up':
      placeRootSideV(ctx, doc, theme, rootSize, kids, -1);
      break;
    default:
      placeRootSide(ctx, doc, theme, rootSize, kids, 1);
  }

  for (const c of ctx.connectors) {
    const from = ctx.positions[c.from];
    const to = ctx.positions[c.to];
    if (!from || !to) continue;
    c.d = bracePath(from, to, c.dir ?? 'right');
  }
}
