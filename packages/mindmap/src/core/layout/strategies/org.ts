import type { LayoutStructureId } from '../../../types/mindmap';
import { layoutFlow } from './flow';
import { layoutRadial } from './radial';
import type { LayoutCtx } from './shared';

/** 组织结构图：四向/双向层级 + 环形 */
export function layoutOrg(
  ctx: LayoutCtx,
  structure: LayoutStructureId,
): void {
  switch (structure) {
    case 'org-up':
      layoutFlow(ctx, 'up');
      return;
    case 'org-right':
      layoutFlow(ctx, 'right');
      return;
    case 'org-left':
      layoutFlow(ctx, 'left');
      return;
    case 'org-balanced':
      layoutFlow(ctx, 'balanced');
      return;
    case 'org-radial':
      layoutRadial(ctx);
      return;
    default:
      layoutFlow(ctx, 'down');
  }
}
