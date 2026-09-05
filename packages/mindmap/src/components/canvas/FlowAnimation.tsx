// src/components/canvas/FlowAnimation.tsx
// 选中节点流动动画：蓝色圆点沿「选中节点 → 子级连线 / 相连联系线」持续流动（对齐 ProcessOn）
import { useEffect, useMemo, useRef } from 'react';
import { Circle, Group } from 'react-konva';
import type Konva from 'konva';
import { getCanvasOptions } from '../../core/style/canvasOptions';
import { buildFlowPaths, pointAtDistance, type FlowPolyline } from '../../core/layout/flow';
import { getTheme } from '../../core/style/themes';
import { useMindMapStore } from '../../store/mindMapStore';

const FLOW_COLOR = '#3B82F6';
/** 流速：px/s（放慢后的舒缓速度，对齐 ProcessOn 的观感） */
const FLOW_SPEED = 45;
/** 相邻蓝点的目标间距：按路径长度换算每条路径的点数（1~4 个） */
const DOT_SPACING = 110;

interface DotSpec {
  flow: number;
  phase: number;
  x: number;
  y: number;
}

export function FlowAnimation() {
  const selectedId = useMindMapStore((s) => s.selectedId);
  const doc = useMindMapStore((s) => s.doc);
  const layoutResult = useMindMapStore((s) => s.layoutResult);
  // 工具栏「流动」开关关闭时不渲染动画
  const flowEnabled = useMindMapStore((s) => (s.doc ? getCanvasOptions(s.doc).flowAnimation === true : false));
  const groupRef = useRef<Konva.Group>(null);
  const dotRefs = useRef<(Konva.Circle | null)[]>([]);
  // 动画时钟独立于路径重建：文档编辑导致路径变化时蓝点不跳回起点
  const clockRef = useRef<number | null>(null);

  const flows = useMemo<FlowPolyline[]>(
    () =>
      doc && layoutResult && selectedId && flowEnabled
        ? buildFlowPaths(doc, layoutResult, selectedId, getTheme(doc))
        : [],
    [doc, layoutResult, selectedId, flowEnabled],
  );

  const dots = useMemo<DotSpec[]>(() => {
    const list: DotSpec[] = [];
    flows.forEach((f, fi) => {
      const n = Math.max(1, Math.min(4, Math.round(f.length / DOT_SPACING)));
      for (let i = 0; i < n; i += 1) {
        const dist = (i / n) * f.length;
        const p = pointAtDistance(f, dist);
        list.push({ flow: fi, phase: i / n, x: p.x, y: p.y });
      }
    });
    return list;
  }, [flows]);

  useEffect(() => {
    if (!dots.length) {
      clockRef.current = null;
      return;
    }
    dotRefs.current.length = dots.length;
    if (clockRef.current == null) clockRef.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = (now - (clockRef.current ?? now)) / 1000;
      dots.forEach((d, i) => {
        const circle = dotRefs.current[i];
        const f = flows[d.flow];
        if (!circle || !f) return;
        const dist = ((t * FLOW_SPEED) % f.length + f.length) % f.length;
        const p = pointAtDistance(f, (dist + d.phase * f.length) % f.length);
        circle.position({ x: p.x, y: p.y });
      });
      groupRef.current?.getLayer()?.batchDraw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [flows, dots]);

  if (!dots.length) return null;
  return (
    <Group ref={groupRef} listening={false}>
      {dots.map((d, i) => (
        <Circle
          key={i}
          ref={(el) => {
            dotRefs.current[i] = el;
          }}
          x={d.x}
          y={d.y}
          radius={3}
          fill={FLOW_COLOR}
          opacity={0.9}
          shadowColor={FLOW_COLOR}
          shadowBlur={5}
          shadowOpacity={0.5}
        />
      ))}
    </Group>
  );
}
