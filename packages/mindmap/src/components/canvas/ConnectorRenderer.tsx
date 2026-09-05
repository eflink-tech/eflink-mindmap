// src/components/canvas/ConnectorRenderer.tsx
import { Fragment } from 'react';
import { Arrow, Circle, Path } from 'react-konva';
import {
  pathApproachPoint,
  pathEndpoint,
  handDrawnPath,
  resolveConnectorAppearance,
  resolveRenderedConnectorD,
} from '../../core/style/connectorStyle';
import { getTheme } from '../../core/style/themes';
import { useMindMapStore } from '../../store/mindMapStore';

export function ConnectorRenderer() {
  const connectors = useMindMapStore((s) => s.layoutResult?.connectors ?? []);
  const positions = useMindMapStore((s) => s.layoutResult?.positions);
  const doc = useMindMapStore((s) => s.doc);
  if (!doc) return null;
  const theme = getTheme(doc);

  return (
    <>
      {connectors.map((c) => {
        const style = resolveConnectorAppearance(doc, c.from, c.to, theme);
        const fromBox = positions?.[c.from];
        const toBox = positions?.[c.to];
        const d =
          fromBox && toBox
            ? resolveRenderedConnectorD(doc, c.d, fromBox, toBox, c.dir, style)
            : style.handDrawn
              ? handDrawnPath(c.d)
              : c.d;
        const color = style.color ?? c.color;
        const end = pathEndpoint(d);
        const approach = pathApproachPoint(d);
        return (
          <Fragment key={c.id}>
            <Path
              data={d}
              stroke={color}
              strokeWidth={style.width}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
            {style.end === 'dot' && end && (
              <Circle
                x={end.x}
                y={end.y}
                radius={Math.max(3, style.width + 1)}
                fill={color}
                listening={false}
              />
            )}
            {style.end === 'arrow' && end && approach && (
              <Arrow
                points={[approach.x, approach.y, end.x, end.y]}
                stroke={color}
                fill={color}
                strokeWidth={0}
                pointerLength={10}
                pointerWidth={8}
                listening={false}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
}
