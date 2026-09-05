// src/components/canvas/BoundaryEditorOverlay.tsx
// 外框备注编辑浮层：选中外框后点击左上角加号（或双击备注标签）进入。
// Enter/失焦提交（空串移除标签），Esc 取消；交互对齐概要编辑浮层。
import { useCallback, useEffect, useRef } from 'react';
import { useMindMapStore } from '../../store/mindMapStore';
import { BOUNDARY_CHIP, boundaryRects } from '../../core/layout/overlays';

export const BOUNDARY_EDITOR_MIN_WIDTH = 140;

export function BoundaryEditorOverlay() {
  const editingBoundaryId = useMindMapStore((s) => s.editingBoundaryId);
  const doc = useMindMapStore((s) => s.doc);
  const positions = useMindMapStore((s) => s.layoutResult?.positions);
  const ref = useRef<HTMLDivElement>(null);
  // 记录本次编辑会话已初始化的外框 id：doc 变化不重置输入内容
  const openedIdRef = useRef<string | null>(null);

  const close = useCallback((save: boolean) => {
    const store = useMindMapStore.getState();
    const id = store.editingBoundaryId;
    if (!id) return;
    if (save) {
      const text = ref.current?.textContent ?? '';
      store.updateBoundaryTitleById(id, text);
    }
    store.setEditingBoundary(null);
  }, []);

  useEffect(() => {
    if (!editingBoundaryId || !doc) {
      openedIdRef.current = null;
      return;
    }
    // 只在进入编辑时填充一次现有标题；期间任何 doc 更新（撤销、联动变更等）都不清空输入框
    if (openedIdRef.current === editingBoundaryId) return;
    openedIdRef.current = editingBoundaryId;
    const boundary = doc.boundaries.find((b) => b.id === editingBoundaryId);
    if (ref.current && boundary) ref.current.textContent = boundary.title ?? '';
    const raf = requestAnimationFrame(() => {
      ref.current?.focus();
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
  }, [editingBoundaryId, doc]);

  if (!editingBoundaryId || !doc || !positions) return null;
  const boundary = doc.boundaries.find((b) => b.id === editingBoundaryId);
  if (!boundary) return null;
  const rects = boundaryRects(doc, positions, boundary.nodeIds);
  if (!rects) return null;

  // 浮层与标签/加号同位：贴外框左上角上方
  const v = doc.viewport;
  const scale = v.scale;
  const left = rects.outer.x * scale + v.x;
  const top = (rects.outer.y - BOUNDARY_CHIP.height - 10) * scale + v.y;

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="absolute z-10 rounded-md border-2 border-blue-500 bg-white px-2 outline-none"
      style={{
        left,
        top,
        minWidth: BOUNDARY_EDITOR_MIN_WIDTH * scale,
        height: (BOUNDARY_CHIP.height + 8) * scale,
        fontSize: 12 * scale,
        lineHeight: `${(BOUNDARY_CHIP.height + 4) * scale}px`,
        color: '#1F2937',
        overflowWrap: 'break-word',
      }}
      onBlur={() => close(true)}
      onKeyDown={(e) => {
        // 中文输入法合成期间：Enter 是确认候选、Esc 是取消合成，不作为浮层的提交/取消
        // （否则会读到合成中的空文本提前提交，标签内容「自动消失」）
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
