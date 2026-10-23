import type { Box, LayoutStructureId, NodeSize } from '../../../types/mindmap';
import { branchColorOf } from '../../style/apply';
import { elbowPath, type ConnectorDir } from '../../style/connectorStyle';
import { visibleChildren, type LayoutCtx } from './shared';

type FishboneStructureId = Extract<LayoutStructureId, `fishbone-${string}`>;

interface FishboneAxis {
  /** 鱼脊（由鱼头指向鱼尾）的单位向量 */
  ux: -1 | 0 | 1;
  uy: -1 | 0 | 1;
  /** 大骨分侧使用的垂直单位向量 */
  px: -1 | 0 | 1;
  py: -1 | 0 | 1;
  /** 6M：一级分支上下（左右）对称分组，而非交替 */
  symmetric: boolean;
  /** 梳状：大骨垂直于鱼脊，无斜角 */
  comb: boolean;
}

const AXES: Record<FishboneStructureId, FishboneAxis> = {
  // 鱼头在右，鱼脊向左
  'fishbone-rl': { ux: -1, uy: 0, px: 0, py: 1, symmetric: false, comb: false },
  // 鱼头在左，鱼脊向右（对策型）
  'fishbone-lr': { ux: 1, uy: 0, px: 0, py: 1, symmetric: false, comb: false },
  // 鱼头在下，鱼脊向上
  'fishbone-bt': { ux: 0, uy: -1, px: 1, py: 0, symmetric: false, comb: false },
  // 鱼头在上，鱼脊向下
  'fishbone-tb': { ux: 0, uy: 1, px: 1, py: 0, symmetric: false, comb: false },
  // 6M：鱼头在右，前三根大骨在上、后三根在下
  'fishbone-6m': { ux: -1, uy: 0, px: 0, py: 1, symmetric: true, comb: false },
  // 6M 因果分析：结构与 6M 对称型一致，预设侧重原因/结果标注
  'fishbone-6m-effect': { ux: -1, uy: 0, px: 0, py: 1, symmetric: true, comb: false },
  // 梳状整理型：鱼头在右，大骨垂直鱼脊
  'fishbone-comb': { ux: -1, uy: 0, px: 0, py: 1, symmetric: false, comb: true },
};

const MIN_RIB_PERP = 64;
const TIP_PAD = 12;
const BASE_PAD = 8;
const SLOT_PAD = 8;
const MIN_START_GAP = 24;

interface SpanCache {
  spanP: Map<string, number>;
  extentU: Map<string, number>;
}

interface BranchSlot {
  id: string;
  side: -1 | 1;
}

interface Attachment {
  id: string;
  /** 距鱼脊的垂直距离 */
  q: number;
  band: number;
}

interface BranchMetrics {
  label: NodeSize;
  labelAlong: number;
  labelPerp: number;
  ribPerp: number;
  ribRun: number;
  tipClear: number;
  midBone: number;
  /** 沿鱼尾方向的最远内容距离（以鱼脊基点为 0） */
  tailExtent: number;
  /** 标签向鱼头方向的溢出距离 */
  headExtent: number;
  attachments: Attachment[];
}

function alongSize(size: NodeSize, axis: FishboneAxis): number {
  return Math.abs(axis.ux) * size.width + Math.abs(axis.uy) * size.height;
}

function perpSize(size: NodeSize, axis: FishboneAxis): number {
  return Math.abs(axis.px) * size.width + Math.abs(axis.py) * size.height;
}

function gapAlong(ctx: LayoutCtx, axis: FishboneAxis): number {
  return axis.ux !== 0 ? ctx.hGap : ctx.vGap;
}

function gapPerp(ctx: LayoutCtx, axis: FishboneAxis): number {
  return axis.px !== 0 ? ctx.hGap : ctx.vGap;
}

/** 中二级及以下子树在分侧轴上的厚度 */
function tailSpanP(
  ctx: LayoutCtx,
  axis: FishboneAxis,
  id: string,
  cache: SpanCache,
): number {
  const hit = cache.spanP.get(id);
  if (hit !== undefined) return hit;
  const own = perpSize(ctx.sizes[id], axis);
  const kids = visibleChildren(ctx, id);
  let span = own;
  if (kids.length) {
    const gap = gapPerp(ctx, axis);
    const sum =
      kids.reduce((s, k) => s + tailSpanP(ctx, axis, k, cache), 0) +
      gap * (kids.length - 1);
    span = Math.max(own, sum);
  }
  cache.spanP.set(id, span);
  return span;
}

/** 中二级及以下子树沿鱼尾方向的总深度（从自身近端到最远后代） */
function tailExtentU(
  ctx: LayoutCtx,
  axis: FishboneAxis,
  id: string,
  cache: SpanCache,
): number {
  const hit = cache.extentU.get(id);
  if (hit !== undefined) return hit;
  const own = alongSize(ctx.sizes[id], axis);
  const kids = visibleChildren(ctx, id);
  const extent = kids.length
    ? own +
      gapAlong(ctx, axis) +
      Math.max(...kids.map((k) => tailExtentU(ctx, axis, k, cache)))
    : own;
  cache.extentU.set(id, extent);
  return extent;
}

/** 一级分支：大骨长度由二级子树厚度决定，中骨平行鱼脊 */
function measureBranch(
  ctx: LayoutCtx,
  axis: FishboneAxis,
  id: string,
  cache: SpanCache,
  sharedRibPerp?: number,
): BranchMetrics {
  const label = ctx.sizes[id];
  const labelAlong = alongSize(label, axis);
  const labelPerp = perpSize(label, axis);
  const kids = visibleChildren(ctx, id);
  const rowGap = gapPerp(ctx, axis);
  const bands = kids.map(
    (k) => tailSpanP(ctx, axis, k, cache) + rowGap,
  );
  const tipClear = TIP_PAD + labelPerp / 2;
  const bandTotal = bands.reduce((s, b) => s + b, 0);
  // 全图共用大骨长度：主流鱼骨图的六根大骨等长，类别标签才会对齐
  const own = Math.max(MIN_RIB_PERP, tipClear + bandTotal + BASE_PAD);
  const ribPerp = sharedRibPerp ?? own;
  const ribRun = axis.comb ? 0 : ribPerp;
  const midBone = Math.max(28, Math.round(gapAlong(ctx, axis) * 0.9));

  let cursor = tipClear;
  const attachments = kids.map((k, i) => {
    const band = bands[i];
    const q = ribPerp - (cursor + band / 2);
    cursor += band;
    return { id: k, q, band };
  });

  let tailExtent = ribRun + labelAlong / 2;
  for (const at of attachments) {
    const attachAlong = axis.comb ? 0 : at.q;
    tailExtent = Math.max(
      tailExtent,
      attachAlong + midBone + tailExtentU(ctx, axis, at.id, cache),
    );
  }

  return {
    label,
    labelAlong,
    labelPerp,
    ribPerp,
    ribRun,
    tipClear,
    midBone,
    tailExtent: tailExtent + SLOT_PAD,
    headExtent: Math.max(0, labelAlong / 2 - ribRun) + SLOT_PAD,
    attachments,
  };
}

/** 6M 对称：前后对半分到两侧；其余模式上下（左右）交替 */
function buildRows(kids: string[], axis: FishboneAxis): BranchSlot[][] {
  if (axis.symmetric) {
    const topCount = Math.ceil(kids.length / 2);
    const top: BranchSlot[] = kids
      .slice(0, topCount)
      .map((id) => ({ id, side: -1 }));
    const bottom: BranchSlot[] = kids
      .slice(topCount)
      .map((id) => ({ id, side: 1 }));
    const rows: BranchSlot[][] = [];
    for (let i = 0; i < Math.max(top.length, bottom.length); i++) {
      const row: BranchSlot[] = [];
      if (top[i]) row.push(top[i]);
      if (bottom[i]) row.push(bottom[i]);
      rows.push(row);
    }
    return rows;
  }
  return kids.map((id, i) => [{ id, side: i % 2 === 0 ? -1 : 1 }]);
}

function dirOf(axis: FishboneAxis): ConnectorDir {
  if (axis.ux < 0) return 'left';
  if (axis.ux > 0) return 'right';
  return axis.uy < 0 ? 'up' : 'down';
}

function polyline(points: Array<{ x: number; y: number }>): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
}

/** 从盒外一点看向盒中心，取射线与盒边的交点 */
function boxEntry(box: Box, fromX: number, fromY: number): { x: number; y: number } {
  const dx = fromX - box.x;
  const dy = fromY - box.y;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return { x: box.x, y: box.y };
  const tx = Math.abs(dx) < 1e-6 ? Infinity : box.width / 2 / Math.abs(dx);
  const ty = Math.abs(dy) < 1e-6 ? Infinity : box.height / 2 / Math.abs(dy);
  const t = Math.min(tx, ty);
  return { x: box.x + dx * t, y: box.y + dy * t };
}

/** 二级及以下：沿鱼尾方向生长、在分侧轴上堆叠的紧凑子树 */
function placeTailSubtree(
  ctx: LayoutCtx,
  axis: FishboneAxis,
  id: string,
  center: { x: number; y: number },
  color: string,
  cache: SpanCache,
): void {
  const size = ctx.sizes[id];
  const box: Box = {
    x: center.x,
    y: center.y,
    width: size.width,
    height: size.height,
  };
  ctx.positions[id] = box;

  const kids = visibleChildren(ctx, id);
  if (!kids.length) return;

  const gapP = gapPerp(ctx, axis);
  const gapU = gapAlong(ctx, axis);
  const spans = kids.map((k) => tailSpanP(ctx, axis, k, cache));
  const total =
    spans.reduce((s, v) => s + v, 0) + gapP * (kids.length - 1);
  const centerAlong = center.x * axis.ux + center.y * axis.uy;
  const centerPerp = center.x * axis.px + center.y * axis.py;
  const dir = dirOf(axis);

  let perpCursor = centerPerp - total / 2;
  kids.forEach((kid, i) => {
    const span = spans[i];
    const childPerp = perpCursor + span / 2;
    const childAlong =
      centerAlong +
      alongSize(size, axis) / 2 +
      gapU +
      alongSize(ctx.sizes[kid], axis) / 2;
    const childCenter = {
      x: axis.ux * childAlong + axis.px * childPerp,
      y: axis.uy * childAlong + axis.py * childPerp,
    };
    placeTailSubtree(ctx, axis, kid, childCenter, color, cache);
    ctx.connectors.push({
      id: `${id}->${kid}`,
      from: id,
      to: kid,
      d: elbowPath(box, ctx.positions[kid], dir),
      color,
      dir,
    });
    perpCursor += span + gapP;
  });
}

/** 一级分支：鱼脊上的基点 → 斜骨 → 骨端标签；中骨从斜骨上平行鱼脊伸出 */
function placeBranch(
  ctx: LayoutCtx,
  axis: FishboneAxis,
  rootSpineStart: { x: number; y: number },
  baseT: number,
  id: string,
  side: -1 | 1,
  metrics: BranchMetrics,
  cache: SpanCache,
): void {
  const { doc, theme } = ctx;
  const color = branchColorOf(doc, theme, id);
  const rootBox = ctx.positions[doc.rootId];
  const base = {
    x: rootBox.x + axis.ux * baseT,
    y: rootBox.y + axis.uy * baseT,
  };
  const tip = {
    x: base.x + axis.ux * metrics.ribRun + axis.px * side * metrics.ribPerp,
    y: base.y + axis.uy * metrics.ribRun + axis.py * side * metrics.ribPerp,
  };
  const box: Box = {
    x: tip.x,
    y: tip.y,
    width: metrics.label.width,
    height: metrics.label.height,
  };
  ctx.positions[id] = box;

  const entry = boxEntry(box, base.x, base.y);
  ctx.connectors.push({
    id: `${doc.rootId}->${id}`,
    from: doc.rootId,
    to: id,
    d: polyline([rootSpineStart, base, entry]),
    color,
    dir: dirOf(axis),
  });

  for (const at of metrics.attachments) {
    const attachAlong = axis.comb ? 0 : at.q;
    const attach = {
      x: base.x + axis.ux * attachAlong + axis.px * side * at.q,
      y: base.y + axis.uy * attachAlong + axis.py * side * at.q,
    };
    const childAlong = alongSize(ctx.sizes[at.id], axis);
    const childCenter = {
      x: attach.x + axis.ux * (metrics.midBone + childAlong / 2),
      y: attach.y + axis.uy * (metrics.midBone + childAlong / 2),
    };
    placeTailSubtree(ctx, axis, at.id, childCenter, color, cache);

    const childEntry = boxEntry(
      ctx.positions[at.id],
      attach.x,
      attach.y,
    );
    ctx.connectors.push({
      id: `${id}->${at.id}`,
      from: id,
      to: at.id,
      d: polyline([attach, childEntry]),
      color,
      dir: dirOf(axis),
    });
  }
}

export function layoutFishbone(
  ctx: LayoutCtx,
  structure: FishboneStructureId,
): void {
  const axis = AXES[structure];
  if (!axis) return;
  const { doc } = ctx;
  const kids = visibleChildren(ctx, doc.rootId);
  if (!kids.length) return;

  const cache: SpanCache = { spanP: new Map(), extentU: new Map() };
  const firstPass = kids.map((k) => measureBranch(ctx, axis, k, cache));
  const sharedRibPerp = Math.max(...firstPass.map((m) => m.ribPerp));
  const metrics = new Map(
    kids.map((k, i) => [
      k,
      firstPass[i].ribPerp === sharedRibPerp
        ? firstPass[i]
        : measureBranch(ctx, axis, k, cache, sharedRibPerp),
    ]),
  );
  const rows = buildRows(kids, axis);
  const rootBox = ctx.positions[doc.rootId];
  const rootSize = ctx.sizes[doc.rootId];
  const rootSpineStart = {
    x: rootBox.x + axis.ux * (alongSize(rootSize, axis) / 2),
    y: rootBox.y + axis.uy * (alongSize(rootSize, axis) / 2),
  };
  const startGap = Math.max(ctx.hGap, MIN_START_GAP);
  const slotGap = Math.max(ctx.hGap, MIN_START_GAP);
  let cursorT = alongSize(rootSize, axis) / 2 + startGap;

  for (const row of rows) {
    const rowMetrics = row.map((slot) => metrics.get(slot.id)!);
    const headExtent = Math.max(...rowMetrics.map((m) => m.headExtent));
    const tailExtent = Math.max(...rowMetrics.map((m) => m.tailExtent));
    const baseT = cursorT + headExtent;
    for (const slot of row) {
      placeBranch(
        ctx,
        axis,
        rootSpineStart,
        baseT,
        slot.id,
        slot.side,
        metrics.get(slot.id)!,
        cache,
      );
    }
    cursorT = baseT + tailExtent + slotGap;
  }
}
