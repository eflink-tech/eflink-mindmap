// 布局预设缩略图：按 structure + defaults.shape 绘制灰块+连线示意
import type { ReactElement, ReactNode } from 'react';
import type { LayoutPreset } from '../../../core/layout/presets';
import type { ConnectorLineType, LayoutDefaults, LayoutStructureId, NodeShape } from '../../../types/mindmap';

const FILL = '#cbd5e1';
const STROKE = '#64748b';
const LINE = '#94a3b8';

interface NodeBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function nodePath(box: NodeBox, shape: NodeShape | undefined): ReactElement {
  const { x, y, w, h } = box;
  const s = shape ?? 'rounded';
  if (s === 'ellipse') {
    return <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} />;
  }
  if (s === 'hexagon') {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const pts = [
      [cx, y],
      [x + w, cy - h * 0.22],
      [x + w, cy + h * 0.22],
      [cx, y + h],
      [x, cy + h * 0.22],
      [x, cy - h * 0.22],
    ];
    return <polygon points={pts.map((p) => p.join(',')).join(' ')} />;
  }
  const rx = s === 'pill' ? h / 2 : s === 'rectangle' ? 1 : 2.5;
  return <rect x={x} y={y} width={w} height={h} rx={rx} />;
}

function connectorD(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: ConnectorLineType | undefined,
): string {
  if (type === 'elbow') {
    const mx = (x1 + x2) / 2;
    return `M${x1} ${y1} H${mx} V${y2} H${x2}`;
  }
  if (type === 'straight') {
    return `M${x1} ${y1} L${x2} ${y2}`;
  }
  if (type === 'brace') {
    if (Math.abs(y2 - y1) > Math.abs(x2 - x1)) {
      const gap = Math.abs(y2 - y1);
      const arm = Math.min(8, gap * 0.35);
      const spineY = y2 - Math.sign(y2 - y1 || 1) * arm;
      return `M${x1} ${y1} V${spineY} H${x2} V${y2}`;
    }
    return `M${x1} ${y1} H${x2}`;
  }
  const cx = (x1 + x2) / 2;
  return `M${x1} ${y1} C${cx} ${y1} ${cx} ${y2} ${x2} ${y2}`;
}

/** 矩阵缩略图：根标题置顶 + rows×cols 单元格 */
function gridBoxes(
  rows: number,
  cols: number,
  header: 'top' | 'left' = 'top',
): { root: NodeBox; children: NodeBox[] } {
  const left = header === 'left' ? 20 : 4;
  const right = 68;
  const top = header === 'left' ? 5 : 12;
  const bottom = header === 'left' ? 49 : 46;
  const gap = 2;
  const cellW = (right - left - gap * (cols - 1)) / cols;
  const cellH = (bottom - top - gap * (rows - 1)) / rows;
  const children: NodeBox[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      children.push({
        x: left + c * (cellW + gap),
        y: top + r * (cellH + gap),
        w: cellW,
        h: cellH,
      });
    }
  }
  const root: NodeBox =
    header === 'left'
      ? { x: 2, y: 22, w: 14, h: 8 }
      : { x: 28, y: 2, w: 16, h: 7 };
  return { root, children };
}

function boxesFor(structure: LayoutStructureId): { root: NodeBox; children: NodeBox[] } {
  switch (structure) {
    case 'map-balanced':
      return {
        root: { x: 30, y: 18, w: 12, h: 12 },
        children: [
          { x: 4, y: 6, w: 14, h: 8 },
          { x: 4, y: 34, w: 14, h: 8 },
          { x: 54, y: 6, w: 14, h: 8 },
          { x: 54, y: 34, w: 14, h: 8 },
        ],
      };
    case 'map-right':
      return {
        root: { x: 4, y: 18, w: 14, h: 12 },
        children: [
          { x: 42, y: 4, w: 14, h: 8 },
          { x: 50, y: 20, w: 14, h: 8 },
          { x: 42, y: 36, w: 14, h: 8 },
        ],
      };
    case 'map-left':
      return {
        root: { x: 54, y: 18, w: 14, h: 12 },
        children: [
          { x: 16, y: 4, w: 14, h: 8 },
          { x: 8, y: 20, w: 14, h: 8 },
          { x: 16, y: 36, w: 14, h: 8 },
        ],
      };
    case 'map-down':
      return {
        root: { x: 29, y: 2, w: 14, h: 10 },
        children: [
          { x: 4, y: 30, w: 18, h: 10 },
          { x: 27, y: 30, w: 18, h: 10 },
          { x: 50, y: 30, w: 18, h: 10 },
        ],
      };
    case 'map-up':
      return {
        root: { x: 29, y: 36, w: 14, h: 10 },
        children: [
          { x: 4, y: 8, w: 18, h: 10 },
          { x: 27, y: 8, w: 18, h: 10 },
          { x: 50, y: 8, w: 18, h: 10 },
        ],
      };
    case 'logic-right':
    case 'org-right':
      return {
        root: { x: 4, y: 18, w: 14, h: 12 },
        children: [
          { x: 40, y: 4, w: 26, h: 8 },
          { x: 40, y: 16, w: 22, h: 8 },
          { x: 40, y: 28, w: 26, h: 8 },
          { x: 40, y: 40, w: 18, h: 8 },
        ],
      };
    case 'logic-left':
    case 'org-left':
    case 'tree-left':
      return {
        root: { x: 54, y: 18, w: 14, h: 12 },
        children: [
          { x: 6, y: 4, w: 26, h: 8 },
          { x: 10, y: 16, w: 22, h: 8 },
          { x: 6, y: 28, w: 26, h: 8 },
          { x: 14, y: 40, w: 18, h: 8 },
        ],
      };
    case 'logic-down':
    case 'tree-down':
      return {
        root: { x: 29, y: 2, w: 14, h: 10 },
        children: [
          { x: 4, y: 30, w: 18, h: 10 },
          { x: 27, y: 30, w: 18, h: 10 },
          { x: 50, y: 30, w: 18, h: 10 },
        ],
      };
    case 'logic-up':
    case 'org-up':
    case 'tree-up':
      return {
        root: { x: 29, y: 36, w: 14, h: 10 },
        children: [
          { x: 4, y: 8, w: 18, h: 10 },
          { x: 27, y: 8, w: 18, h: 10 },
          { x: 50, y: 8, w: 18, h: 10 },
        ],
      };
    case 'logic-balanced':
    case 'org-balanced':
    case 'tree-balanced':
      return {
        root: { x: 30, y: 19, w: 12, h: 10 },
        children: [
          { x: 4, y: 5, w: 14, h: 8 },
          { x: 4, y: 27, w: 14, h: 8 },
          { x: 54, y: 5, w: 14, h: 8 },
          { x: 54, y: 27, w: 14, h: 8 },
        ],
      };
    case 'logic-outline':
      return {
        root: { x: 4, y: 2, w: 20, h: 7 },
        children: [
          { x: 16, y: 13, w: 20, h: 6 },
          { x: 24, y: 22, w: 18, h: 6 },
          { x: 16, y: 31, w: 20, h: 6 },
          { x: 24, y: 40, w: 16, h: 6 },
        ],
      };
    case 'map-radial':
    case 'org-radial':
    case 'tree-radial':
      return {
        root: { x: 29, y: 19, w: 14, h: 10 },
        children: [
          { x: 29, y: 2, w: 14, h: 7 },
          { x: 54, y: 10, w: 14, h: 7 },
          { x: 54, y: 31, w: 14, h: 7 },
          { x: 29, y: 39, w: 14, h: 7 },
          { x: 4, y: 31, w: 14, h: 7 },
          { x: 4, y: 10, w: 14, h: 7 },
        ],
      };
    case 'brace-right':
      return {
        root: { x: 4, y: 18, w: 16, h: 12 },
        children: [
          { x: 44, y: 4, w: 24, h: 8 },
          { x: 44, y: 20, w: 24, h: 8 },
          { x: 44, y: 36, w: 24, h: 8 },
        ],
      };
    case 'brace-left':
      return {
        root: { x: 52, y: 18, w: 16, h: 12 },
        children: [
          { x: 4, y: 4, w: 24, h: 8 },
          { x: 4, y: 20, w: 24, h: 8 },
          { x: 4, y: 36, w: 24, h: 8 },
        ],
      };
    case 'brace-balanced':
      return {
        root: { x: 29, y: 18, w: 14, h: 12 },
        children: [
          { x: 4, y: 6, w: 16, h: 8 },
          { x: 4, y: 34, w: 16, h: 8 },
          { x: 52, y: 6, w: 16, h: 8 },
          { x: 52, y: 34, w: 16, h: 8 },
        ],
      };
    case 'brace-down':
      return {
        root: { x: 29, y: 2, w: 14, h: 10 },
        children: [
          { x: 4, y: 32, w: 18, h: 10 },
          { x: 27, y: 32, w: 18, h: 10 },
          { x: 50, y: 32, w: 18, h: 10 },
        ],
      };
    case 'brace-up':
      return {
        root: { x: 29, y: 36, w: 14, h: 10 },
        children: [
          { x: 4, y: 6, w: 18, h: 10 },
          { x: 27, y: 6, w: 18, h: 10 },
          { x: 50, y: 6, w: 18, h: 10 },
        ],
      };
    case 'brace-outline':
      return {
        root: { x: 4, y: 2, w: 20, h: 7 },
        children: [
          { x: 16, y: 13, w: 20, h: 6 },
          { x: 24, y: 22, w: 18, h: 6 },
          { x: 16, y: 31, w: 20, h: 6 },
          { x: 24, y: 40, w: 16, h: 6 },
        ],
      };
    case 'org-down':
    case 'org-classic':
      return {
        root: { x: 27, y: 4, w: 18, h: 10 },
        children: [
          { x: 4, y: 32, w: 16, h: 10 },
          { x: 28, y: 32, w: 16, h: 10 },
          { x: 52, y: 32, w: 16, h: 10 },
        ],
      };
    case 'tree-right':
      return {
        root: { x: 4, y: 20, w: 12, h: 10 },
        children: [
          { x: 30, y: 6, w: 14, h: 8 },
          { x: 30, y: 34, w: 14, h: 8 },
          { x: 54, y: 4, w: 14, h: 8 },
          { x: 54, y: 16, w: 14, h: 8 },
        ],
      };
    case 'timeline-h':
      return {
        root: { x: 2, y: 24, w: 12, h: 12 },
        children: [
          { x: 20, y: 4, w: 14, h: 8 },
          { x: 38, y: 36, w: 14, h: 8 },
          { x: 54, y: 4, w: 14, h: 8 },
        ],
      };
    case 'timeline-h-top':
      return {
        root: { x: 2, y: 24, w: 12, h: 12 },
        children: [
          { x: 20, y: 4, w: 14, h: 8 },
          { x: 38, y: 8, w: 14, h: 8 },
          { x: 54, y: 4, w: 14, h: 8 },
        ],
      };
    case 'timeline-h-bottom':
      return {
        root: { x: 2, y: 24, w: 12, h: 12 },
        children: [
          { x: 20, y: 36, w: 14, h: 8 },
          { x: 38, y: 34, w: 14, h: 8 },
          { x: 54, y: 36, w: 14, h: 8 },
        ],
      };
    case 'timeline-v':
      return {
        root: { x: 30, y: 2, w: 12, h: 10 },
        children: [
          { x: 4, y: 14, w: 22, h: 8 },
          { x: 46, y: 24, w: 22, h: 8 },
          { x: 4, y: 34, w: 22, h: 8 },
        ],
      };
    case 'timeline-v-left':
      return {
        root: { x: 30, y: 2, w: 12, h: 10 },
        children: [
          { x: 4, y: 14, w: 22, h: 8 },
          { x: 4, y: 24, w: 22, h: 8 },
          { x: 4, y: 34, w: 22, h: 8 },
        ],
      };
    case 'timeline-v-right':
      return {
        root: { x: 30, y: 2, w: 12, h: 10 },
        children: [
          { x: 46, y: 14, w: 22, h: 8 },
          { x: 46, y: 24, w: 22, h: 8 },
          { x: 46, y: 34, w: 22, h: 8 },
        ],
      };
    case 'matrix-2x2':
      return {
        root: { x: 30, y: 20, w: 12, h: 8 },
        children: [
          { x: 8, y: 4, w: 22, h: 16 },
          { x: 42, y: 4, w: 22, h: 16 },
          { x: 8, y: 28, w: 22, h: 16 },
          { x: 42, y: 28, w: 22, h: 16 },
        ],
      };
    case 'matrix-2x3':
      return gridBoxes(2, 3);
    case 'matrix-3x2':
      return gridBoxes(3, 2);
    case 'matrix-3x3':
      return {
        root: { x: 30, y: 22, w: 12, h: 8 },
        children: [
          { x: 4, y: 4, w: 22, h: 14 },
          { x: 4, y: 19, w: 22, h: 14 },
          { x: 4, y: 34, w: 22, h: 14 },
          { x: 46, y: 4, w: 22, h: 14 },
          { x: 46, y: 19, w: 22, h: 14 },
          { x: 46, y: 34, w: 22, h: 14 },
        ],
      };
    case 'matrix-1x2':
      return gridBoxes(3, 2, 'left');
    case 'matrix-1x3':
      return gridBoxes(2, 3, 'left');
    default:
      return {
        root: { x: 30, y: 18, w: 12, h: 12 },
        children: [],
      };
  }
}

type FishboneStructure = Extract<LayoutStructureId, `fishbone-${string}`>;

interface FishboneThumbConfig {
  head: NodeBox;
  spine: [number, number, number, number];
  ribs: Array<{ base: [number, number]; tip: [number, number] }>;
  /** 中骨（平行鱼脊、指向鱼尾）的单位方向 */
  middle: [number, number];
}

const FISHBONE_THUMBS: Record<FishboneStructure, FishboneThumbConfig> = {
  'fishbone-rl': {
    head: { x: 58, y: 19, w: 12, h: 10 },
    spine: [58, 24, 8, 24],
    ribs: [
      { base: [48, 24], tip: [36, 9] },
      { base: [36, 24], tip: [24, 39] },
      { base: [24, 24], tip: [12, 9] },
    ],
    middle: [-1, 0],
  },
  'fishbone-lr': {
    head: { x: 2, y: 19, w: 12, h: 10 },
    spine: [14, 24, 64, 24],
    ribs: [
      { base: [24, 24], tip: [36, 9] },
      { base: [36, 24], tip: [48, 39] },
      { base: [48, 24], tip: [60, 9] },
    ],
    middle: [1, 0],
  },
  'fishbone-bt': {
    head: { x: 30, y: 38, w: 12, h: 8 },
    spine: [36, 38, 36, 5],
    ribs: [
      { base: [36, 31], tip: [22, 20] },
      { base: [36, 21], tip: [50, 12] },
      { base: [36, 11], tip: [24, 4] },
    ],
    middle: [0, -1],
  },
  'fishbone-tb': {
    head: { x: 30, y: 2, w: 12, h: 8 },
    spine: [36, 10, 36, 44],
    ribs: [
      { base: [36, 17], tip: [22, 28] },
      { base: [36, 27], tip: [50, 34] },
      { base: [36, 37], tip: [24, 42] },
    ],
    middle: [0, 1],
  },
  'fishbone-6m': {
    head: { x: 58, y: 19, w: 12, h: 10 },
    spine: [58, 24, 8, 24],
    ribs: [
      { base: [48, 24], tip: [38, 9] },
      { base: [48, 24], tip: [38, 39] },
      { base: [34, 24], tip: [24, 9] },
      { base: [34, 24], tip: [24, 39] },
      { base: [20, 24], tip: [10, 9] },
      { base: [20, 24], tip: [10, 39] },
    ],
    middle: [-1, 0],
  },
  'fishbone-6m-effect': {
    head: { x: 58, y: 19, w: 12, h: 10 },
    spine: [58, 24, 8, 24],
    ribs: [
      { base: [48, 24], tip: [38, 9] },
      { base: [48, 24], tip: [38, 39] },
      { base: [34, 24], tip: [24, 9] },
      { base: [34, 24], tip: [24, 39] },
      { base: [20, 24], tip: [10, 9] },
      { base: [20, 24], tip: [10, 39] },
    ],
    middle: [-1, 0],
  },
  'fishbone-comb': {
    head: { x: 58, y: 19, w: 12, h: 10 },
    spine: [58, 24, 8, 24],
    ribs: [
      { base: [50, 24], tip: [50, 9] },
      { base: [38, 24], tip: [38, 39] },
      { base: [26, 24], tip: [26, 9] },
    ],
    middle: [-1, 0],
  },
};

const FB_LABEL_W = 11;
const FB_LABEL_H = 6;

function FishboneSchematic({ structure }: { structure: FishboneStructure }) {
  const cfg = FISHBONE_THUMBS[structure];
  const [sx1, sy1, sx2, sy2] = cfg.spine;
  const [mx, my] = cfg.middle;
  return (
    <>
      <line
        x1={sx1}
        y1={sy1}
        x2={sx2}
        y2={sy2}
        stroke={LINE}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      {cfg.ribs.map((rib, i) => {
        const [bx, by] = rib.base;
        const [tx, ty] = rib.tip;
        return (
          <g key={`fb-${i}`}>
            <line
              x1={bx}
              y1={by}
              x2={tx}
              y2={ty}
              stroke={LINE}
              strokeWidth={1.1}
              strokeLinecap="round"
            />
            {[0.34, 0.68].map((t) => {
              const x = bx + (tx - bx) * t;
              const y = by + (ty - by) * t;
              return (
                <line
                  key={`m-${t}`}
                  x1={x}
                  y1={y}
                  x2={x + mx * 9}
                  y2={y + my * 9}
                  stroke={LINE}
                  strokeWidth={1}
                  strokeLinecap="round"
                />
              );
            })}
            <rect
              x={tx - FB_LABEL_W / 2}
              y={ty - FB_LABEL_H / 2}
              width={FB_LABEL_W}
              height={FB_LABEL_H}
              rx={1}
              fill={FILL}
              stroke={STROKE}
              strokeWidth={1}
            />
          </g>
        );
      })}
      <rect
        x={cfg.head.x}
        y={cfg.head.y}
        width={cfg.head.w}
        height={cfg.head.h}
        rx={1.5}
        fill={FILL}
        stroke={STROKE}
        strokeWidth={1}
      />
    </>
  );
}

const WBS_ROOT: NodeBox = { x: 29, y: 2, w: 14, h: 6 };
const WBS_COLUMNS: Array<{ left: number; items: NodeBox[] }> = [
  {
    left: 6,
    items: [
      { x: 6, y: 14, w: 22, h: 5 },
      { x: 12, y: 22, w: 18, h: 5 },
      { x: 12, y: 30, w: 18, h: 5 },
    ],
  },
  {
    left: 44,
    items: [
      { x: 44, y: 14, w: 22, h: 5 },
      { x: 50, y: 22, w: 18, h: 5 },
      { x: 50, y: 30, w: 18, h: 5 },
    ],
  },
];

/** WBS 缩略图：根下按列分组，列内逐级缩进堆叠 */
function WbsSchematic() {
  const rootCx = WBS_ROOT.x + WBS_ROOT.w / 2;
  const rootBottom = WBS_ROOT.y + WBS_ROOT.h;
  const busY = rootBottom + 3;
  return (
    <>
      {WBS_COLUMNS.map((col, ci) => {
        const first = col.items[0];
        const cx = first.x + first.w / 2;
        const spineX = col.left + 4;
        const ys = col.items.map((it) => it.y + it.h / 2);
        return (
          <g key={`wbs-col-${ci}`}>
            <path
              d={`M${rootCx} ${rootBottom} V${busY} H${cx} V${first.y}`}
              fill="none"
              stroke={LINE}
              strokeWidth={1.1}
              strokeLinecap="round"
            />
            <line
              x1={spineX}
              y1={first.y + first.h}
              x2={spineX}
              y2={Math.max(...ys)}
              stroke={LINE}
              strokeWidth={1.1}
            />
            {col.items.map((it, ii) => (
              <line
                key={`wbs-arm-${ii}`}
                x1={spineX}
                y1={it.y + it.h / 2}
                x2={it.x}
                y2={it.y + it.h / 2}
                stroke={LINE}
                strokeWidth={1}
              />
            ))}
          </g>
        );
      })}
      <g fill={FILL} stroke={STROKE} strokeWidth={1}>
        <rect
          x={WBS_ROOT.x}
          y={WBS_ROOT.y}
          width={WBS_ROOT.w}
          height={WBS_ROOT.h}
          rx={2}
        />
        {WBS_COLUMNS.flatMap((col, ci) =>
          col.items.map((it, ii) => (
            <rect
              key={`wbs-${ci}-${ii}`}
              x={it.x}
              y={it.y}
              width={it.w}
              height={it.h}
              rx={1.5}
            />
          )),
        )}
      </g>
    </>
  );
}

function extraDecor(root: NodeBox, defaults: LayoutDefaults): ReactNode {
  if (defaults.rootDecoration === 'heart') {
    const cx = root.x + root.w / 2;
    const cy = root.y - 1;
    return (
      <path
        d={`M${cx} ${cy + 5} C${cx - 6} ${cy - 2} ${cx - 3} ${cy - 6} ${cx} ${cy - 2} C${cx + 3} ${cy - 6} ${cx + 6} ${cy - 2} ${cx} ${cy + 5}Z`}
        fill="#94a3b8"
        stroke="none"
      />
    );
  }
  if (defaults.rootDecoration === 'quote') {
    return (
      <text x={root.x + 2} y={root.y + root.h / 2 + 3} fontSize={10} fill={STROKE}>
        ”
      </text>
    );
  }
  return null;
}

type ThumbFlow =
  | 'right'
  | 'left'
  | 'down'
  | 'up'
  | 'balanced'
  | 'radial'
  | 'none';

function thumbnailFlow(structure: LayoutStructureId): ThumbFlow {
  switch (structure) {
    case 'map-balanced':
    case 'brace-balanced':
    case 'logic-balanced':
    case 'org-balanced':
    case 'tree-balanced':
      return 'balanced';
    case 'map-left':
    case 'brace-left':
    case 'logic-left':
    case 'org-left':
    case 'tree-left':
      return 'left';
    case 'map-down':
    case 'brace-down':
    case 'logic-down':
    case 'org-down':
    case 'org-classic':
    case 'tree-down':
    case 'tree-wbs':
      return 'down';
    case 'map-up':
    case 'brace-up':
    case 'logic-up':
    case 'org-up':
    case 'tree-up':
      return 'up';
    case 'map-radial':
    case 'org-radial':
    case 'tree-radial':
      return 'radial';
    case 'brace-outline':
    case 'logic-outline':
    case 'timeline-h':
    case 'timeline-h-top':
    case 'timeline-h-bottom':
    case 'timeline-v':
    case 'timeline-v-left':
    case 'timeline-v-right':
    case 'matrix-2x2':
    case 'matrix-2x3':
    case 'matrix-3x2':
    case 'matrix-3x3':
    case 'matrix-1x2':
    case 'matrix-1x3':
      return 'none';
    default:
      return 'right';
  }
}

function isHTimeline(structure: LayoutStructureId): boolean {
  return (
    structure === 'timeline-h' ||
    structure === 'timeline-h-top' ||
    structure === 'timeline-h-bottom'
  );
}

/** 横向括号的竖脊：每侧一条，落在子节点与父节点之间 */
function braceSpines(
  structure: LayoutStructureId,
  root: NodeBox,
  children: NodeBox[],
): ReactElement[] {
  if (
    structure !== 'brace-right' &&
    structure !== 'brace-left' &&
    structure !== 'brace-balanced'
  ) {
    return [];
  }
  const rootCx = root.x + root.w / 2;
  const groups: Array<{ side: 'left' | 'right'; boxes: NodeBox[] }> = [];
  if (structure === 'brace-right') groups.push({ side: 'right', boxes: children });
  else if (structure === 'brace-left') groups.push({ side: 'left', boxes: children });
  else {
    groups.push({
      side: 'left',
      boxes: children.filter((c) => c.x + c.w / 2 < rootCx),
    });
    groups.push({
      side: 'right',
      boxes: children.filter((c) => c.x + c.w / 2 > rootCx),
    });
  }
  return groups
    .filter((g) => g.boxes.length > 0)
    .map((g) => {
      const near =
        g.side === 'right'
          ? Math.min(...g.boxes.map((b) => b.x))
          : Math.max(...g.boxes.map((b) => b.x + b.w));
      const rootEdge = g.side === 'right' ? root.x + root.w : root.x;
      const arm = Math.min(12, Math.max(4, Math.abs(near - rootEdge) * 0.35));
      const x = g.side === 'right' ? near - arm : near + arm;
      const ys = g.boxes.map((b) => b.y + b.h / 2);
      return (
        <line
          key={`spine-${g.side}`}
          x1={x}
          y1={Math.min(...ys)}
          x2={x}
          y2={Math.max(...ys)}
          stroke={LINE}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      );
    });
}

function isVTimeline(structure: LayoutStructureId): boolean {
  return (
    structure === 'timeline-v' ||
    structure === 'timeline-v-left' ||
    structure === 'timeline-v-right'
  );
}

function LayoutSchematic({
  structure,
  defaults,
}: {
  structure: LayoutStructureId;
  defaults: LayoutDefaults;
}) {
  if (structure.startsWith('fishbone-')) {
    return <FishboneSchematic structure={structure as FishboneStructure} />;
  }
  if (structure === 'tree-wbs') {
    return <WbsSchematic />;
  }
  const { root, children } = boxesFor(structure);
  const shape = defaults.shape;
  const type = defaults.connectorType;
  const fill = defaults.borderStyle === 'none' ? 'none' : FILL;
  const strokeDasharray = defaults.borderStyle === 'dashed' ? '2 1.5' : undefined;
  const lineDash = defaults.handDrawn ? '1.5 1.2' : undefined;

  const rootCx = root.x + root.w / 2;
  const rootCy = root.y + root.h / 2;
  const flow = thumbnailFlow(structure);

  const connector = (c: NodeBox): ReactElement | null => {
    const cy = c.y + c.h / 2;
    if (flow === 'radial') {
      return (
        <line
          x1={rootCx}
          y1={rootCy}
          x2={c.x + c.w / 2}
          y2={cy}
          stroke={LINE}
          strokeWidth={1.1}
        />
      );
    }
    if (flow === 'none') return null;
    let fromX = root.x + root.w;
    let fromY = rootCy;
    let toX = c.x;
    let toY = cy;
    const dir: ConnectorLineType | undefined = type;
    if (flow === 'left' || (flow === 'balanced' && c.x < root.x)) {
      fromX = root.x + root.w;
      toX = c.x + c.w;
      if (flow === 'left') fromX = root.x;
    }
    if (flow === 'down') {
      fromX = rootCx;
      fromY = root.y + root.h;
      toX = c.x + c.w / 2;
      toY = c.y;
    } else if (flow === 'up') {
      fromX = rootCx;
      fromY = root.y;
      toX = c.x + c.w / 2;
      toY = c.y + c.h;
    }
    if (flow === 'balanced') {
      if (c.x < root.x) {
        fromX = root.x;
        toX = c.x + c.w;
      } else {
        fromX = root.x + root.w;
        toX = c.x;
      }
    }
    return (
      <path
        d={connectorD(fromX, fromY, toX, toY, dir)}
        fill="none"
        stroke={LINE}
        strokeWidth={1.15}
        strokeDasharray={lineDash}
        strokeLinecap="round"
      />
    );
  };

  return (
    <>
      {isHTimeline(structure) && (
        <line x1={2} y1={30} x2={70} y2={30} stroke={LINE} strokeWidth={1.2} />
      )}
      {isVTimeline(structure) && (
        <line x1={36} y1={12} x2={36} y2={46} stroke={LINE} strokeWidth={1.2} />
      )}
      {isHTimeline(structure) &&
        children.map((c, i) => (
          <line
            key={`th-${i}`}
            x1={c.x + c.w / 2}
            y1={30}
            x2={c.x + c.w / 2}
            y2={c.y + c.h / 2 < 30 ? c.y + c.h : c.y}
            stroke={LINE}
            strokeWidth={1.1}
          />
        ))}
      {isVTimeline(structure) &&
        children.map((c, i) => (
          <line
            key={`tv-${i}`}
            x1={36}
            y1={c.y + c.h / 2}
            x2={c.x + c.w / 2 < 36 ? c.x + c.w : c.x}
            y2={c.y + c.h / 2}
            stroke={LINE}
            strokeWidth={1.1}
          />
        ))}
      {braceSpines(structure, root, children)}
      {!isHTimeline(structure) &&
        !isVTimeline(structure) &&
        children.map((c, i) => (
          <g key={`c-${i}`}>{connector(c)}</g>
        ))}
      <g fill={fill} stroke={STROKE} strokeWidth={1} strokeDasharray={strokeDasharray}>
        {nodePath(root, shape)}
        {children.map((c, i) => (
          <g key={`n-${i}`}>{nodePath(c, shape)}</g>
        ))}
      </g>
      {extraDecor(root, defaults)}
    </>
  );
}

export function LayoutThumbnail({
  preset,
  className = 'h-auto w-full',
}: {
  preset: LayoutPreset;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 72 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <LayoutSchematic structure={preset.structure} defaults={preset.defaults} />
    </svg>
  );
}
