import type { Box } from '../../../types/mindmap';
import { branchColorOf } from '../../style/apply';
import { visibleChildren, type Dir, type LayoutCtx } from './shared';

/** 从 from 中心指向 to 的射线与 from 边框的交点 */
function edgeToward(from: Box, to: Box): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return { x: from.x, y: from.y };
  const tx = dx === 0 ? Infinity : from.width / 2 / Math.abs(dx);
  const ty = dy === 0 ? Infinity : from.height / 2 / Math.abs(dy);
  const t = Math.min(tx, ty);
  return { x: from.x + dx * t, y: from.y + dy * t };
}

function radialPath(from: Box, to: Box): string {
  const a = edgeToward(from, to);
  const b = edgeToward(to, from);
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}

function dirBetween(from: Box, to: Box): Dir {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dy) > Math.abs(dx)) return dy > 0 ? 'down' : 'up';
  return dx >= 0 ? 'right' : 'left';
}

/**
 * 环形/径向布局：根居中，一级分支按叶子权重分配整圈角度，
 * 子级继续瓜分父级角度，按深度逐环向外展开。
 */
export function layoutRadial(ctx: LayoutCtx): void {
  const { doc, theme } = ctx;
  const rootId = doc.rootId;
  const rootBox = ctx.positions[rootId];
  const kids = visibleChildren(ctx, rootId);
  if (!kids.length) return;

  const weights = new Map<string, number>();
  const weightOf = (id: string): number => {
    const hit = weights.get(id);
    if (hit !== undefined) return hit;
    const children = visibleChildren(ctx, id);
    const weight = children.length
      ? children.reduce((sum, k) => sum + weightOf(k), 0)
      : 1;
    weights.set(id, weight);
    return weight;
  };

  const byDepth: string[][] = [];
  const queue: Array<{ id: string; depth: number }> = kids.map((id) => ({
    id,
    depth: 1,
  }));
  for (let i = 0; i < queue.length; i++) {
    const { id, depth } = queue[i];
    (byDepth[depth] ??= []).push(id);
    for (const k of visibleChildren(ctx, id)) {
      queue.push({ id: k, depth: depth + 1 });
    }
  }

  const maxDimAt = (depth: number): number =>
    Math.max(
      0,
      ...(byDepth[depth] ?? []).map((id) =>
        Math.max(ctx.sizes[id].width, ctx.sizes[id].height),
      ),
    );

  const radius: number[] = [0];
  for (let depth = 1; depth < byDepth.length; depth++) {
    const prevDim =
      depth === 1 ? Math.max(rootBox.width, rootBox.height) : maxDimAt(depth - 1);
    const ringDim = maxDimAt(depth);
    let next = radius[depth - 1] + (prevDim + ringDim) / 2 + ctx.hGap;
    // 环周长约束：同一环上所有节点并排也放得下
    const perimeter = (byDepth[depth] ?? []).reduce(
      (sum, id) =>
        sum +
        Math.max(ctx.sizes[id].width, ctx.sizes[id].height) +
        ctx.hGap,
      0,
    );
    next = Math.max(next, perimeter / (2 * Math.PI));
    radius[depth] = next;
  }

  const totalWeight = weightOf(rootId);
  let start = -Math.PI / 2;

  const place = (
    id: string,
    from: number,
    to: number,
    depth: number,
    color: string,
  ): void => {
    const angle = (from + to) / 2;
    const r = radius[depth];
    const size = ctx.sizes[id];
    const box: Box = {
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
      width: size.width,
      height: size.height,
    };
    ctx.positions[id] = box;

    const parentId = doc.nodes[id].parentId;
    if (parentId) {
      const parentBox = ctx.positions[parentId];
      const dir = dirBetween(parentBox, box);
      ctx.connectors.push({
        id: `${parentId}->${id}`,
        from: parentId,
        to: id,
        d: radialPath(parentBox, box),
        color,
        dir,
      });
    }

    const children = visibleChildren(ctx, id);
    if (!children.length) return;
    const ownWeight = weightOf(id);
    let cursor = from;
    for (const k of children) {
      const span = ownWeight ? ((to - from) * weightOf(k)) / ownWeight : 0;
      place(k, cursor, cursor + span, depth + 1, color);
      cursor += span;
    }
  };

  for (const k of kids) {
    const span = (2 * Math.PI * weightOf(k)) / totalWeight;
    place(k, start, start + span, 1, branchColorOf(doc, theme, k));
    start += span;
  }
}
