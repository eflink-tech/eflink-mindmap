// src/components/canvas/NodeRenderer.tsx
import { useCallback, useRef, useState } from 'react';
import { Circle, Ellipse, Group, Line, Path, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { NodeShape } from '../../types/mindmap';
import { findDropTarget } from '../../core/editor/dragOps';
import { branchSide, growthAxis } from '../../core/editor/navigation';
import { moveNode, subtreeIds, toggleCollapse } from '../../core/editor/nodeOps';
import { getStructure } from '../../core/layout/structures';
import { MARKER_GAP, iconSizeOf, markerId, markersRowWidth } from '../../core/markers/registry';
import {
  LABEL_CHIP_FONT, LABEL_CHIP_HEIGHT, LABEL_CHIP_PAD_X, LABEL_ROW_GAP,
  canvasWidthOf, labelsRowWidth, measureNode,
} from '../../core/layout/measure';
import { resolveNodeStyle } from '../../core/style/apply';
import { getCanvasOptions } from '../../core/style/canvasOptions';
import { getTheme } from '../../core/style/themes';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';
import { MarkerGlyphKonva } from './MarkerGlyphKonva';

// 悬停描边色：对齐 XMind 的浅蓝鼠标经过效果
const HOVER_COLOR = '#7CB8F0';

/** 水平六边形顶点（局部坐标，中心 cx/cy） */
function hexagonPoints(cx: number, cy: number, w: number, h: number): number[] {
  const insetY = h * 0.22;
  return [
    cx, cy - h / 2,
    cx + w / 2, cy - insetY,
    cx + w / 2, cy + insetY,
    cx, cy + h / 2,
    cx - w / 2, cy + insetY,
    cx - w / 2, cy - insetY,
  ];
}

function fillCornerRadius(shape: NodeShape, h: number): number {
  if (shape === 'pill') return h / 2;
  if (shape === 'rounded') return 8;
  return 0;
}

function heartPathD(cx: number, cy: number, s: number): string {
  return (
    `M ${cx} ${cy + s * 0.4}` +
    ` C ${cx - s} ${cy - s * 0.15}, ${cx - s * 0.45} ${cy - s * 0.9}, ${cx} ${cy - s * 0.25}` +
    ` C ${cx + s * 0.45} ${cy - s * 0.9}, ${cx + s} ${cy - s * 0.15}, ${cx} ${cy + s * 0.4} Z`
  );
}

interface NodeBodyProps {
  shape: NodeShape;
  width: number;
  height: number;
  shapeTop: number;
  shapeCenterY: number;
  pad: number;
  cornerRadius: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
  fillEnabled?: boolean;
  listening?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOpacity?: number;
  shadowForStrokeEnabled?: boolean;
}

function NodeBody({
  shape,
  width,
  height,
  shapeTop,
  shapeCenterY,
  pad,
  cornerRadius,
  ...rest
}: NodeBodyProps) {
  if (shape === 'ellipse') {
    return (
      <Ellipse radiusX={width / 2 + pad} radiusY={height / 2 + pad} y={shapeCenterY} {...rest} />
    );
  }
  if (shape === 'hexagon') {
    return (
      <Line
        points={hexagonPoints(0, shapeCenterY, width + pad * 2, height + pad * 2)}
        closed
        {...rest}
      />
    );
  }
  return (
    <Rect
      x={-width / 2 - pad}
      y={shapeTop - pad}
      width={width + pad * 2}
      height={height + pad * 2}
      cornerRadius={cornerRadius}
      shadowForStrokeEnabled={false}
      {...rest}
    />
  );
}

const setStageCursor = (e: Konva.KonvaEventObject<MouseEvent>, value: string) => {
  const el = e.target.getStage()?.container();
  if (el) el.style.cursor = value;
};

interface Props {
  nodeId: string;
}

function fontStyleOf(weight: 'normal' | 'bold', italic: boolean): string {
  if (weight === 'bold' && italic) return 'italic bold';
  if (italic) return 'italic';
  if (weight === 'bold') return 'bold';
  return 'normal';
}

function textDecorationOf(underline: boolean, strikethrough: boolean): string {
  return [underline ? 'underline' : '', strikethrough ? 'line-through' : '']
    .filter(Boolean)
    .join(' ');
}

export function NodeRenderer({ nodeId }: Props) {
  const doc = useMindMapStore((s) => s.doc)!;
  const box = useMindMapStore((s) => s.layoutResult?.positions[nodeId]);
  const selected = useMindMapStore((s) => s.selectedIds.includes(nodeId));
  // 编辑态由 HTML 浮层接管文字，隐藏 Konva Text 避免重影
  const editing = useMindMapStore((s) => s.editingId === nodeId);
  const preview = useMindMapStore((s) => s.dropPreview);
  const groupRef = useRef<Konva.Group>(null);
  // 悬停状态（对齐 XMind）：悬停时节点出现浅蓝描边，折叠圆圈仅在悬停/折叠时显示
  const [hovered, setHovered] = useState(false);

  const node = doc.nodes[nodeId];
  const theme = getTheme(doc);
  const style = node ? resolveNodeStyle(doc, theme, nodeId) : null;
  const collapsed = !!node?.metadata?.collapsed;
  // 计算节点深度以匹配布局时的字体大小
  let depth = 0;
  if (node && nodeId !== doc.rootId) {
    let cur = node;
    while (cur.parentId !== null && cur.parentId !== doc.rootId) {
      depth++;
      cur = doc.nodes[cur.parentId];
      if (!cur) break;
    }
    depth = cur?.parentId === doc.rootId ? depth + 1 : depth;
  }
  const lines = node
    ? measureNode(node, theme, undefined, depth, getCanvasOptions(doc)).lines
    : [];
  const markers = node?.metadata?.markers ?? [];
  const markersWidth = markersRowWidth(markers);
  // 标签胶囊行占节点底部额外高度：节点形状本身只覆盖文本区域
  const labels = node?.metadata?.labels ?? [];
  const labelsExtra = labels.length ? LABEL_CHIP_HEIGHT + LABEL_ROW_GAP : 0;

  const onDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const pos = e.target.position();
      const store = useMindMapStore.getState();
      const target = findDropTarget(store.doc!, store.layoutResult!.positions, nodeId, pos);
      const prev = store.dropPreview;
      const same = target?.targetId === prev?.targetId && target?.zone === prev?.zone;
      if (!same) store.setDropPreview(target);
    },
    [nodeId],
  );

  const onDragEnd = useCallback(() => {
    const store = useMindMapStore.getState();
    const target = store.dropPreview;
    store.setDropPreview(null);
    if (target) {
      const d = store.doc!;
      const targetNode = d.nodes[target.targetId];
      let parentId: string;
      let index: number;
      if (target.zone === 'child') {
        parentId = target.targetId;
        index = targetNode.children.filter((c) => c !== nodeId).length;
      } else {
        parentId = targetNode.parentId ?? target.targetId;
        const siblings = (d.nodes[parentId]?.children ?? []).filter((c) => c !== nodeId);
        const ti = siblings.indexOf(target.targetId);
        index = target.zone === 'before' ? ti : ti + 1;
      }
      store.act((doc2) => moveNode(doc2, nodeId, parentId, index));
    }
    const b = useMindMapStore.getState().layoutResult?.positions[nodeId];
    if (b && groupRef.current) groupRef.current.position({ x: b.x, y: b.y });
  }, [nodeId]);

  if (!node || !box || !style) return null;
  const shapeH = box.height - labelsExtra;
  const shapeTop = -box.height / 2;
  const shapeCenterY = shapeTop + shapeH / 2;

  const isTarget = preview?.targetId === nodeId;
  // 选中态用独立的「外侧蓝色高亮环」表达（见下方 Ring），节点自身边框保持主题原样，
  // 避免深蓝描边融进蓝/紫等饱和填充色里而看不出选中。
  const strokeWidth = isTarget
    ? Math.max(2, style.borderWidth)
    : style.borderStyle === 'none'
      ? 0
      : style.borderWidth;
  const dash = !isTarget && style.borderStyle === 'dashed' ? [6, 4] : undefined;

  const shapeProps = {
    fill: style.fillColor,
    stroke: isTarget ? '#0EA5E9' : style.borderColor,
    strokeWidth,
    dash,
  };

  return (
    <Group
      ref={groupRef}
      x={box.x}
      y={box.y}
      draggable={node.parentId !== null}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        // 联系线创建模式下点击节点作为连线端点，不改变选中
        const store = useMindMapStore.getState();
        if (useUiStore.getState().linking) {
          store.pickLinkNode(nodeId);
          return;
        }
        // Shift+点击：加入/移出多选（对齐 XMind）；普通点击：单选
        if (e.evt.shiftKey) store.toggleSelect(nodeId);
        else store.select(nodeId);
      }}
      onDblClick={() => useMindMapStore.getState().setEditing(nodeId)}
    >
      <NodeBody
        shape={style.shape}
        width={box.width}
        height={shapeH}
        shapeTop={shapeTop}
        shapeCenterY={shapeCenterY}
        pad={0}
        cornerRadius={fillCornerRadius(style.shape, shapeH)}
        {...shapeProps}
      />
      {nodeId === doc.rootId && style.rootDecoration === 'heart' && (
        <Path
          data={heartPathD(0, shapeTop - 2, Math.min(18, box.width * 0.32))}
          fill="#E11D48"
          listening={false}
        />
      )}
      {nodeId === doc.rootId && style.rootDecoration === 'quote' && (
        <Text
          text={'\u201C'}
          x={-box.width / 2 + 2}
          y={shapeTop - 4}
          fontSize={Math.max(20, style.fontSize + 4)}
          fill="#475569"
          listening={false}
        />
      )}
      {hovered && !selected && (
        // 悬停描边：浅蓝细线画在节点外侧 3px（对齐 XMind 鼠标经过效果），选中环存在时让位
        <NodeBody
          shape={style.shape}
          width={box.width}
          height={shapeH}
          shapeTop={shapeTop}
          shapeCenterY={shapeCenterY}
          pad={3}
          cornerRadius={style.shape === 'pill' ? shapeH / 2 + 2 : style.shape === 'rounded' ? 10 : 2}
          stroke={HOVER_COLOR}
          strokeWidth={2}
          fillEnabled={false}
          listening={false}
        />
      )}
      {selected && (
        // 选中环：画在节点外侧 5px 处并带柔光，任何填充色/画布背景下都清晰可辨
        <NodeBody
          shape={style.shape}
          width={box.width}
          height={shapeH}
          shapeTop={shapeTop}
          shapeCenterY={shapeCenterY}
          pad={5}
          cornerRadius={style.shape === 'pill' ? shapeH / 2 + 3 : style.shape === 'rounded' ? 11 : 2}
          stroke="#2563EB"
          strokeWidth={2}
          fillEnabled={false}
          listening={false}
          shadowColor="#3B82F6"
          shadowBlur={8}
          shadowOpacity={0.55}
        />
      )}
      {!editing && (
        <Text
          x={-box.width / 2 + theme.node.padding[0] + markersWidth}
          y={shapeTop}
          text={lines.join('\n')}
          fontSize={style.fontSize}
          fontFamily={style.fontFamily}
          fontStyle={fontStyleOf(style.fontWeight, style.italic)}
          textDecoration={textDecorationOf(style.underline, style.strikethrough)}
          fill={style.textColor}
          width={box.width - theme.node.padding[0] * 2 - markersWidth}
          height={shapeH}
          align={style.textAlign}
          verticalAlign="middle"
          wrap="none"
          listening={false}
        />
      )}
      {(() => {
        // 标记行：图标沿文字左侧排布、在形状内垂直居中（对齐 XMind）；布局引擎已为标记行预留宽度
        if (!markers.length) return null;
        let cursor = -box.width / 2 + theme.node.padding[0];
        return markers.map((m) => {
          const size = iconSizeOf(m);
          const cx = cursor + size / 2;
          cursor += size + MARKER_GAP;
          return <MarkerGlyphKonva key={markerId(m)} marker={m} x={cx} y={shapeCenterY} size={size} />;
        });
      })()}
      {labels.length > 0 &&
        (() => {
          // 标签胶囊行：节点形状下方居中排布（对齐 XMind）；点击胶囊进入该标签的编辑（替换/删除）
          const total = labelsRowWidth(labels);
          let x = -total / 2;
          const y = shapeTop + shapeH + LABEL_ROW_GAP;
          return labels.map((l, li) => {
            const w = Math.ceil(canvasWidthOf(l, LABEL_CHIP_FONT)) + LABEL_CHIP_PAD_X * 2;
            const chipX = x;
            x += w + LABEL_ROW_GAP;
            return (
              <Group
                key={`${li}-${l}`}
                x={chipX}
                y={y}
                onClick={(e) => {
                  e.cancelBubble = true;
                  useMindMapStore.getState().select(nodeId);
                  useUiStore.getState().openInsertEditor('labels', li);
                }}
                onDblClick={(e) => {
                  e.cancelBubble = true;
                }}
                onMouseEnter={(e) => setStageCursor(e, 'pointer')}
                onMouseLeave={(e) => setStageCursor(e, '')}
              >
                <Rect
                  width={w}
                  height={LABEL_CHIP_HEIGHT}
                  cornerRadius={LABEL_CHIP_HEIGHT / 2}
                  fill="#EEF2F6"
                  stroke="#D5DCE4"
                  strokeWidth={1}
                />
                <Text
                  text={l}
                  x={LABEL_CHIP_PAD_X}
                  width={w - LABEL_CHIP_PAD_X * 2}
                  height={LABEL_CHIP_HEIGHT}
                  fontSize={11}
                  fontFamily={LABEL_CHIP_FONT.replace(/^\d+px\s*/, '')}
                  fill="#475569"
                  align="center"
                  verticalAlign="middle"
                  listening={false}
                />
              </Group>
            );
          });
        })()}
      {(() => {
        // 元数据指示图标：链接/笔记/图片存在时显示在节点右上角；点击打开对应浮层（查看/编辑/删除）。
        // 图标带 22×22 的透明热区（Konva 中 opacity:0 的形状仍可命中），避免字形太小点不中
        const icons = [
          node.metadata?.link ? { ch: '🔗', editor: 'link' as const } : null,
          node.metadata?.note ? { ch: '📝', editor: 'note' as const } : null,
          node.metadata?.image ? { ch: '🖼️', editor: 'image' as const } : null,
        ].filter((x): x is { ch: string; editor: 'link' | 'note' | 'image' } => x !== null);
        if (!icons.length) return null;
        const HIT = 22;
        let x = box.width / 2 + 2;
        const y = shapeTop - HIT + 2;
        return icons.map((ic) => {
          const px = x;
          x += HIT;
          return (
            <Group
              key={ic.editor}
              x={px}
              y={y}
              onClick={(e) => {
                e.cancelBubble = true;
                useMindMapStore.getState().select(nodeId);
                useUiStore.getState().openInsertEditor(ic.editor);
              }}
              onDblClick={(e) => {
                e.cancelBubble = true;
              }}
              onMouseEnter={(e) => setStageCursor(e, 'pointer')}
              onMouseLeave={(e) => setStageCursor(e, '')}
            >
              <Rect width={HIT} height={HIT} opacity={0} />
              <Text text={ic.ch} x={(HIT - 14) / 2} y={(HIT - 14) / 2} fontSize={12} listening={false} />
            </Group>
          );
        });
      })()}
      {(() => {
        // 折叠句柄：非根且有子节点时锚定在子节点生长方向的连线起点（org-down / timeline-v 在正下方）。
        // 对齐 XMind：展开时仅悬停显示，折叠时常驻显示被折叠的后代节点数；点击切换折叠（不计入节点选中）
        if (node.children.length === 0 || nodeId === doc.rootId) return null;
        if (!collapsed && !hovered) return null;
        const hiddenCount = collapsed ? subtreeIds(doc, nodeId).length - 1 : 0;
        const r = collapsed ? (hiddenCount >= 10 ? 11 : 8) : 5;
        const grow: 'left' | 'right' | 'down' =
          growthAxis(getStructure(doc)) === 'down'
            ? 'down'
            : branchSide(doc, nodeId) === 'left'
              ? 'left'
              : 'right';
        // 圆心距节点形状边缘正好一个半径：圆与节点边缘相切、压在连线上（对齐 XMind）
        const hx =
          grow === 'right' ? box.width / 2 + r : grow === 'left' ? -(box.width / 2 + r) : 0;
        const hy =
          grow === 'down' ? shapeTop + shapeH + r : shapeCenterY;
        return (
          <Group
            x={hx}
            y={hy}
            onClick={(e) => {
              e.cancelBubble = true;
              useMindMapStore.getState().act((d) => toggleCollapse(d, nodeId));
            }}
            onDblClick={(e) => {
              e.cancelBubble = true;
            }}
            onMouseEnter={(e) => setStageCursor(e, 'pointer')}
            onMouseLeave={(e) => setStageCursor(e, '')}
          >
            <Circle
              radius={r}
              fill="#FFFFFF"
              stroke={collapsed ? '#CBD5E1' : '#94A3B8'}
              strokeWidth={1.5}
              hitStrokeWidth={16}
            />
            {collapsed && (
              <Text
                text={String(hiddenCount)}
                fontSize={hiddenCount >= 10 ? 9 : 10}
                fill="#64748B"
                width={r * 2}
                height={r * 2}
                x={-r}
                y={-r}
                align="center"
                verticalAlign="middle"
                listening={false}
              />
            )}
          </Group>
        );
      })()}
    </Group>
  );
}
