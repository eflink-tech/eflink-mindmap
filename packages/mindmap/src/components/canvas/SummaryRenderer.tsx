// src/components/canvas/SummaryRenderer.tsx
// 概要渲染：弧形大括号 + 概要盒与文本（对齐 XMind）；单击选中，双击进入编辑，选中后 Delete 删除。
// 括号与锚点由 computeSummaryOverlays 统一求解：沿分支方向外凸，并避让路径上的节点与内层概要
import { Fragment } from 'react';
import { Line, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import { computeSummaryOverlays, summaryInputs } from '../../core/layout/overlays';
import { useMindMapStore } from '../../store/mindMapStore';
import { SUMMARY_BOX_HEIGHT, SUMMARY_BOX_WIDTH, SUMMARY_GAP } from './summaryLayout';

export function SummaryRenderer() {
  const doc = useMindMapStore((s) => s.doc);
  const positions = useMindMapStore((s) => s.layoutResult?.positions);
  const selectedSummaryId = useMindMapStore((s) => s.selectedSummaryId);
  if (!doc || !positions) return null;

  const overlays = computeSummaryOverlays(
    summaryInputs(doc, positions),
    Object.values(positions),
    SUMMARY_GAP,
    { width: SUMMARY_BOX_WIDTH, height: SUMMARY_BOX_HEIGHT },
  );

  const setCursor = (e: Konva.KonvaEventObject<MouseEvent>, value: string) => {
    const el = e.target.getStage()?.container();
    if (el) el.style.cursor = value;
  };

  return (
    <>
      {doc.summaries.map((s) => {
        const overlay = overlays.get(s.id);
        if (!overlay) return null;
        const { anchor, bracketPoints } = overlay;
        const selected = selectedSummaryId === s.id;
        return (
          <Fragment key={s.id}>
            <Line
              points={bracketPoints}
              stroke={selected ? '#2563EB' : '#334155'}
              strokeWidth={1.5}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
            <Rect
              x={anchor.x - SUMMARY_BOX_WIDTH / 2}
              y={anchor.y - SUMMARY_BOX_HEIGHT / 2}
              width={SUMMARY_BOX_WIDTH}
              height={SUMMARY_BOX_HEIGHT}
              cornerRadius={8}
              fill="#FFFFFF"
              stroke={selected ? '#2563EB' : '#0F172A'}
              strokeWidth={selected ? 2 : 1.5}
              onClick={(e) => {
                e.cancelBubble = true;
                useMindMapStore.getState().selectSummary(s.id);
              }}
              onDblClick={(e) => {
                e.cancelBubble = true;
                // 双击进入文本编辑（对齐节点交互）；删除走「选中 + Delete」
                useMindMapStore.getState().setEditingSummary(s.id);
              }}
              onMouseEnter={(e) => setCursor(e, 'pointer')}
              onMouseLeave={(e) => setCursor(e, '')}
            />
            <Text
              x={anchor.x - SUMMARY_BOX_WIDTH / 2}
              y={anchor.y - SUMMARY_BOX_HEIGHT / 2}
              width={SUMMARY_BOX_WIDTH}
              height={SUMMARY_BOX_HEIGHT}
              text={s.text}
              fontSize={12}
              fill="#0F172A"
              align="center"
              verticalAlign="middle"
              listening={false}
            />
          </Fragment>
        );
      })}
    </>
  );
}
