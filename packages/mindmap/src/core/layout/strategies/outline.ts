import { visibleChildren, type LayoutCtx } from './shared';

/** 每一级的缩进量 */
const INDENT = 28;
/** 相邻两行之间的额外间距 */
const ROW_GAP = 8;

/**
 * 大纲逻辑图：根在顶部，子级按深度逐级缩进、纵向排列，不画连线。
 * 适合把导图当作分条笔记阅读。
 */
export function layoutOutline(ctx: LayoutCtx): void {
  const rootId = ctx.doc.rootId;
  const rootSize = ctx.sizes[rootId];
  const rootBox = ctx.positions[rootId];
  const baseLeft = rootBox.x - rootSize.width / 2;
  let cursor = rootBox.y + rootSize.height / 2 + ctx.vGap;

  const walk = (id: string, depth: number): void => {
    const size = ctx.sizes[id];
    ctx.positions[id] = {
      x: baseLeft + depth * INDENT + size.width / 2,
      y: cursor + size.height / 2,
      width: size.width,
      height: size.height,
    };
    cursor += size.height + ROW_GAP;
    for (const k of visibleChildren(ctx, id)) walk(k, depth + 1);
  };

  for (const k of visibleChildren(ctx, rootId)) walk(k, 1);
}
