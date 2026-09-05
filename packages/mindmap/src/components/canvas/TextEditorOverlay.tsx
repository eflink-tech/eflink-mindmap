// src/components/canvas/TextEditorOverlay.tsx
// 编辑态覆盖层：透明浮在节点形状上，字体/内边距/行高与布局测量一致，
// 双击进入时尽量「无感知」——只看到光标，看不到第二套文字或另一套盒子。
import { useCallback, useEffect, useRef } from 'react';
import { updateText } from '../../core/editor/nodeOps';
import {
  LABEL_CHIP_HEIGHT,
  LABEL_ROW_GAP,
  LINE_HEIGHT_RATIO,
} from '../../core/layout/measure';
import { markersRowWidth } from '../../core/markers/registry';
import { resolveNodeStyle } from '../../core/style/apply';
import { getTheme } from '../../core/style/themes';
import { useMindMapStore } from '../../store/mindMapStore';

export function TextEditorOverlay() {
  const editingId = useMindMapStore((s) => s.editingId);
  const doc = useMindMapStore((s) => s.doc);
  const box = useMindMapStore((s) => (s.editingId ? s.layoutResult?.positions[s.editingId] : undefined));
  const outerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const savedTextRef = useRef<string>(''); // 跟踪已保存的文本，避免重复保存
  const batchStartedRef = useRef(false); // 跟踪是否已开始 batch
  const composingRef = useRef(false); // 跟踪 IME 合成状态（中文输入）

  const commit = useCallback(() => {
    const store = useMindMapStore.getState();
    if (!store.editingId) return;
    const text = ref.current?.textContent ?? '';
    // 更新文本并结束 batch（只产生一次历史）
    if (text !== savedTextRef.current) {
      store.act((d) => updateText(d, store.editingId!, text));
    }
    savedTextRef.current = text;
    if (batchStartedRef.current) {
      store.endBatch();
      batchStartedRef.current = false;
    }
    store.setEditing(null);
  }, []);

  const cancel = useCallback(() => {
    const store = useMindMapStore.getState();
    // 结束 batch（丢弃变更）
    if (batchStartedRef.current) {
      store.endBatch();
      batchStartedRef.current = false;
    }
    store.setEditing(null);
  }, []);

  // 仅在进入/切换编辑节点时初始化；勿依赖 doc，否则每次按键会重置光标
  useEffect(() => {
    if (!editingId) return;
    const store = useMindMapStore.getState();
    const nodeText = store.doc?.nodes[editingId]?.text ?? '';
    savedTextRef.current = nodeText;
    batchStartedRef.current = true;
    store.beginBatch();

    if (ref.current) {
      ref.current.textContent = nodeText;
      requestAnimationFrame(() => {
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
    }

    return () => {
      // 切换节点时：如果 batch 未结束，先结束
      if (batchStartedRef.current && ref.current && editingId) {
        const text = ref.current.textContent ?? '';
        const st = useMindMapStore.getState();
        if (st.editingId === editingId && text !== savedTextRef.current) {
          st.act((d) => updateText(d, editingId, text));
          savedTextRef.current = text;
        }
        st.endBatch();
        batchStartedRef.current = false;
      }
    };
  }, [editingId]);

  // 输入时实时更新节点文本（触发重新布局），IME 合成期间跳过
  const handleInput = useCallback(() => {
    if (!ref.current || !editingId || composingRef.current) return;
    const text = ref.current.textContent ?? '';
    if (text !== savedTextRef.current) {
      useMindMapStore.getState().act((d) => updateText(d, editingId, text));
      savedTextRef.current = text;
    }
  }, [editingId]);

  if (!editingId || !doc || !box) return null;
  const v = doc.viewport;
  const theme = getTheme(doc);
  const style = resolveNodeStyle(doc, theme, editingId);
  const node = doc.nodes[editingId];
  const [padX, padY] = theme.node.padding;
  const markersWidth = markersRowWidth(node?.metadata?.markers);
  const labelsExtra = (node?.metadata?.labels?.length ?? 0) > 0 ? LABEL_CHIP_HEIGHT + LABEL_ROW_GAP : 0;
  const shapeH = box.height - labelsExtra;
  const scale = v.scale;
  // 形状中心相对布局盒中心上移 labelsExtra/2（标签在形状下方）
  const shapeCenterY = box.y - labelsExtra / 2;

  return (
    <div
      ref={outerRef}
      className="absolute z-10"
      style={{
        left: box.x * scale + v.x,
        top: shapeCenterY * scale + v.y,
        transform: 'translate(-50%, -50%)',
        width: box.width * scale,
        minHeight: shapeH * scale,
        boxSizing: 'border-box',
        // 与 Konva 节点一致的左右/上下内边距；左侧为标记行预留宽度
        paddingTop: padY * scale,
        paddingBottom: padY * scale,
        paddingRight: padX * scale,
        paddingLeft: (padX + markersWidth) * scale,
        display: 'flex',
        alignItems: 'center',
        // 透明：形状/选中环仍由 Konva 绘制，避免「另一套盒子」
        backgroundColor: 'transparent',
        borderRadius: style.shape === 'rounded' ? 8 * scale : style.shape === 'ellipse' ? 9999 : 0,
        pointerEvents: 'auto',
      }}
    >
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="outline-none"
        style={{
          flex: 1,
          minWidth: 0,
          width: '100%',
          fontSize: style.fontSize * scale,
          fontFamily: style.fontFamily,
          fontWeight: style.fontWeight,
          fontStyle: style.italic ? 'italic' : 'normal',
          textDecoration: [
            style.underline ? 'underline' : '',
            style.strikethrough ? 'line-through' : '',
          ]
            .filter(Boolean)
            .join(' '),
          color: style.textColor,
          caretColor: style.textColor,
          textAlign: style.textAlign,
          // 接近布局引擎按字符测量换行；CJK 下 break-all 与 wrapText 更接近
          overflowWrap: 'anywhere',
          wordBreak: 'break-all',
          whiteSpace: 'pre-wrap',
          lineHeight: LINE_HEIGHT_RATIO,
          backgroundColor: 'transparent',
        }}
        onInput={(e) => {
          e.stopPropagation();
          handleInput();
        }}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
          handleInput();
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          // 中文输入法合成期间：Enter/Esc 属于候选确认/取消，不作为节点编辑的提交/取消
          if (composingRef.current || e.nativeEvent.isComposing) {
            e.stopPropagation();
            return;
          }
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
          e.stopPropagation();
        }}
      />
    </div>
  );
}
