import type { LayoutStructureId } from '../../../types/mindmap';
import { branchColorOf } from '../../style/apply';
import {
  connectorD,
  placeH,
  subtreeSpan,
  visibleChildren,
  type Dir,
  type LayoutCtx,
} from './shared';

const CELL_PAD_X = 14;
const CELL_PAD_Y = 12;
const MIN_CELL_W = 96;
const MIN_CELL_H = 48;

/** 除 2x2 外的矩阵栅格尺寸 */
const GRID_SIZE: Partial<Record<LayoutStructureId, [number, number]>> = {
  'matrix-2x3': [2, 3],
  'matrix-3x2': [3, 2],
  'matrix-3x3': [3, 3],
  'matrix-1x2': [1, 2],
  'matrix-1x3': [1, 3],
};

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

/**
 * 通用矩阵栅格：根作为标题，一级分支按行优先填入 rows×cols。
 * header='top' 时根居中置顶；header='left' 时根作为左栏标题、栅格垂直居中。
 * 单元格内一级节点继续向右展开子树，列宽/行高按内容取最大值。
 */
export function layoutMatrixGrid(
  ctx: LayoutCtx,
  rows: number,
  cols: number,
  header: 'top' | 'left' = 'top',
): void {
  const { doc, theme } = ctx;
  const root = ctx.positions[doc.rootId];
  const kids = visibleChildren(ctx, doc.rootId);
  if (!kids.length) return;

  const actualRows = Math.max(rows, Math.ceil(kids.length / cols));
  const colWidth = Array.from({ length: cols }, () => MIN_CELL_W);
  const rowHeight = Array.from({ length: actualRows }, () => MIN_CELL_H);

  kids.forEach((k, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    colWidth[c] = Math.max(
      colWidth[c],
      logicRightWidth(ctx, k) + CELL_PAD_X * 2,
    );
    rowHeight[r] = Math.max(
      rowHeight[r],
      subtreeSpan(ctx, k, 'v') + CELL_PAD_Y * 2,
    );
  });

  const totalWidth =
    colWidth.reduce((a, b) => a + b, 0) + ctx.hGap * (cols - 1);
  const totalHeight =
    rowHeight.reduce((a, b) => a + b, 0) + ctx.vGap * (actualRows - 1);
  const left =
    header === 'left'
      ? root.x + root.width / 2 + ctx.hGap
      : root.x - totalWidth / 2;
  const top =
    header === 'left'
      ? root.y - totalHeight / 2
      : root.y + root.height / 2 + ctx.vGap;

  kids.forEach((k, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const cellLeft =
      left + colWidth.slice(0, c).reduce((a, b) => a + b, 0) + ctx.hGap * c;
    const rowTop =
      top + rowHeight.slice(0, r).reduce((a, b) => a + b, 0) + ctx.vGap * r;
    placeH(
      ctx,
      k,
      cellLeft + CELL_PAD_X,
      rowTop + rowHeight[r] / 2,
      1,
      branchColorOf(doc, theme, k),
    );
  });
}

/**
 * 3×3 九宫格：根居中，一级分支在左右两侧各排最多三行，子树向外展开。
 * 超过 6 个一级分支时退回根置顶的 3 列栅格。
 */
export function layoutMatrixCenter(ctx: LayoutCtx): void {
  const { doc, theme } = ctx;
  const root = ctx.positions[doc.rootId];
  const kids = visibleChildren(ctx, doc.rootId);
  if (kids.length > 6) {
    layoutMatrixGrid(ctx, 3, 3);
    return;
  }
  if (!kids.length) return;

  const mid = Math.ceil(kids.length / 2);
  const left = kids.slice(0, mid);
  const right = kids.slice(mid);
  const rows = Math.max(left.length, right.length);
  const rowH = Array.from({ length: rows }, (_, r) =>
    Math.max(
      left[r] ? subtreeSpan(ctx, left[r], 'v') : 0,
      right[r] ? subtreeSpan(ctx, right[r], 'v') : 0,
      MIN_CELL_H,
    ),
  );
  const totalH =
    rowH.reduce((a, b) => a + b, 0) + ctx.vGap * (rows - 1);
  const top = root.y - totalH / 2;

  const placeSide = (list: string[], sx: 1 | -1) => {
    const edgeX =
      sx === 1
        ? root.x + root.width / 2 + ctx.hGap
        : root.x - root.width / 2 - ctx.hGap;
    list.forEach((k, r) => {
      const before = rowH.slice(0, r).reduce((a, b) => a + b, 0);
      const centerY = top + before + ctx.vGap * r + rowH[r] / 2;
      const color = branchColorOf(doc, theme, k);
      placeH(ctx, k, edgeX, centerY, sx, color);
      const connDir: Dir = sx === 1 ? 'right' : 'left';
      ctx.connectors.push({
        id: `${doc.rootId}->${k}`,
        from: doc.rootId,
        to: k,
        d: connectorD(root, ctx.positions[k], connDir),
        color,
        dir: connDir,
      });
    });
  };

  placeSide(left, -1);
  placeSide(right, 1);
}

/** 矩阵图分发：2x2 保留根居中的四象限，3x3 根居中，其余走通用栅格 */
export function layoutMatrix(
  ctx: LayoutCtx,
  structure: LayoutStructureId,
): void {
  if (structure === 'matrix-2x2') {
    layoutMatrix2x2(ctx);
    return;
  }
  if (structure === 'matrix-3x3') {
    layoutMatrixCenter(ctx);
    return;
  }
  const size = GRID_SIZE[structure];
  if (!size) {
    layoutMatrix2x2(ctx);
    return;
  }
  const header = structure.startsWith('matrix-1x') ? 'left' : 'top';
  layoutMatrixGrid(ctx, size[0], size[1], header);
}
