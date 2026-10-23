import type { LayoutStructureId, MindMapDocument } from '../../types/mindmap';
import { getPreset } from './presets';
import { layoutBrace } from './strategies/brace';
import { layoutFishbone } from './strategies/fishbone';
import { layoutLogic } from './strategies/logic';
import { layoutMap } from './strategies/map';
import { layoutMatrix } from './strategies/matrix';
import { layoutOrg } from './strategies/org';
import { layoutTimeline } from './strategies/timeline';
import { layoutTree } from './strategies/tree';
import type { LayoutCtx } from './strategies/shared';

export function getStructure(doc: MindMapDocument): LayoutStructureId {
  return getPreset(doc.layout)?.structure ?? 'map-balanced';
}

/** 按文档 structure 调用对应策略 */
export function applyStructure(ctx: LayoutCtx): void {
  const structure = getStructure(ctx.doc);
  switch (structure) {
    case 'map-right':
    case 'map-left':
    case 'map-down':
    case 'map-up':
    case 'map-radial':
    case 'map-balanced':
      layoutMap(ctx, structure);
      return;
    case 'logic-right':
    case 'logic-left':
    case 'logic-down':
    case 'logic-up':
    case 'logic-balanced':
    case 'logic-outline':
      layoutLogic(ctx, structure);
      return;
    case 'org-down':
    case 'org-up':
    case 'org-right':
    case 'org-left':
    case 'org-balanced':
    case 'org-radial':
    case 'org-classic':
      layoutOrg(ctx, structure);
      return;
    case 'tree-right':
    case 'tree-left':
    case 'tree-down':
    case 'tree-up':
    case 'tree-balanced':
    case 'tree-radial':
    case 'tree-wbs':
      layoutTree(ctx, structure);
      return;
    case 'brace-right':
    case 'brace-left':
    case 'brace-balanced':
    case 'brace-down':
    case 'brace-up':
    case 'brace-outline':
      layoutBrace(ctx, structure);
      return;
    case 'timeline-h':
      layoutTimeline(ctx, 'h-alt');
      return;
    case 'timeline-h-top':
      layoutTimeline(ctx, 'h-top');
      return;
    case 'timeline-h-bottom':
      layoutTimeline(ctx, 'h-bottom');
      return;
    case 'timeline-v':
      layoutTimeline(ctx, 'v-alt');
      return;
    case 'timeline-v-left':
      layoutTimeline(ctx, 'v-left');
      return;
    case 'timeline-v-right':
      layoutTimeline(ctx, 'v-right');
      return;
    case 'fishbone-rl':
    case 'fishbone-lr':
    case 'fishbone-bt':
    case 'fishbone-tb':
    case 'fishbone-6m':
    case 'fishbone-6m-effect':
    case 'fishbone-comb':
      layoutFishbone(ctx, structure);
      return;
    case 'matrix-2x2':
    case 'matrix-2x3':
    case 'matrix-3x2':
    case 'matrix-3x3':
    case 'matrix-1x2':
    case 'matrix-1x3':
      layoutMatrix(ctx, structure);
      return;
    default:
      layoutMap(ctx, 'map-balanced');
  }
}
