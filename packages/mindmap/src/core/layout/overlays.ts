// src/core/layout/overlays.ts
// 覆盖层几何：外框包围盒、联系线曲线、概要锚点（均基于布局结果，不参与布局）
import type { Box, MindMapDocument } from '../../types/mindmap';

// 左上角语义的矩形盒（区别于 Box 的中心点语义）
export interface RectBox {
  x: number; // 左上角
  y: number;
  width: number;
  height: number;
}

// 外框覆盖范围：成员节点及其全部可见后代（对齐 XMind 外框包住整个子树）。
// 折叠的后代不参与布局（无 position），连同其后代一并自然排除
export function boundaryCoverageBoxes(
  nodes: MindMapDocument['nodes'],
  positions: Record<string, Box>,
  nodeIds: string[],
): Box[] {
  const out: Box[] = [];
  const walk = (id: string) => {
    const box = positions[id];
    if (!box) return;
    out.push(box);
    for (const child of nodes[id]?.children ?? []) walk(child);
  };
  for (const id of nodeIds) {
    if (nodes[id]) walk(id);
  }
  return out;
}

// 取成员盒的并集包围盒并向外扩 padding；空数组返回 null
export function boundaryBox(boxes: Box[], padding: number): RectBox | null {
  if (!boxes.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x - b.width / 2);
    minY = Math.min(minY, b.y - b.height / 2);
    maxX = Math.max(maxX, b.x + b.width / 2);
    maxY = Math.max(maxY, b.y + b.height / 2);
  }
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

export interface RelationGeometry {
  start: { x: number; y: number };
  end: { x: number; y: number };
  control: { x: number; y: number }; // 二次贝塞尔控制点（渲染采样用）
  d: string;
  labelPosition: { x: number; y: number };
}

// 联系线弧度参数：控制点法向偏移上限与弦长比例
const MAX_CURVE_OFFSET = 40;
const CURVE_OFFSET_RATIO = 0.2;

// 从 from 盒中心指向 to 盒中心，与盒边缘求交作为端点，二次贝塞尔曲线
export function relationPath(from: Box, to: Box): RelationGeometry {
  const start = edgePoint(from, to.x, to.y);
  const end = edgePoint(to, from.x, from.y);
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  // 控制点：中点沿法线偏移，形成弧度
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const offset = Math.min(MAX_CURVE_OFFSET, len * CURVE_OFFSET_RATIO);
  const control = { x: mx + (-dy / len) * offset, y: my + (dx / len) * offset };
  // 标签取弦中点与画线同源
  return {
    start,
    end,
    control,
    d: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    labelPosition: { x: mx, y: my },
  };
}

/** 二次贝塞尔采样为折点序列（Konva Line/Arrow 不支持 Q 指令，用密集采样逼近曲线） */
export function quadPoints(
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
  segments = 24,
): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const u = 1 - t;
    pts.push(
      u * u * start.x + 2 * u * t * control.x + t * t * end.x,
      u * u * start.y + 2 * u * t * control.y + t * t * end.y,
    );
  }
  return pts;
}

// 盒中心朝 (tx,ty) 方向的边缘交点（简化：按主轴裁剪矩形）；联系线跟随虚线复用
export function edgePoint(box: Box, tx: number, ty: number): { x: number; y: number } {
  const dx = tx - box.x;
  const dy = ty - box.y;
  if (dx === 0 && dy === 0) return { x: box.x, y: box.y };
  const hw = box.width / 2;
  const hh = box.height / 2;
  const scaleX = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const s = Math.min(scaleX, scaleY);
  return { x: box.x + dx * s, y: box.y + dy * s };
}

// 概要方位：成员包围盒与远离父节点的一侧
export interface SummaryPlacement {
  rect: RectBox; // 成员包围盒（未外扩）
  side: 'left' | 'right' | 'top' | 'bottom';
}

// 锚点与括号共用的方向判定，对齐 XMind：概要永远沿分支延伸方向外凸——
// 纵向堆叠的同级成员（思维导图/逻辑图）→ 朝左/右外侧；横向并排的成员（树状图）→ 朝上/下外侧，
// 再按父节点方位取远离父节点的一侧。
// 不用「父点到成员中心的主轴距离」：深层列表里父节点会被甩到成员包盒斜上方，
// 主轴翻到 Y 导致括号翻成朝上/朝下、遮挡节点。
export function summaryPlacement(memberBoxes: Box[], parentBox: Box): SummaryPlacement | null {
  const rect = boundaryBox(memberBoxes, 0);
  if (!rect) return null;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  if (memberBoxes.length > 1) {
    // 成员排布方向即分支延伸方向：首尾中心纵距 ≥ 横距视为纵向堆叠
    const first = memberBoxes[0];
    const last = memberBoxes[memberBoxes.length - 1];
    const stacked = Math.abs(last.y - first.y) >= Math.abs(last.x - first.x);
    if (stacked) return { rect, side: parentBox.x <= cx ? 'right' : 'left' };
    return { rect, side: parentBox.y <= cy ? 'bottom' : 'top' };
  }
  // 单成员无从看排布，按父点相对位移的主轴判定（横向优先，Mindmap/逻辑图为常用布局）
  const horizontal = Math.abs(cx - parentBox.x) * 2 >= Math.abs(cy - parentBox.y);
  if (horizontal) return { rect, side: parentBox.x <= cx ? 'right' : 'left' };
  return { rect, side: parentBox.y <= cy ? 'bottom' : 'top' };
}

// 大括号外凸深度：随区间跨度增长（对齐 XMind 的比例感），限制在 [10, 30]
export function summaryBraceDepth(cross: number): number {
  return Math.max(10, Math.min(30, cross * 0.12));
}

// 端部沿边缘的回钩长度（指向成员节点）与中尖小刺长度（指向概要盒一侧）
const BRACE_TIP = 6;
const BRACE_TICK = 8;

// 括号求解中间量：side + 括号基准边 + 沿边跨度（基准边可被障碍外推）
interface BracketFrame {
  side: SummaryPlacement['side'];
  memberEdge: number; // 成员包围盒外缘（外推起点，也用于概要嵌套的内外判定）
  lineStart: number; // 沿边跨度起点
  cross: number; // 沿边跨度
  center: number; // 跨度中点
}

function bracketFrame(memberBoxes: Box[], parentBox: Box): BracketFrame | null {
  const placement = summaryPlacement(memberBoxes, parentBox);
  if (!placement) return null;
  const { rect, side } = placement;
  const along = side === 'right' || side === 'left';
  return {
    side,
    memberEdge:
      side === 'right' ? rect.x + rect.width
      : side === 'left' ? rect.x
      : side === 'bottom' ? rect.y + rect.height
      : rect.y,
    lineStart: along ? rect.y : rect.x,
    cross: along ? rect.height : rect.width,
    center: along ? rect.y + rect.height / 2 : rect.x + rect.width / 2,
  };
}

// 障碍外推后的括号基准边：与跨度相交且更靠外的节点盒把括号整体外推（对齐 XMind 不遮挡任何内容）
function pushedBase(frame: BracketFrame, obstacles: Box[]): number {
  let base = frame.memberEdge;
  const spanStart = frame.lineStart - BRACE_TIP;
  const spanEnd = frame.lineStart + frame.cross + BRACE_TIP;
  for (const o of obstacles) {
    const horizontalSpan = frame.side === 'right' || frame.side === 'left';
    const oStart = horizontalSpan ? o.y - o.height / 2 : o.x - o.width / 2;
    const oEnd = oStart + (horizontalSpan ? o.height : o.width);
    if (oEnd <= spanStart || oStart >= spanEnd) continue;
    const outward =
      frame.side === 'right' ? o.x + o.width / 2
      : frame.side === 'left' ? o.x - o.width / 2
      : frame.side === 'bottom' ? o.y + o.height / 2
      : o.y - o.height / 2;
    if (frame.side === 'right' || frame.side === 'bottom') base = Math.max(base, outward);
    else base = Math.min(base, outward);
  }
  return base;
}

// 由基准边求锚点：括号深度 + 小刺之外再留 gap 放概要盒
function solveFrame(
  frame: BracketFrame,
  obstacles: Box[],
  gap: number,
): { base: number; anchor: { x: number; y: number } } {
  const base = pushedBase(frame, obstacles);
  const offset = summaryBraceDepth(frame.cross) + BRACE_TICK + gap;
  const anchor =
    frame.side === 'right' ? { x: base + offset, y: frame.center }
    : frame.side === 'left' ? { x: base - offset, y: frame.center }
    : frame.side === 'bottom' ? { x: frame.center, y: base + offset }
    : { x: frame.center, y: base - offset };
  return { base, anchor };
}

// 概要锚点与括号外凸距离：沿远离父节点一侧，从大括号外缘再向外计；
// obstacles（中心点语义盒）为路径上的节点/概要占用盒，会把括号整体外推
export function summaryAnchor(
  memberBoxes: Box[],
  parentBox: Box,
  gap: number,
  obstacles?: Box[],
): { x: number; y: number } | null {
  const frame = bracketFrame(memberBoxes, parentBox);
  if (!frame) return null;
  return solveFrame(frame, obstacles ?? [], gap).anchor;
}

// 概要括号：对齐 XMind 的弧形大括号——端部回钩贴外推后的基准边，两条二次曲线外凸，
// 中尖经小刺指向概要盒；返回 Konva Line 的采样 points
export function summaryBracket(memberBoxes: Box[], parentBox: Box, obstacles?: Box[]): number[] | null {
  const frame = bracketFrame(memberBoxes, parentBox);
  if (!frame) return null;
  const { base } = solveFrame(frame, obstacles ?? [], 0);
  return bracketPoints(frame, base);
}

function bracketPoints(frame: BracketFrame, base: number): number[] {
  const { side, cross, lineStart } = frame;
  const depth = summaryBraceDepth(cross);
  const mid = cross / 2;
  // 规范坐标：x = 距基准边的外凸距离，y = 沿边跨度；映射时再翻转/换轴
  const top = quadPoints({ x: 0, y: 0 }, { x: depth, y: cross * 0.32 }, { x: depth, y: mid }, 14);
  const bottom = quadPoints({ x: depth, y: mid }, { x: depth, y: cross * 0.68 }, { x: 0, y: cross }, 14);
  const seq: Array<[number, number]> = [[-BRACE_TIP, 0], [0, 0]];
  for (let i = 2; i < top.length; i += 2) seq.push([top[i], top[i + 1]]);
  seq.push([depth + BRACE_TICK, mid]);
  for (let i = 2; i < bottom.length; i += 2) seq.push([bottom[i], bottom[i + 1]]);
  seq.push([-BRACE_TIP, cross]);
  return seq.flatMap(([p, q]) => {
    if (side === 'right') return [base + p, lineStart + q];
    if (side === 'left') return [base - p, lineStart + q];
    if (side === 'bottom') return [lineStart + q, base + p];
    return [lineStart + q, base - p];
  });
}

// 概要渲染输入：id + 区间成员盒 + 父盒（渲染与编辑浮层共用同一解析）
export interface SummaryOverlayInput {
  id: string;
  memberBoxes: Box[];
  parentBox: Box;
}

export function summaryInputs(
  doc: Pick<MindMapDocument, 'nodes' | 'summaries'>,
  positions: Record<string, Box>,
): SummaryOverlayInput[] {
  const items: SummaryOverlayInput[] = [];
  for (const s of doc.summaries) {
    const parent = doc.nodes[s.parentId];
    const parentBox = positions[s.parentId];
    if (!parent || !parentBox) continue;
    // 区间成员盒：按 children 顺序切片，过滤已删除/不可见节点
    const memberBoxes = parent.children
      .slice(s.range[0], s.range[1] + 1)
      .map((id) => positions[id])
      .filter((box): box is Box => Boolean(box));
    if (memberBoxes.length) items.push({ id: s.id, memberBoxes, parentBox });
  }
  return items;
}

// 全部概要的括号与锚点一次求解。节点盒直接作为障碍；概要之间互相避让：
// 只避让「更靠外」的概要（外层避让路径上的内层，反向不避让），占用盒随迭代单调外移，必收敛
export function computeSummaryOverlays(
  items: SummaryOverlayInput[],
  nodeBoxes: Box[],
  gap: number,
  boxSize: { width: number; height: number },
): Map<string, { anchor: { x: number; y: number }; bracketPoints: number[] }> {
  const frames = new Map<string, BracketFrame>();
  for (const item of items) {
    const frame = bracketFrame(item.memberBoxes, item.parentBox);
    if (frame) frames.set(item.id, frame);
  }
  let solved = new Map<string, { base: number; anchor: { x: number; y: number } }>();
  for (let pass = 0; pass < 6; pass += 1) {
    const next = new Map<string, { base: number; anchor: { x: number; y: number } }>();
    for (const [id, frame] of frames) {
      const obstacles = nodeBoxes.slice();
      const outward = frame.side === 'right' || frame.side === 'bottom';
      for (const [otherId, otherFrame] of frames) {
        if (otherId === id) continue;
        // 内层概要的成员外缘不小于（右/下侧）或不大于（左/上侧）自己才在路径上
        const inPath = outward
          ? otherFrame.memberEdge >= frame.memberEdge - 0.5
          : otherFrame.memberEdge <= frame.memberEdge + 0.5;
        if (!inPath) continue;
        const other = solved.get(otherId);
        if (other) {
          obstacles.push({ x: other.anchor.x, y: other.anchor.y, width: boxSize.width, height: boxSize.height });
        }
      }
      next.set(id, solveFrame(frame, obstacles, gap));
    }
    let stable = next.size === solved.size;
    if (stable) {
      for (const [id, s] of next) {
        const prev = solved.get(id);
        if (!prev || prev.anchor.x !== s.anchor.x || prev.anchor.y !== s.anchor.y) {
          stable = false;
          break;
        }
      }
    }
    solved = next;
    if (stable) break;
  }
  const out = new Map<string, { anchor: { x: number; y: number }; bracketPoints: number[] }>();
  for (const [id, frame] of frames) {
    const s = solved.get(id);
    if (s) out.set(id, { anchor: s.anchor, bracketPoints: bracketPoints(frame, s.base) });
  }
  return out;
}

// ---------- 外框的多层叠加几何（对齐 XMind「一圈一圈向外」） ----------

/** 内层与内容（含子树整体）的留白 */
const BOUNDARY_PADDING = 20;

/** 相邻两层的间距 */
export const BOUNDARY_LAYER_GAP = 12;

/** 左上角备注标签的几何：高 20，底部压在外框顶边上 */
export const BOUNDARY_CHIP = { height: 20, overlap: 6, padX: 8 };

/** 外框几何：内层贴内容、外层向外叠加一圈；成员全部不可见时返回 null */
export function boundaryRects(
  doc: MindMapDocument,
  positions: Record<string, Box>,
  nodeIds: string[],
): { inner: RectBox; outer: RectBox } | null {
  const boxes = boundaryCoverageBoxes(doc.nodes, positions, nodeIds);
  const inner = boundaryBox(boxes, BOUNDARY_PADDING);
  if (!inner) return null;
  const gap = BOUNDARY_LAYER_GAP;
  return {
    inner,
    outer: {
      x: inner.x - gap,
      y: inner.y - gap,
      width: inner.width + gap * 2,
      height: inner.height + gap * 2,
    },
  };
}
