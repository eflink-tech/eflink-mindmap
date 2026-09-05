// src/components/canvas/RelationRenderer.tsx
// 联系线渲染：红色虚线曲线 + 居中标签；点击选中（Delete 删除），对齐 XMind 的选中/删除方式
import { Arrow, Line, Text } from 'react-konva';
import type Konva from 'konva';
import { quadPoints, relationPath } from '../../core/layout/overlays';
import { useMindMapStore } from '../../store/mindMapStore';

// 选中态：线下垫一层半透明宽描边作为高亮光晕
const SELECT_HALO_WIDTH = 9;

export function RelationRenderer() {
  const doc = useMindMapStore((s) => s.doc);
  const positions = useMindMapStore((s) => s.layoutResult?.positions);
  const selectedRelationId = useMindMapStore((s) => s.selectedRelationId);
  if (!doc || !positions) return null;

  const setCursor = (e: Konva.KonvaEventObject<MouseEvent>, value: string) => {
    const el = e.target.getStage()?.container();
    if (el) el.style.cursor = value;
  };

  return (
    <>
      {doc.relations.map((r) => {
        const fromBox = positions[r.from];
        const toBox = positions[r.to];
        if (!fromBox || !toBox) return null;
        const geo = relationPath(fromBox, toBox);
        const color = r.style?.color ?? '#F43F5E';
        const selected = selectedRelationId === r.id;
        const width = r.style?.width ?? 2;
        return (
          <Arrow
            key={r.id}
            points={quadPoints(geo.start, geo.control, geo.end)}
            stroke={color}
            strokeWidth={selected ? width + 0.5 : width}
            fill={color}
            dash={[6, 6]}
            pointerLength={10}
            pointerWidth={8}
            hitStrokeWidth={16}
            opacity={selected ? 1 : 0.9}
            onMouseEnter={(e) => setCursor(e, 'pointer')}
            onMouseLeave={(e) => setCursor(e, '')}
            onClick={(e) => {
              e.cancelBubble = true;
              useMindMapStore.getState().selectRelation(r.id);
            }}
          />
        );
      })}
      {doc.relations.map((r) => {
        if (selectedRelationId !== r.id) return null;
        const fromBox = positions[r.from];
        const toBox = positions[r.to];
        if (!fromBox || !toBox) return null;
        const geo = relationPath(fromBox, toBox);
        const color = r.style?.color ?? '#F43F5E';
        return (
          <Line
            key={`${r.id}-halo`}
            listening={false}
            points={quadPoints(geo.start, geo.control, geo.end)}
            stroke={color}
            strokeWidth={SELECT_HALO_WIDTH}
            opacity={0.18}
            lineCap="round"
            lineJoin="round"
          />
        );
      })}
      {doc.relations.map((r) => {
        if (!r.label) return null;
        const fromBox = positions[r.from];
        const toBox = positions[r.to];
        if (!fromBox || !toBox) return null;
        const geo = relationPath(fromBox, toBox);
        return (
          <Text
            key={`${r.id}-label`}
            x={geo.labelPosition.x - 40}
            y={geo.labelPosition.y - 10}
            width={80}
            text={r.label}
            fontSize={12}
            fill="#475569"
            align="center"
            listening={false}
          />
        );
      })}
    </>
  );
}
