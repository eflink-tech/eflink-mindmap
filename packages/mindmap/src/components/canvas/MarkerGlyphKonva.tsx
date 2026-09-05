// 画布端标记图标渲染：按注册表 glyph 描述用 Konva 绘制，(x, y) 为图标中心。
// 与面板端 MarkerIconSvg 共用同一份路径数据（24×24 坐标系，按 size 等比缩放）。
import { Group, Path, Text } from 'react-konva';
import { markerGlyph, type GlyphShape } from '../../core/markers/registry';
import type { Marker } from '../../types/mindmap';

const GLYPH_BOX = 24;

function GlyphPath({ shape }: { shape: GlyphShape }) {
  return (
    <Path
      data={shape.d}
      fill={shape.fill}
      stroke={shape.stroke}
      strokeWidth={shape.strokeWidth}
      strokeLinecap={shape.strokeLinecap}
      listening={false}
    />
  );
}

interface Props {
  marker: Marker;
  /** 图标中心坐标（节点组内局部坐标） */
  x: number;
  y: number;
  /** 渲染边长（px） */
  size: number;
}

export function MarkerGlyphKonva({ marker, x, y, size }: Props) {
  const glyph = markerGlyph(marker);
  const scale = size / GLYPH_BOX;
  return (
    <Group x={x} y={y} listening={false}>
      <Group x={(-GLYPH_BOX / 2) * scale} y={(-GLYPH_BOX / 2) * scale} scaleX={scale} scaleY={scale}>
        {glyph.shapes.map((shape, i) => (
          <GlyphPath key={i} shape={shape} />
        ))}
        {glyph.text && (
          <Text
            text={glyph.text}
            width={GLYPH_BOX}
            height={GLYPH_BOX}
            align="center"
            verticalAlign="middle"
            fontSize={glyph.textFontSize ?? 18}
            fontStyle="bold"
            fill={glyph.textColor}
            listening={false}
          />
        )}
      </Group>
    </Group>
  );
}
