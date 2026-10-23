import type { LayoutStructureId } from '../../../types/mindmap';
import {
  placeRootSide,
  placeRootSideV,
  splitRootSides,
  visibleChildren,
  type LayoutCtx,
} from './shared';

/** 整棵树的生长方向；balanced 为根居中、一级分支左右分列 */
export type FlowDirection = 'right' | 'left' | 'down' | 'up' | 'balanced';

const FLOW_BY_STRUCTURE: Partial<Record<LayoutStructureId, FlowDirection>> = {
  'logic-right': 'right',
  'logic-left': 'left',
  'logic-down': 'down',
  'logic-up': 'up',
  'logic-balanced': 'balanced',
  'org-down': 'down',
  'org-up': 'up',
  'org-right': 'right',
  'org-left': 'left',
  'org-balanced': 'balanced',
  'tree-right': 'right',
  'tree-left': 'left',
  'tree-down': 'down',
  'tree-up': 'up',
  'tree-balanced': 'balanced',
};

export function flowDirection(
  structure: LayoutStructureId,
): FlowDirection | undefined {
  return FLOW_BY_STRUCTURE[structure];
}

/** 单侧/双向层级布局：一级分支沿指定方向展开，深层沿同方向递归 */
export function layoutFlow(ctx: LayoutCtx, direction: FlowDirection): void {
  const { doc, theme } = ctx;
  const rootSize = ctx.sizes[doc.rootId];
  const kids = visibleChildren(ctx, doc.rootId);
  if (direction === 'balanced') {
    const { left, right } = splitRootSides(ctx, kids);
    placeRootSide(ctx, doc, theme, rootSize, right, 1);
    placeRootSide(ctx, doc, theme, rootSize, left, -1);
    return;
  }
  if (direction === 'right' || direction === 'left') {
    placeRootSide(ctx, doc, theme, rootSize, kids, direction === 'right' ? 1 : -1);
    return;
  }
  placeRootSideV(ctx, doc, theme, rootSize, kids, direction === 'down' ? 1 : -1);
}
