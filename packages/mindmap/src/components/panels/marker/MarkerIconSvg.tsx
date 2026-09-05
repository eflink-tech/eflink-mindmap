// 面板端标记图标（SVG）：与画布端 MarkerGlyphKonva 共用注册表的路径数据。
import { markerGlyph } from '../../../core/markers/registry';
import type { Marker } from '../../../types/mindmap';

interface Props {
  marker: Marker;
  /** 显示边长（px），默认 20 */
  size?: number;
  className?: string;
}

export function MarkerIconSvg({ marker, size = 20, className }: Props) {
  const glyph = markerGlyph(marker);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      role="img"
    >
      {glyph.shapes.map((shape, i) => (
        <path
          key={i}
          d={shape.d}
          fill={shape.fill ?? 'none'}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          strokeLinecap={shape.strokeLinecap}
        />
      ))}
      {glyph.text && (
        <text
          x="12"
          y="12"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={glyph.textFontSize ?? 18}
          fontWeight="bold"
          fill={glyph.textColor ?? 'currentColor'}
        >
          {glyph.text}
        </text>
      )}
    </svg>
  );
}
