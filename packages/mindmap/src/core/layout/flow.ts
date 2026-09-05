// src/core/layout/flow.ts
// 选中节点流动动画的几何：把连线/联系线路径采样为折线（带累计弧长），
// 供蓝点按弧长匀速移动（对齐 ProcessOn 的选中流动效果）
import type { LayoutResult, MindMapDocument, ThemeConfig } from '../../types/mindmap';
import {
  curvePath,
  inferConnectorDir,
  resolveConnectorAppearance,
  resolveRenderedConnectorD,
} from '../style/connectorStyle';
import { relationPath } from './overlays';

export interface FlowPolyline {
  pts: number[]; // [x0, y0, x1, y1, ...]
  cum: number[]; // 累计弧长，与 pts 的点一一对应，首项为 0
  length: number;
}

/** 解析自产路径字符串（M/L/Q/C 绝对指令）为折线并累计弧长；Q/C 用密集采样逼近 */
export function samplePathD(d: string): FlowPolyline {
  const pts: number[] = [];
  const cum: number[] = [];
  const push = (x: number, y: number) => {
    const n = pts.length;
    const step = n === 0 ? 0 : Math.hypot(x - pts[n - 2], y - pts[n - 1]);
    pts.push(x, y);
    cum.push((cum.length ? cum[cum.length - 1] : 0) + step);
  };
  const re = /([MLQC])[^MLQC]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const nums = (m[0].slice(1).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    if (m[1] === 'M' || m[1] === 'L') {
      for (let i = 0; i + 1 < nums.length; i += 2) push(nums[i], nums[i + 1]);
    } else if (m[1] === 'Q') {
      const [cx, cy, ex, ey] = nums;
      const sx = pts[pts.length - 2];
      const sy = pts[pts.length - 1];
      for (let i = 1; i <= 12; i += 1) {
        const t = i / 12;
        const u = 1 - t;
        push(u * u * sx + 2 * u * t * cx + t * t * ex, u * u * sy + 2 * u * t * cy + t * t * ey);
      }
    } else {
      const [c1x, c1y, c2x, c2y, ex, ey] = nums;
      const sx = pts[pts.length - 2];
      const sy = pts[pts.length - 1];
      for (let i = 1; i <= 16; i += 1) {
        const t = i / 16;
        const u = 1 - t;
        push(
          u * u * u * sx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex,
          u * u * u * sy + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey,
        );
      }
    }
  }
  return { pts, cum, length: cum[cum.length - 1] ?? 0 };
}

/** 按弧长取折线上的点（线性插值，越界截断到端点） */
export function pointAtDistance(f: FlowPolyline, dist: number): { x: number; y: number } {
  const { pts, cum } = f;
  if (cum.length < 2) return { x: pts[0] ?? 0, y: pts[1] ?? 0 };
  const total = cum[cum.length - 1];
  const dd = Math.max(0, Math.min(total, dist));
  let lo = 1;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < dd) lo = mid + 1;
    else hi = mid;
  }
  const t0 = cum[lo - 1];
  const t1 = cum[lo];
  const t = t1 > t0 ? (dd - t0) / (t1 - t0) : 0;
  return {
    x: pts[(lo - 1) * 2] + t * (pts[lo * 2] - pts[(lo - 1) * 2]),
    y: pts[(lo - 1) * 2 + 1] + t * (pts[lo * 2 + 1] - pts[(lo - 1) * 2 + 1]),
  };
}

/**
 * 选中节点出发的流动路径：直达子级的连线 + 与选中节点相连的联系线。
 * 联系线一律从选中节点一端画向另一端（流动方向向外）；
 * 子节点被折叠或联系线另一端不可见时跳过。
 */
export function buildFlowPaths(
  doc: MindMapDocument,
  layout: LayoutResult,
  selectedId: string,
  theme: ThemeConfig,
): FlowPolyline[] {
  const out: FlowPolyline[] = [];
  const fromBox = layout.positions[selectedId];
  if (!fromBox) return out;

  for (const childId of doc.nodes[selectedId]?.children ?? []) {
    const toBox = layout.positions[childId];
    if (!toBox) continue;
    const conn = layout.connectors.find((c) => c.from === selectedId && c.to === childId);
    const style = resolveConnectorAppearance(doc, selectedId, childId, theme);
    const dir = conn?.dir ?? inferConnectorDir(fromBox, toBox);
    const d = resolveRenderedConnectorD(
      doc,
      conn?.d ?? curvePath(fromBox, toBox, dir),
      fromBox,
      toBox,
      dir,
      style,
    );
    out.push(samplePathD(d));
  }

  for (const rel of doc.relations) {
    if (rel.from !== selectedId && rel.to !== selectedId) continue;
    const other = rel.from === selectedId ? rel.to : rel.from;
    const otherBox = layout.positions[other];
    if (!otherBox) continue;
    out.push(samplePathD(relationPath(fromBox, otherBox).d));
  }
  return out;
}
