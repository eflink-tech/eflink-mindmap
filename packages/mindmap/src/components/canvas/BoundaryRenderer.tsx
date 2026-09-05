// src/components/canvas/BoundaryRenderer.tsx
// 外框渲染（对齐 XMind）：灰色虚线圆角矩形一圈一圈向外叠加（两层同心），
// 单击选中 → 蓝色实线 + 边中点手柄 + 左上角「加号」；加号点击/双击左上角标签打开备注输入（BoundaryEditorOverlay）。
// 外框画在连线之下（见 Canvas 分层），填充不遮挡子树连线；点击外框空白区域即选中外框。
import { Fragment } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { Boundary } from '../../types/mindmap';
import { BOUNDARY_CHIP, boundaryRects, type RectBox } from '../../core/layout/overlays';
import { canvasWidthOf } from '../../core/layout/measure';
import { useMindMapStore } from '../../store/mindMapStore';

const SELECTED_COLOR = '#4BA3F5';
const CHIP_FONT = '12px system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

function chipWidth(title: string): number {
  return Math.ceil(canvasWidthOf(title, CHIP_FONT)) + BOUNDARY_CHIP.padX * 2;
}

const setCursor = (e: Konva.KonvaEventObject<MouseEvent>, value: string) => {
  const el = e.target.getStage()?.container();
  if (el) el.style.cursor = value;
};

/** 一层虚线圆角矩形（对齐 XMind 的灰色叠加层） */
function LayerRect({ rect, radius, stroke, listening, onClick }: {
  rect: RectBox;
  radius: number;
  stroke: string;
  listening?: boolean;
  onClick?: () => void;
}) {
  return (
    <Rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      cornerRadius={radius}
      fill="rgba(0, 0, 0, 0.05)"
      stroke={stroke}
      strokeWidth={1.2}
      dash={[6, 5]}
      perfectDrawEnabled={false}
      listening={listening ?? false}
      onClick={onClick}
      onMouseEnter={listening ? (e) => setCursor(e, 'pointer') : undefined}
      onMouseLeave={listening ? (e) => setCursor(e, '') : undefined}
    />
  );
}

export function BoundaryRenderer() {
  const doc = useMindMapStore((s) => s.doc);
  const positions = useMindMapStore((s) => s.layoutResult?.positions);
  const selectedBoundaryId = useMindMapStore((s) => s.selectedBoundaryId);
  const editingBoundaryId = useMindMapStore((s) => s.editingBoundaryId);
  if (!doc || !positions) return null;

  return (
    <>
      {doc.boundaries.map((b: Boundary) => {
        const rects = boundaryRects(doc, positions, b.nodeIds);
        if (!rects) return null;
        const { inner, outer } = rects;
        const selected = selectedBoundaryId === b.id;
        const editing = editingBoundaryId === b.id;

        // 选中态：外层再向外 4px 的蓝色实线 + 四边中点手柄
        const sel = {
          x: outer.x - 4,
          y: outer.y - 4,
          width: outer.width + 8,
          height: outer.height + 8,
        };
        const cx = outer.x + outer.width / 2;
        const cy = outer.y + outer.height / 2;

        // 左上角标签（有备注时常驻显示）
        const chipW = b.title ? chipWidth(b.title) : 0;
        const chipX = outer.x;
        const chipY = outer.y - BOUNDARY_CHIP.height + BOUNDARY_CHIP.overlap;

        // 加号按钮：选中且非编辑态时显示在左上角上方（对齐 XMind）
        const plusSize = 22;
        const plusX = outer.x + 2;
        const plusY = outer.y - plusSize - 8;

        return (
          <Fragment key={b.id}>
            {/* 两层同心叠加：外层先画，内层填充叠加后中心区域略深，形成「一圈一圈」的层次 */}
            <LayerRect
              rect={outer}
              radius={18}
              stroke="#B6BCC3"
              listening={!editing}
              onClick={() => useMindMapStore.getState().selectBoundary(b.id)}
            />
            <LayerRect rect={inner} radius={12} stroke="#A7ADB5" />
            {selected && (
              <>
                <Rect
                  x={sel.x}
                  y={sel.y}
                  width={sel.width}
                  height={sel.height}
                  cornerRadius={22}
                  stroke={SELECTED_COLOR}
                  strokeWidth={2}
                  listening={false}
                />
                {/* 四边中点手柄（视觉对齐 XMind，尺寸调整暂不支持） */}
                {[
                  [cx - 3.5, sel.y - 3.5],
                  [cx - 3.5, sel.y + sel.height - 3.5],
                  [sel.x - 3.5, cy - 3.5],
                  [sel.x + sel.width - 3.5, cy - 3.5],
                ].map(([hx, hy]) => (
                  <Rect
                    key={`${hx}-${hy}`}
                    x={hx}
                    y={hy}
                    width={7}
                    height={7}
                    fill="#FFFFFF"
                    stroke={SELECTED_COLOR}
                    strokeWidth={1.5}
                    listening={false}
                  />
                ))}
              </>
            )}
            {b.title && (
              // 备注标签：单击选中外框，双击进入编辑
              <Group
                onClick={(e) => {
                  e.cancelBubble = true;
                  useMindMapStore.getState().selectBoundary(b.id);
                }}
                onDblClick={(e) => {
                  e.cancelBubble = true;
                  useMindMapStore.getState().setEditingBoundary(b.id);
                }}
                onMouseEnter={(e) => setCursor(e, 'pointer')}
                onMouseLeave={(e) => setCursor(e, '')}
              >
                <Rect
                  x={chipX}
                  y={chipY}
                  width={chipW}
                  height={BOUNDARY_CHIP.height}
                  cornerRadius={4}
                  fill="rgba(132, 137, 143, 0.95)"
                />
                <Text
                  x={chipX}
                  y={chipY}
                  width={chipW}
                  height={BOUNDARY_CHIP.height}
                  text={b.title}
                  fontSize={12}
                  fontFamily="system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif"
                  fill="#1F2937"
                  align="center"
                  verticalAlign="middle"
                  listening={false}
                />
              </Group>
            )}
            {selected && !editing && (
              // 加号：打开备注输入浮层
              <Group
                onClick={(e) => {
                  e.cancelBubble = true;
                  useMindMapStore.getState().setEditingBoundary(b.id);
                }}
                onMouseEnter={(e) => setCursor(e, 'pointer')}
                onMouseLeave={(e) => setCursor(e, '')}
              >
                <Rect
                  x={plusX}
                  y={plusY}
                  width={plusSize}
                  height={plusSize}
                  cornerRadius={5}
                  fill={SELECTED_COLOR}
                  hitStrokeWidth={8}
                />
                <Text
                  x={plusX}
                  y={plusY}
                  width={plusSize}
                  height={plusSize}
                  text="+"
                  fontSize={17}
                  fontStyle="bold"
                  fill="#FFFFFF"
                  align="center"
                  verticalAlign="middle"
                  listening={false}
                />
              </Group>
            )}
          </Fragment>
        );
      })}
    </>
  );
}
