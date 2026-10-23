import type { LayoutStructureId } from '../../../types/mindmap';
import { layoutFlow } from './flow';
import { layoutOutline } from './outline';
import type { LayoutCtx } from './shared';

/** 逻辑图：单向/双向层级 + 大纲列表 */
export function layoutLogic(
  ctx: LayoutCtx,
  structure: LayoutStructureId,
): void {
  switch (structure) {
    case 'logic-left':
      layoutFlow(ctx, 'left');
      return;
    case 'logic-down':
      layoutFlow(ctx, 'down');
      return;
    case 'logic-up':
      layoutFlow(ctx, 'up');
      return;
    case 'logic-balanced':
      layoutFlow(ctx, 'balanced');
      return;
    case 'logic-outline':
      layoutOutline(ctx);
      return;
    default:
      layoutFlow(ctx, 'right');
  }
}
