import type { LayoutStructureId, MindMapDocument } from '../../types/mindmap';
import { getPreset } from './presets';
import { layoutBraceRight } from './strategies/brace';
import { layoutFishboneRight } from './strategies/fishbone';
import { layoutLogicRight } from './strategies/logic';
import { layoutMapBalanced, layoutMapRight } from './strategies/map';
import { layoutMatrix2x2 } from './strategies/matrix';
import { layoutOrgDown } from './strategies/org';
import { layoutTimelineH, layoutTimelineV } from './strategies/timeline';
import { layoutTreeRight } from './strategies/tree';
import type { LayoutCtx } from './strategies/shared';

export function getStructure(doc: MindMapDocument): LayoutStructureId {
  return getPreset(doc.layout)?.structure ?? 'map-balanced';
}

/** 按文档 structure 调用对应策略 */
export function applyStructure(ctx: LayoutCtx): void {
  const structure = getStructure(ctx.doc);
  switch (structure) {
    case 'map-right':
      layoutMapRight(ctx);
      return;
    case 'logic-right':
      layoutLogicRight(ctx);
      return;
    case 'org-down':
      layoutOrgDown(ctx);
      return;
    case 'tree-right':
      layoutTreeRight(ctx);
      return;
    case 'brace-right':
      layoutBraceRight(ctx);
      return;
    case 'timeline-h':
      layoutTimelineH(ctx);
      return;
    case 'timeline-v':
      layoutTimelineV(ctx);
      return;
    case 'fishbone-right':
      layoutFishboneRight(ctx);
      return;
    case 'matrix-2x2':
      layoutMatrix2x2(ctx);
      return;
    case 'map-balanced':
    default:
      layoutMapBalanced(ctx);
  }
}
