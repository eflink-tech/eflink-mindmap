// src/components/canvas/SummaryEditorOverlay.tsx
// 概要文本编辑浮层：双击概要盒进入编辑，Enter/失焦提交，Esc 取消（交互对齐节点编辑浮层）。
// 概要文本不参与布局，无需输入时实时写回，只在退出编辑时提交一次
import { useCallback, useEffect, useRef } from 'react';
import { updateSummaryText } from '../../core/editor/nodeOps';
import { computeSummaryOverlays, summaryInputs } from '../../core/layout/overlays';
import { useMindMapStore } from '../../store/mindMapStore';
import { SUMMARY_BOX_HEIGHT, SUMMARY_BOX_WIDTH, SUMMARY_GAP } from './summaryLayout';

export function SummaryEditorOverlay() {
  const editingSummaryId = useMindMapStore((s) => s.editingSummaryId);
  const doc = useMindMapStore((s) => s.doc);
  const positions = useMindMapStore((s) => s.layoutResult?.positions);
  const ref = useRef<HTMLDivElement>(null);
  // 记录本次编辑会话已初始化的概要 id：doc 变化不重置输入内容
  const openedIdRef = useRef<string | null>(null);

  const close = useCallback((save: boolean) => {
    const store = useMindMapStore.getState();
    const id = store.editingSummaryId;
    if (!id) return;
    if (save) {
      const text = ref.current?.textContent ?? '';
      store.act((d) => updateSummaryText(d, id, text));
    }
    store.setEditingSummary(null);
  }, []);

  useEffect(() => {
    if (!editingSummaryId || !doc) {
      openedIdRef.current = null;
      return;
    }
    // 只在进入编辑时填充一次现有文本，避免编辑期间 doc 更新把输入重置
    if (openedIdRef.current === editingSummaryId) return;
    openedIdRef.current = editingSummaryId;
    const summary = doc.summaries.find((s) => s.id === editingSummaryId);
    if (ref.current && summary) ref.current.textContent = summary.text;
    const raf = requestAnimationFrame(() => {
      ref.current?.focus();
      // 光标移到末尾（与节点编辑一致）
      const range = document.createRange();
      const sel = window.getSelection();
      if (ref.current && ref.current.childNodes.length) {
        range.selectNodeContents(ref.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [editingSummaryId, doc]);

  if (!editingSummaryId || !doc || !positions) return null;
  const summary = doc.summaries.find((s) => s.id === editingSummaryId);
  if (!summary) return null;
  // 与 SummaryRenderer 同源求解，编辑浮层落在概要盒的实际位置（含避让外推）
  const overlays = computeSummaryOverlays(
    summaryInputs(doc, positions),
    Object.values(positions),
    SUMMARY_GAP,
    { width: SUMMARY_BOX_WIDTH, height: SUMMARY_BOX_HEIGHT },
  );
  const anchor = overlays.get(editingSummaryId)?.anchor;
  if (!anchor) return null;

  const v = doc.viewport;
  const scale = v.scale;

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="absolute z-10 flex items-center justify-center rounded-lg border-2 border-blue-500 bg-white outline-none"
      style={{
        left: anchor.x * scale + v.x,
        top: anchor.y * scale + v.y,
        transform: 'translate(-50%, -50%)',
        width: SUMMARY_BOX_WIDTH * scale + 4,
        height: SUMMARY_BOX_HEIGHT * scale,
        fontSize: 12 * scale,
        lineHeight: 1.3,
        color: '#0F172A',
        textAlign: 'center',
        overflowWrap: 'break-word',
        wordBreak: 'break-all',
      }}
      onBlur={() => close(true)}
      onKeyDown={(e) => {
        // 中文输入法合成期间：Enter/Esc 属于候选确认/取消，不作为浮层的提交/取消
        if (e.nativeEvent.isComposing) {
          e.stopPropagation();
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          close(true);
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          close(false);
        }
        // 阻断全局快捷键（Delete/方向键等）在编辑期间生效
        e.stopPropagation();
      }}
    />
  );
}
