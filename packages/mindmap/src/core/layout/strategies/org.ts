import type { LayoutStructureId } from '../../../types/mindmap';
import { roundedElbowPath } from '../../style/connectorStyle';
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
    case 'org-classic': {
      // 经典组织架构层级间距更大，正交总线与竖向短干才看得清
      layoutFlow({ ...ctx, vGap: Math.max(ctx.vGap, 48) }, 'down');
      for (const c of ctx.connectors) {
        const from = ctx.positions[c.from];
        const to = ctx.positions[c.to];
        if (from && to) c.d = roundedElbowPath(from, to, c.dir ?? 'down');
      }
      return;
    }
    default:
      layoutFlow(ctx, 'down');
  }
}
