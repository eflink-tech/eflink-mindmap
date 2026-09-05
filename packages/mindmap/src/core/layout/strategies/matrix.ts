import { branchColorOf } from '../../style/apply';
import {
  connectorD,
  placeH,
  subtreeSpan,
  visibleChildren,
  type Dir,
  type LayoutCtx,
} from './shared';

/** logic-right 子树宽度：自身 + 间隙 + 最宽子树 */
function logicRightWidth(ctx: LayoutCtx, id: string): number {
  const size = ctx.sizes[id];
  const kids = visibleChildren(ctx, id);
  if (!kids.length) return size.width;
  let maxChild = 0;
  for (const k of kids) {
    maxChild = Math.max(maxChild, logicRightWidth(ctx, k));
  }
  return size.width + ctx.hGap + maxChild;
}

/** 0 NW / 1 NE / 2 SW / 3+ SE */
function quadrantSign(index: number): { sx: 1 | -1; sy: 1 | -1 } {
  if (index === 0) return { sx: -1, sy: -1 };
  if (index === 1) return { sx: 1, sy: -1 };
  if (index === 2) return { sx: -1, sy: 1 };
  return { sx: 1, sy: 1 };
}

/** matrix-2x2：根居中；一级最多 4 个入四象限；第 5+ 在 SE 向下堆叠；象限内 logic-right */
export function layoutMatrix2x2(ctx: LayoutCtx): void {
  const { doc, theme } = ctx;
  const root = ctx.positions[doc.rootId];
  const kids = visibleChildren(ctx, doc.rootId);
  let seBottom: number | undefined;

  kids.forEach((k, i) => {
    const { sx, sy } = quadrantSign(i);
    const span = subtreeSpan(ctx, k, 'v');
    const color = branchColorOf(doc, theme, k);

    const edgeX =
      sx === 1
        ? root.x + root.width / 2 + ctx.hGap
        : root.x - root.width / 2 - ctx.hGap - logicRightWidth(ctx, k);

    let centerY: number;
    if (i >= 4) {
      const prevBottom = seBottom ?? root.y + root.height / 2;
      centerY = prevBottom + ctx.vGap + span / 2;
    } else if (sy === -1) {
      centerY = root.y - root.height / 2 - ctx.vGap - span / 2;
    } else {
      centerY = root.y + root.height / 2 + ctx.vGap + span / 2;
    }

    placeH(ctx, k, edgeX, centerY, 1, color);

    const connDir: Dir = sx === 1 ? 'right' : 'left';
    ctx.connectors.push({
      id: `${doc.rootId}->${k}`,
      from: doc.rootId,
      to: k,
      d: connectorD(root, ctx.positions[k], connDir),
      color,
      dir: connDir,
    });

    if (sx === 1 && sy === 1) {
      seBottom = centerY + span / 2;
    }
  });
}
