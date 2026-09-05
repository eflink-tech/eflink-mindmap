import type {
  Box,
  ConnectorEnd,
  ConnectorLineType,
  MindMapDocument,
  ThemeConfig,
} from '../../types/mindmap';
import { getPreset } from '../layout/presets';
import { getStructure } from '../layout/structures';
import { getCanvasOptions } from './canvasOptions';

export type ConnectorDir = 'right' | 'left' | 'down' | 'up';

export interface ResolvedConnectorStyle {
  type: ConnectorLineType;
  width: number;
  /** 节点显式设置时才有；渲染层可回退到布局色 */
  color?: string;
  end: ConnectorEnd;
}

/** 节点 style.connector* > layoutDefaults > canvasOptions.branchLineWidth / theme.connector */
export function resolveConnectorStyle(
  doc: MindMapDocument,
  fromId: string,
  theme: ThemeConfig,
): ResolvedConnectorStyle {
  const node = doc.nodes[fromId];
  const style = node?.style;
  const defaults = doc.layoutDefaults;
  const canvas = getCanvasOptions(doc);
  return {
    type: style?.connectorType ?? defaults?.connectorType ?? theme.connector.type,
    width: style?.connectorWidth ?? canvas.branchLineWidth ?? defaults?.connectorWidth ?? theme.connector.width,
    color: style?.connectorColor,
    end: style?.connectorEnd ?? defaults?.connectorEnd ?? 'none',
  };
}

// 三级及以下连线（对齐 XMind）：细灰、无端点装饰；渲染为圆角直角折线
export const DEEP_CONNECTOR_COLOR = '#A6A6A6';
export const DEEP_CONNECTOR_WIDTH = 1.5;
/** 深层连线的起点深度：连接到 depth≥3 节点的连线 */
const DEEP_CONNECTOR_MIN_DEPTH = 3;

// 节点深度（根为 0）；局部实现避免与 apply.ts 相互依赖
function nodeDepth(doc: MindMapDocument, id: string): number {
  let depth = 0;
  let cur = doc.nodes[id];
  while (cur?.parentId) {
    depth += 1;
    cur = doc.nodes[cur.parentId];
  }
  return depth;
}

export interface ResolvedConnectorAppearance extends ResolvedConnectorStyle {
  /** 命中三级及以下默认样式：渲染走 roundedElbowPath */
  deep: boolean;
  /** 布局预设手绘：渲染对路径做确定性抖动 */
  handDrawn: boolean;
}

/**
 * 渲染用连线外观：在 resolveConnectorStyle 之上叠加「三级及以下 → 细灰圆角折线」。
 * 节点显式设置过任意 connector* 样式时不覆盖（显式优先）。
 */
export function resolveConnectorAppearance(
  doc: MindMapDocument,
  fromId: string,
  toId: string,
  theme: ThemeConfig,
): ResolvedConnectorAppearance {
  const style = resolveConnectorStyle(doc, fromId, theme);
  const explicit = doc.nodes[fromId]?.style;
  const hasExplicit =
    !!explicit &&
    (explicit.connectorType !== undefined ||
      explicit.connectorWidth !== undefined ||
      explicit.connectorColor !== undefined ||
      explicit.connectorEnd !== undefined);
  const fishbone = getPreset(doc.layout)?.structure === 'fishbone-right';
  const handDrawn = !!doc.layoutDefaults?.handDrawn;
  if (
    !hasExplicit &&
    style.type !== 'brace' &&
    !fishbone &&
    nodeDepth(doc, toId) >= DEEP_CONNECTOR_MIN_DEPTH
  ) {
    return {
      type: 'elbow',
      width: DEEP_CONNECTOR_WIDTH,
      color: DEEP_CONNECTOR_COLOR,
      end: 'none',
      deep: true,
      handDrawn,
    };
  }
  return { ...style, deep: false, handDrawn };
}

function isVerticalDir(dir: ConnectorDir): boolean {
  return dir === 'down' || dir === 'up';
}

function edgePoint(box: Box, dir: ConnectorDir, which: 'from' | 'to'): { x: number; y: number } {
  if (isVerticalDir(dir)) {
    const s = dir === 'down' ? 1 : -1;
    return which === 'from'
      ? { x: box.x, y: box.y + (s * box.height) / 2 }
      : { x: box.x, y: box.y - (s * box.height) / 2 };
  }
  const s = dir === 'right' ? 1 : -1;
  return which === 'from'
    ? { x: box.x + (s * box.width) / 2, y: box.y }
    : { x: box.x - (s * box.width) / 2, y: box.y };
}

/** 三次贝塞尔曲线（与布局引擎默认连线一致） */
export function curvePath(from: Box, to: Box, dir: ConnectorDir): string {
  const a = edgePoint(from, dir, 'from');
  const b = edgePoint(to, dir, 'to');
  if (isVerticalDir(dir)) {
    const my = (a.y + b.y) / 2;
    return `M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
  }
  const mx = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
}

/** 两点直线 */
export function straightPath(from: Box, to: Box, dir: ConnectorDir): string {
  const a = edgePoint(from, dir, 'from');
  const b = edgePoint(to, dir, 'to');
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}

/** 盒缘斜线（鱼骨子级沿骨连线） */
export function diagonalPath(from: Box, to: Box, dir: ConnectorDir): string {
  return straightPath(from, to, dir);
}

/**
 * 鱼骨主刺：沿水平脊走到斜骨起点，再斜向子节点。
 * 斜段按 45° 取 attachX = max(fromRight, toLeft - |dy|)。
 */
export function fishboneRibPath(from: Box, to: Box): string {
  const x1 = from.x + from.width / 2;
  const y1 = from.y;
  const x2 = to.x - to.width / 2;
  const y2 = to.y;
  const attachX = Math.max(x1, x2 - Math.abs(y2 - y1));
  if (attachX === x2 || Math.abs(y2 - y1) < 1e-6) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  return `M ${x1} ${y1} L ${attachX} ${y1} L ${x2} ${y2}`;
}

/** 括号臂长：竖脊靠近子节点，短于 elbow 中点 */
const BRACE_ARM = 16;

/**
 * 括号连线：父缘水平到竖脊，再竖直，再水平臂到子缘。
 * 同父且左缘对齐的孩子共享 spine x，视觉上合成一条托架而非各自曲线。
 */
export function bracePath(from: Box, to: Box, dir: ConnectorDir): string {
  const a = edgePoint(from, dir, 'from');
  const b = edgePoint(to, dir, 'to');
  if (isVerticalDir(dir)) {
    const gap = Math.abs(b.y - a.y);
    const arm = Math.min(BRACE_ARM, gap * 0.35);
    const spineY = b.y - Math.sign(b.y - a.y || 1) * arm;
    return `M ${a.x} ${a.y} L ${a.x} ${spineY} L ${b.x} ${spineY} L ${b.x} ${b.y}`;
  }
  const gap = Math.abs(b.x - a.x);
  const arm = Math.min(BRACE_ARM, gap * 0.35);
  const s = dir === 'right' ? 1 : -1;
  const spineX = b.x - s * arm;
  return `M ${a.x} ${a.y} L ${spineX} ${a.y} L ${spineX} ${b.y} L ${b.x} ${b.y}`;
}

/** 正交折线：水平布局先水平再垂直再水平；垂直方向（up/down）先竖直再水平再竖直 */
export function elbowPath(from: Box, to: Box, dir: ConnectorDir): string {
  const a = edgePoint(from, dir, 'from');
  const b = edgePoint(to, dir, 'to');
  if (isVerticalDir(dir)) {
    const my = (a.y + b.y) / 2;
    return `M ${a.x} ${a.y} L ${a.x} ${my} L ${b.x} ${my} L ${b.x} ${b.y}`;
  }
  const mx = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} L ${mx} ${a.y} L ${mx} ${b.y} L ${b.x} ${b.y}`;
}

// 圆角半径上限：与 XMind 深层折线的圆角观感一致
const ELBOW_ROUND_RADIUS = 8;

/**
 * 圆角直角折线：走位与 elbowPath 相同，两个拐角用二次贝塞尔倒圆。
 * 任一段放不下圆角（共线/重叠）时退化为普通折线。
 */
export function roundedElbowPath(from: Box, to: Box, dir: ConnectorDir): string {
  const a = edgePoint(from, dir, 'from');
  const b = edgePoint(to, dir, 'to');
  if (isVerticalDir(dir)) {
    const my = (a.y + b.y) / 2;
    const r = Math.min(
      ELBOW_ROUND_RADIUS,
      Math.abs(b.x - a.x) / 2,
      Math.abs(my - a.y),
      Math.abs(b.y - my),
    );
    if (!(r > 0)) return elbowPath(from, to, dir);
    const sx = Math.sign(b.x - a.x) || 1;
    const sy = Math.sign(b.y - a.y) || 1;
    return (
      `M ${a.x} ${a.y}` +
      ` L ${a.x} ${my - sy * r} Q ${a.x} ${my} ${a.x + sx * r} ${my}` +
      ` L ${b.x - sx * r} ${my} Q ${b.x} ${my} ${b.x} ${my + sy * r}` +
      ` L ${b.x} ${b.y}`
    );
  }
  const mx = (a.x + b.x) / 2;
  const r = Math.min(
    ELBOW_ROUND_RADIUS,
    Math.abs(b.y - a.y) / 2,
    Math.abs(mx - a.x),
    Math.abs(b.x - mx),
  );
  if (!(r > 0)) return elbowPath(from, to, dir);
  const sx = Math.sign(b.x - a.x) || 1;
  const sy = Math.sign(b.y - a.y) || 1;
  return (
    `M ${a.x} ${a.y}` +
    ` L ${mx - sx * r} ${a.y} Q ${mx} ${a.y} ${mx} ${a.y + sy * r}` +
    ` L ${mx} ${b.y - sy * r} Q ${mx} ${b.y} ${mx + sx * r} ${b.y}` +
    ` L ${b.x} ${b.y}`
  );
}

export function connectorPathD(
  from: Box,
  to: Box,
  dir: ConnectorDir,
  type: ConnectorLineType,
): string {
  if (type === 'straight') return straightPath(from, to, dir);
  if (type === 'elbow') return elbowPath(from, to, dir);
  if (type === 'brace') return bracePath(from, to, dir);
  return curvePath(from, to, dir);
}

interface PathPt {
  x: number;
  y: number;
}

const HAND_DRAWN_STEPS = 8;
const HAND_DRAWN_AMPLITUDE = 2.2;

function flattenPath(d: string, stepsPerSeg: number): PathPt[] {
  const pts: PathPt[] = [];
  const re = /([MLQC])[^MLQC]*/g;
  let cur: PathPt = { x: 0, y: 0 };
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const nums = (m[0].slice(1).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    if (m[1] === 'M') {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        cur = { x: nums[i], y: nums[i + 1] };
        pts.push(cur);
      }
    } else if (m[1] === 'L') {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const dest = { x: nums[i], y: nums[i + 1] };
        for (let s = 1; s <= stepsPerSeg; s++) {
          const t = s / stepsPerSeg;
          pts.push({ x: cur.x + t * (dest.x - cur.x), y: cur.y + t * (dest.y - cur.y) });
        }
        cur = dest;
      }
    } else if (m[1] === 'Q') {
      const [cx, cy, ex, ey] = nums;
      const sx = cur.x;
      const sy = cur.y;
      for (let s = 1; s <= stepsPerSeg; s++) {
        const t = s / stepsPerSeg;
        const u = 1 - t;
        pts.push({
          x: u * u * sx + 2 * u * t * cx + t * t * ex,
          y: u * u * sy + 2 * u * t * cy + t * t * ey,
        });
      }
      cur = { x: ex, y: ey };
    } else {
      const [c1x, c1y, c2x, c2y, ex, ey] = nums;
      const sx = cur.x;
      const sy = cur.y;
      for (let s = 1; s <= stepsPerSeg; s++) {
        const t = s / stepsPerSeg;
        const u = 1 - t;
        pts.push({
          x: u * u * u * sx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex,
          y: u * u * u * sy + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey,
        });
      }
      cur = { x: ex, y: ey };
    }
  }
  return pts;
}

function jitter01(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

/** 将平滑 SVG 路径采样为确定性抖动折线（手绘感）；起终点保持不变 */
export function handDrawnPath(d: string, amplitude = HAND_DRAWN_AMPLITUDE): string {
  const samples = flattenPath(d, HAND_DRAWN_STEPS);
  if (samples.length < 2) return d;
  const jittered = samples.map((p, i) => {
    if (i === 0 || i === samples.length - 1) return p;
    const prev = samples[i - 1];
    const next = samples[i + 1];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const t = (jitter01(i * 17.13 + p.x * 0.13 + p.y * 0.07) - 0.5) * 2;
    return { x: p.x + (-dy / len) * amplitude * t, y: p.y + (dx / len) * amplitude * t };
  });
  const [first, ...rest] = jittered;
  return `M ${first.x} ${first.y}` + rest.map((p) => ` L ${p.x} ${p.y}`).join('');
}

/** 布局已预计算连线 d、渲染/动画层不得按主题线型重建的结构 */
export function preservesLayoutConnectorD(doc: MindMapDocument): boolean {
  return getStructure(doc) === 'fishbone-right';
}

/**
 * 渲染用连线路径：鱼骨等布局保留 layout `d`；curve 沿用布局；其余按主题线型重建。
 * handDrawn 时对最终路径做确定性抖动（点数/段数多于平滑路径）。
 */
export function resolveRenderedConnectorD(
  doc: MindMapDocument,
  layoutD: string,
  fromBox: Box,
  toBox: Box,
  dir: ConnectorDir | undefined,
  style: ResolvedConnectorAppearance,
): string {
  let d: string;
  if (preservesLayoutConnectorD(doc) || style.type === 'curve') {
    d = layoutD;
  } else {
    const connDir = dir ?? inferConnectorDir(fromBox, toBox);
    d = style.deep
      ? roundedElbowPath(fromBox, toBox, connDir)
      : connectorPathD(fromBox, toBox, connDir, style.type);
  }
  return style.handDrawn ? handDrawnPath(d) : d;
}

/** 根据 from/to 中心相对位置推断连线方向 */
export function inferConnectorDir(from: Box, to: Box): ConnectorDir {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dy) > Math.abs(dx)) return dy > 0 ? 'down' : 'up';
  return dx >= 0 ? 'right' : 'left';
}

/** 路径终点坐标（用于箭头/圆点） */
export function pathEndpoint(d: string): { x: number; y: number } | null {
  const parts = d.trim().split(/[\s,]+/);
  const n = parts.length;
  if (n < 2) return null;
  const y = Number(parts[n - 1]);
  const x = Number(parts[n - 2]);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return { x, y };
}

/** 末段上靠近终点的插值比例（箭头 stem 仅覆盖末段尾部，避免与 Path 整段叠描） */
const APPROACH_RATIO = 0.875;

/** 末段靠近终点的一点，用于箭头朝向；沿 penultimate→endpoint 插值，非段起点 */
export function pathApproachPoint(d: string): { x: number; y: number } | null {
  const nums = d.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 4) return null;
  const endX = Number(nums[nums.length - 2]);
  const endY = Number(nums[nums.length - 1]);
  const prevX = Number(nums[nums.length - 4]);
  const prevY = Number(nums[nums.length - 3]);
  if (Number.isNaN(endX) || Number.isNaN(endY) || Number.isNaN(prevX) || Number.isNaN(prevY)) {
    return null;
  }
  const t = APPROACH_RATIO;
  return {
    x: prevX + t * (endX - prevX),
    y: prevY + t * (endY - prevY),
  };
}
