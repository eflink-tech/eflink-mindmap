import type { LayoutStructureId } from '../../../types/mindmap';
import { layoutFlow } from './flow';
import { layoutRadial } from './radial';
import type { LayoutCtx } from './shared';

/** 树形图：四向/双向层级 + 环形 */
export function layoutTree(
  ctx: LayoutCtx,
  structure: LayoutStructureId,
): void {
  switch (structure) {
    case 'tree-left':
      layoutFlow(ctx, 'left');
      return;
    case 'tree-down':
      layoutFlow(ctx, 'down');
      return;
    case 'tree-up':
      layoutFlow(ctx, 'up');
      return;
    case 'tree-balanced':
      layoutFlow(ctx, 'balanced');
      return;
    case 'tree-radial':
      layoutRadial(ctx);
      return;
    default:
      layoutFlow(ctx, 'right');
  }
}

/** @deprecated 使用 layoutTree(ctx, structure) */
export function layoutTreeRight(ctx: LayoutCtx): void {
  layoutFlow(ctx, 'right');
}
