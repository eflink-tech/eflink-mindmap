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
    return `M${x1} ${y1} H${x2}`;
  }
  const cx = (x1 + x2) / 2;
  return `M${x1} ${y1} C${cx} ${y1} ${cx} ${y2} ${x2} ${y2}`;
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
    case 'logic-right':
      return {
        root: { x: 4, y: 18, w: 14, h: 12 },
        children: [
          { x: 40, y: 4, w: 26, h: 8 },
          { x: 40, y: 16, w: 22, h: 8 },
          { x: 40, y: 28, w: 26, h: 8 },
          { x: 40, y: 40, w: 18, h: 8 },
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
    case 'org-down':
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
        root: { x: 4, y: 18, w: 12, h: 12 },
        children: [
          { x: 24, y: 4, w: 12, h: 8 },
          { x: 40, y: 36, w: 12, h: 8 },
          { x: 56, y: 4, w: 12, h: 8 },
        ],
      };
    case 'timeline-v':
      return {
        root: { x: 30, y: 2, w: 12, h: 10 },
        children: [
          { x: 4, y: 16, w: 16, h: 8 },
          { x: 52, y: 24, w: 16, h: 8 },
          { x: 4, y: 36, w: 16, h: 8 },
        ],
      };
    case 'fishbone-right':
      return {
        root: { x: 4, y: 18, w: 12, h: 12 },
        children: [
          { x: 28, y: 4, w: 14, h: 8 },
          { x: 44, y: 36, w: 14, h: 8 },
          { x: 56, y: 4, w: 14, h: 8 },
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
    default:
      return {
        root: { x: 30, y: 18, w: 12, h: 12 },
        children: [],
      };
  }
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

function LayoutSchematic({
  structure,
  defaults,
}: {
  structure: LayoutStructureId;
  defaults: LayoutDefaults;
}) {
  const { root, children } = boxesFor(structure);
  const shape = defaults.shape;
  const type = defaults.connectorType;
  const fill = defaults.borderStyle === 'none' ? 'none' : FILL;
  const strokeDasharray = defaults.borderStyle === 'dashed' ? '2 1.5' : undefined;
  const lineDash = defaults.handDrawn ? '1.5 1.2' : undefined;

  const rootCx = root.x + root.w / 2;
  const rootCy = root.y + root.h / 2;

  return (
    <>
      {structure === 'timeline-h' && (
        <line x1={4} y1={24} x2={68} y2={24} stroke={LINE} strokeWidth={1.2} />
      )}
      {structure === 'timeline-v' && (
        <line x1={36} y1={4} x2={36} y2={44} stroke={LINE} strokeWidth={1.2} />
      )}
      {structure === 'fishbone-right' && (
        <line x1={16} y1={24} x2={68} y2={24} stroke={LINE} strokeWidth={1.4} />
      )}
      {structure === 'brace-right' && (
        <path
          d="M28 8 V40"
          fill="none"
          stroke={LINE}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      )}
      {children.map((c, i) => {
        const cy = c.y + c.h / 2;
        const fromX =
          structure === 'org-down' || structure === 'timeline-v' || structure === 'matrix-2x2'
            ? rootCx
            : structure === 'map-balanced' && c.x < root.x
              ? root.x
              : root.x + root.w;
        const fromY =
          structure === 'org-down' ? root.y + root.h : rootCy;
        const toX =
          structure === 'org-down'
            ? c.x + c.w / 2
            : structure === 'map-balanced' && c.x < root.x
              ? c.x + c.w
              : c.x;
        const toY = structure === 'org-down' ? c.y : cy;
        if (structure === 'matrix-2x2') return null;
        return (
          <path
            key={`c-${i}`}
            d={connectorD(fromX, fromY, toX, toY, type)}
            fill="none"
            stroke={LINE}
            strokeWidth={1.15}
            strokeDasharray={lineDash}
            strokeLinecap="round"
          />
        );
      })}
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
