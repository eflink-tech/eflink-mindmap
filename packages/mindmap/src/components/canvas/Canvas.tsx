// src/components/canvas/Canvas.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type Konva from 'konva';
import { Arrow, Layer, Line, Rect, Stage } from 'react-konva';
import { edgePoint } from '../../core/layout/overlays';
import { getCanvasBackground } from '../../core/style/canvasOptions';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';
import { BoundaryRenderer } from './BoundaryRenderer';
import { ConnectorRenderer } from './ConnectorRenderer';
import { FlowAnimation } from './FlowAnimation';
import { NodeRenderer } from './NodeRenderer';
import { RelationRenderer } from './RelationRenderer';
import { SummaryRenderer } from './SummaryRenderer';
import { setStage } from './stageRef';

// 框选拖拽超过该距离（屏幕像素）才视为框选，否则视为点击空白
const MARQUEE_THRESHOLD = 4;

// 框选矩形的屏幕坐标（绘制时换算为世界坐标）
interface MarqueeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ startX: number; startY: number; vx: number; vy: number } | null>(null);
  // 框选状态：屏幕坐标起点 + Shift 增量模式 + 起始已选集合；active 表示已超过点击阈值
  const marqueeRef = useRef<{
    startX: number;
    startY: number;
    additive: boolean;
    base: string[];
    active: boolean;
  } | null>(null);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const doc = useMindMapStore((s) => s.doc);
  const viewport = doc?.viewport ?? { x: 0, y: 0, scale: 1 };
  const positions = useMindMapStore((s) => s.layoutResult?.positions);
  const preview = useMindMapStore((s) => s.dropPreview);
  const stageSize = useMindMapStore((s) => s.stageSize);
  const autoFitPending = useMindMapStore((s) => s.autoFitPending);
  const linking = useUiStore((s) => s.linking);
  const linkFrom = useUiStore((s) => s.linkFrom);
  const linkArrowRef = useRef<Konva.Arrow>(null);

  // 连线模式退出/起点被清空时立即收起跟随虚线（Esc、点空白、再次点击联系按钮等路径）
  useEffect(() => {
    const arrow = linkArrowRef.current;
    if ((!linking || !linkFrom) && arrow?.visible()) {
      arrow.visible(false);
      arrow.getLayer()?.batchDraw();
    }
  }, [linking, linkFrom]);

  // 联系线跟随虚线：连线模式下从起点节点边缘画到指针，跟随鼠标移动（对齐 XMind）。
  // 直接改 Konva 节点属性并重绘该层，避免 mousemove 触发 React 重渲染整个画布
  const onStageMouseMove = useCallback(() => {
    const arrow = linkArrowRef.current;
    if (!arrow) return;
    const ui = useUiStore.getState();
    const store = useMindMapStore.getState();
    const active = ui.linking && !!ui.linkFrom && !!store.doc && !!store.layoutResult;
    const container = arrow.getStage()?.container();
    if (container && container.style.cursor !== (ui.linking ? 'crosshair' : '')) {
      container.style.cursor = ui.linking ? 'crosshair' : '';
    }
    if (!active) {
      if (arrow.visible()) {
        arrow.visible(false);
        arrow.getLayer()?.batchDraw();
      }
      return;
    }
    const pos = arrow.getStage()?.getPointerPosition();
    const doc = store.doc!;
    const fromBox = store.layoutResult!.positions[ui.linkFrom!];
    if (!pos || !fromBox) return;
    const wx = (pos.x - doc.viewport.x) / doc.viewport.scale;
    const wy = (pos.y - doc.viewport.y) / doc.viewport.scale;
    const start = edgePoint(fromBox, wx, wy);
    arrow.setAttrs({ visible: true, points: [start.x, start.y, wx, wy] });
    arrow.getLayer()?.batchDraw();
  }, []);

  // 离开画布时收起跟随虚线
  const onStageMouseLeave = useCallback(() => {
    const arrow = linkArrowRef.current;
    if (arrow?.visible()) {
      arrow.visible(false);
      arrow.getLayer()?.batchDraw();
    }
  }, []);

  // 固定 ref 回调，避免每次渲染触发 setStage(null) → setStage(node) 抖动
  const registerStage = useCallback((node: Konva.Stage | null) => {
    setStage(node);
  }, []);

  // stageSize 更新后，如果有待处理的自动居中，则执行 fitToScreen
  useEffect(() => {
    if (autoFitPending) {
      useMindMapStore.getState().fitToScreen();
    }
  }, [stageSize, autoFitPending]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // 记录上一次尺寸，侧栏开闭导致画布变窄/变宽时平移视口，保持原画面中心
    let prevW = el.clientWidth;
    let prevH = el.clientHeight;
    const update = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      const store = useMindMapStore.getState();
      store.setStageSize({ width, height });
      if (
        store.doc &&
        !store.autoFitPending &&
        (width !== prevW || height !== prevH)
      ) {
        const dx = (width - prevW) / 2;
        const dy = (height - prevH) / 2;
        if (dx !== 0 || dy !== 0) {
          const v = store.doc.viewport;
          store.setViewport({ ...v, x: v.x + dx, y: v.y + dy });
        }
      }
      prevW = width;
      prevH = height;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const store = useMindMapStore.getState();
      const doc = store.doc;
      if (!doc) return;
      // 触控板捏合与 Cmd/Ctrl+滚轮：缩放；普通滚动（触控板双指扫、鼠标滚轮）：
      // 双轴平移画布（对齐 XMind/Figma）。Mac 捏合手势的 wheel 事件自带 ctrlKey
      if (e.ctrlKey || e.metaKey) {
        const oldScale = doc.viewport.scale;
        const rect = el.getBoundingClientRect();
        const layout = store.layoutResult?.positions;
        // 缩放锚点：优先取根节点中心，其次取指针位置
        const anchorWorld =
          layout && doc.rootId && layout[doc.rootId]
            ? { x: layout[doc.rootId].x, y: layout[doc.rootId].y }
            : null;
        // 区分输入设备：触控板（像素模式，小值连续）与鼠标滚轮（行模式，每 notch ≈3 行）
        // 触控板：0.2% / 像素；鼠标滚轮：~4.5% / 行（3 行 notch ≈ 13%）
        const sensitivity = e.deltaMode === 1 ? 0.015 : 0.002;
        const factor = Math.exp(-e.deltaY * sensitivity);
        const newScale = Math.min(3, Math.max(0.1, oldScale * factor));
        if (anchorWorld) {
          // 根节点锚定：缩放前后根节点屏幕坐标不变
          const ax = anchorWorld.x * oldScale + doc.viewport.x;
          const ay = anchorWorld.y * oldScale + doc.viewport.y;
          store.setViewport({ scale: newScale, x: ax - anchorWorld.x * newScale, y: ay - anchorWorld.y * newScale });
        } else {
          const pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          const wx = (pointer.x - doc.viewport.x) / oldScale;
          const wy = (pointer.y - doc.viewport.y) / oldScale;
          store.setViewport({ scale: newScale, x: pointer.x - wx * newScale, y: pointer.y - wy * newScale });
        }
        return;
      }
      // 平移：滚动增量即屏幕位移（行模式滚轮按 16px/行换算）；自然滚动下内容跟随手指
      const line = e.deltaMode === 1 ? 16 : 1;
      const v = doc.viewport;
      store.setViewport({ ...v, x: v.x - e.deltaX * line, y: v.y - e.deltaY * line });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  useEffect(() => {
    const onMove = (ev: MouseEvent) => {
      const p = panRef.current;
      if (p) {
        const store = useMindMapStore.getState();
        if (!store.doc) return;
        store.setViewport({
          ...store.doc.viewport,
          x: p.vx + (ev.clientX - p.startX),
          y: p.vy + (ev.clientY - p.startY),
        });
        return;
      }
      // 框选拖拽：更新选框并实时命中节点（对齐 XMind 划选多选）
      const m = marqueeRef.current;
      if (!m) return;
      const rect = containerRef.current?.getBoundingClientRect();
      const store = useMindMapStore.getState();
      if (!rect || !store.doc || !store.layoutResult) return;
      const sx = ev.clientX - rect.left;
      const sy = ev.clientY - rect.top;
      const dx = sx - m.startX;
      const dy = sy - m.startY;
      if (!m.active && Math.abs(dx) < MARQUEE_THRESHOLD && Math.abs(dy) < MARQUEE_THRESHOLD) return;
      m.active = true;
      const v = store.doc.viewport;
      const x0 = (Math.min(m.startX, sx) - v.x) / v.scale;
      const y0 = (Math.min(m.startY, sy) - v.y) / v.scale;
      const x1 = (Math.max(m.startX, sx) - v.x) / v.scale;
      const y1 = (Math.max(m.startY, sy) - v.y) / v.scale;
      setMarquee({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
      // 命中：节点盒（中心点语义）与选框相交
      const hit = Object.entries(store.layoutResult.positions)
        .filter(
          ([, b]) =>
            b.x + b.width / 2 >= x0 &&
            b.x - b.width / 2 <= x1 &&
            b.y + b.height / 2 >= y0 &&
            b.y - b.height / 2 <= y1,
        )
        .map(([id]) => id);
      const sel = m.additive ? Array.from(new Set([...m.base, ...hit])) : hit;
      if (sel.join('|') !== store.selectedIds.join('|')) store.selectMany(sel);
    };
    const onUp = () => {
      panRef.current = null;
      if (marqueeRef.current) {
        marqueeRef.current = null;
        setMarquee(null);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (!doc || !positions) return <div ref={containerRef} className="h-full w-full min-w-0" />;
  const canvasBg = getCanvasBackground(doc);

  let indicator: { points: number[] } | null = null;
  if (preview && preview.zone !== 'child') {
    const b = positions[preview.targetId];
    if (b) {
      const y = preview.zone === 'before' ? b.y - b.height / 2 - 4 : b.y + b.height / 2 + 4;
      indicator = { points: [b.x - b.width / 2 - 12, y, b.x + b.width / 2 + 12, y] };
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full min-w-0 overflow-hidden"
      style={{ background: canvasBg }}
    >
      <Stage
        ref={registerStage}
        width={stageSize.width}
        height={stageSize.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        onMouseDown={(e) => {
          if (e.target !== e.target.getStage()) return;
          // 连线模式下点击空白画布：取消连线（对齐 XMind），不进入框选/平移
          if (useUiStore.getState().linking) {
            useUiStore.getState().endLinking();
            return;
          }
          if (e.evt.button === 0) {
            // 左键空白按下：起点记录为框选（对齐 XMind 划选）；几乎不移动视为点击空白取消选中。
            // Shift 按下时保留已选集合作为增量基础
            const store = useMindMapStore.getState();
            const base = e.evt.shiftKey ? store.selectedIds.slice() : [];
            if (!e.evt.shiftKey) store.select(null);
            const pos = e.target.getStage().getPointerPosition();
            marqueeRef.current = {
              startX: pos?.x ?? 0,
              startY: pos?.y ?? 0,
              additive: e.evt.shiftKey,
              base,
              active: false,
            };
            return;
          }
          // 右键/中键空白按下：平移画布（左键已用于框选，对齐 XMind）
          const v = useMindMapStore.getState().doc!.viewport;
          panRef.current = { startX: e.evt.clientX, startY: e.evt.clientY, vx: v.x, vy: v.y };
        }}
        onContextMenu={(e) => e.evt.preventDefault()}
        onMouseMove={onStageMouseMove}
        onMouseLeave={onStageMouseLeave}
      >
        <Layer>
          {/* 外框在最底层：浅灰填充垫底，子树连线画在填充之上（对齐 XMind） */}
          <BoundaryRenderer />
          <ConnectorRenderer />
          {Object.keys(positions).map((id) => (
            <NodeRenderer key={id} nodeId={id} />
          ))}
          <RelationRenderer />
          <SummaryRenderer />
          {/* 选中节点流动动画：蓝点沿子级连线与联系线向外流动（对齐 ProcessOn），置于最上层 */}
          <FlowAnimation />
          {/* 联系线跟随虚线：常驻隐藏，连线模式下由 onMouseMove 直接驱动位置与可见性 */}
          <Arrow
            ref={linkArrowRef}
            visible={false}
            points={[0, 0]}
            listening={false}
            dash={[6, 6]}
            stroke="#3B82F6"
            fill="#3B82F6"
            strokeWidth={2}
            pointerLength={10}
            pointerWidth={8}
          />
          {indicator && (
            <Line points={indicator.points} stroke="#0EA5E9" strokeWidth={3} lineCap="round" listening={false} />
          )}
          {marquee && (
            // 框选矩形：世界坐标绘制（随画布变换），线宽按缩放补偿保持屏幕 1px
            <Rect
              x={marquee.x}
              y={marquee.y}
              width={marquee.w}
              height={marquee.h}
              fill="rgba(59,130,246,0.08)"
              stroke="#3B82F6"
              strokeWidth={1 / viewport.scale}
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
