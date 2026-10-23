import { branchColorOf } from '../../style/apply';
import { elbowPath } from '../../style/connectorStyle';
import { visibleChildren, type LayoutCtx } from './shared';

/** 每深一级的缩进 */
const INDENT = 32;
/** 同级行距 */
const ROW_GAP = 10;
/** 一级分支列间距 */
const COLUMN_GAP = 72;

/** WBS 列宽：本列最深节点的缩进 + 文本宽 */
function columnWidth(ctx: LayoutCtx, id: string, depth: number): number {
  let max = depth * INDENT + ctx.sizes[id].width;
  for (const k of visibleChildren(ctx, id)) {
    max = Math.max(max, columnWidth(ctx, k, depth + 1));
  }
  return max;
}

/**
 * 列内纵向排列：节点左对齐并逐级缩进，子级依次向下排，
 * 父节点左侧拉竖脊、横向臂连到每个子节点。
 */
function placeColumn(
  ctx: LayoutCtx,
  id: string,
  columnLeft: number,
  depth: number,
  top: number,
  color: string,
): number {
  const size = ctx.sizes[id];
  const box = {
    x: columnLeft + depth * INDENT + size.width / 2,
    y: top + size.height / 2,
    width: size.width,
    height: size.height,
  };
  ctx.positions[id] = box;
  let cursor = top + size.height + ROW_GAP;
  const left = box.x - box.width / 2;
  const bottom = box.y + box.height / 2;
  const spineX = left + 6;

  for (const k of visibleChildren(ctx, id)) {
    const childColor =
      ctx.doc.nodes[id].parentId === null
        ? branchColorOf(ctx.doc, ctx.theme, k)
        : color;
    cursor = placeColumn(ctx, k, columnLeft, depth + 1, cursor, childColor);
    const childBox = ctx.positions[k];
    const childLeft = childBox.x - childBox.width / 2;
    ctx.connectors.push({
      id: `${id}->${k}`,
      from: id,
      to: k,
      d: `M ${spineX} ${bottom} L ${spineX} ${childBox.y} L ${childLeft} ${childBox.y}`,
      color: childColor,
      dir: 'down',
    });
  }
  return cursor;
}

/** WBS 分解：根下横向分列，每列纵向缩进堆叠 */
export function layoutWbs(ctx: LayoutCtx): void {
  const { doc, theme } = ctx;
  const rootId = doc.rootId;
  const rootBox = ctx.positions[rootId];
  const kids = visibleChildren(ctx, rootId);
  if (!kids.length) return;

  const widths = kids.map((k) => columnWidth(ctx, k, 0));
  const total =
    widths.reduce((a, b) => a + b, 0) + COLUMN_GAP * (kids.length - 1);
  let left = -total / 2;
  const top = rootBox.y + rootBox.height / 2 + ctx.vGap * 2;

  kids.forEach((k, i) => {
    const color = branchColorOf(doc, theme, k);
    placeColumn(ctx, k, left, 0, top, color);
    ctx.connectors.push({
      id: `${rootId}->${k}`,
      from: rootId,
      to: k,
      d: elbowPath(rootBox, ctx.positions[k], 'down'),
      color,
      dir: 'down',
    });
    left += widths[i] + COLUMN_GAP;
  });
}
