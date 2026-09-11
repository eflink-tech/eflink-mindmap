// src/components/canvas/NodeInsertOverlay.tsx
// 插入菜单的节点旁浮层编辑器：
// - 笔记：多行，输入即实时保存（batch 合并为一次撤销历史），Esc/失焦仅关闭
// - 标签：追加模式（Enter 添加胶囊）；点击节点上的胶囊进入编辑模式（Enter 替换，清空 Enter 删除）
// - 链接：单行，Enter/失焦保存，清空即删除
// - 图片：查看大图 + 删除按钮
// 锚定选中节点右侧垂直居中（对齐 XMind）。
import { useEffect, useRef, useState } from 'react';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore, type InsertEditorKind } from '../../store/uiStore';
import { SaveStatusIndicator } from '../statusbar/SaveStatusIndicator';

const TITLE_MAP: Record<InsertEditorKind, string> = { note: '笔记', labels: '标签', link: '链接', image: '图片' };

export function NodeInsertOverlay() {
  const kind = useUiStore((s) => s.insertEditor);
  const labelEditIndex = useUiStore((s) => s.labelEditIndex);
  const close = useUiStore((s) => s.closeInsertEditor);
  const doc = useMindMapStore((s) => s.doc);
  const selectedId = useMindMapStore((s) => s.selectedId);
  const box = useMindMapStore((s) => (s.selectedId ? s.layoutResult?.positions[s.selectedId] : undefined));
  const inputRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');
  const [lightbox, setLightbox] = useState(false);

  const node = selectedId ? doc?.nodes[selectedId] : undefined;

  // 笔记实时保存：打开时开启 batch（期间 act 不产生历史），关闭时合并为一次撤销记录
  useEffect(() => {
    if (kind !== 'note' || !selectedId) return;
    useMindMapStore.getState().beginBatch();
    return () => useMindMapStore.getState().endBatch();
  }, [kind, selectedId]);

  // 浮层类型/目标节点/编辑下标变化：重填初值并聚焦（依赖故意不含 node，避免输入期间被 store 更新重置）
  useEffect(() => {
    if (!kind || !node) return;
    setValue(
      kind === 'note'
        ? node.metadata?.note ?? ''
        : kind === 'link'
          ? node.metadata?.link ?? ''
          : kind === 'labels' && labelEditIndex != null
            ? node.metadata?.labels?.[labelEditIndex] ?? ''
            : '',
    );
    const raf = requestAnimationFrame(() => {
      if (kind === 'image') return;
      (kind === 'note' ? noteRef : inputRef).current?.focus();
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, selectedId, labelEditIndex]);

  // 目标节点被删除时自动关闭
  useEffect(() => {
    if (kind && selectedId && !doc?.nodes[selectedId]) close();
  }, [kind, selectedId, doc, close]);

  // 图片被移除（删除/撤销）时直接关闭浮层，不留「已删除」占位
  useEffect(() => {
    if (kind === 'image' && selectedId && doc && !doc.nodes[selectedId]?.metadata?.image) close();
  }, [kind, selectedId, doc, close]);

  // 放大查看时 Esc 关闭
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  if (!kind || !doc || !box || !node || !selectedId) return null;
  // 图片浮层在无图可显示时直接不渲染（删除/撤销后由上方 effect 关闭兜底）
  const imageSrc = node.metadata?.image;
  if (kind === 'image' && !imageSrc) return null;
  const v = doc.viewport;
  const scale = v.scale;

  const liveNote = (text: string) => {
    setValue(text);
    useMindMapStore.getState().updateMetadataNode(selectedId, { note: text.trim() ? text : undefined });
  };
  const commitLink = () => {
    useMindMapStore.getState().updateMetadataNode(selectedId, { link: value.trim() || undefined });
    close();
  };
  // 追加标签（可逗号分隔多个），胶囊实时出现在节点下方
  const appendLabels = () => {
    const parts = value.split(/[,，\n]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const merged = [...(node.metadata?.labels ?? []), ...parts];
    useMindMapStore.getState().updateMetadataNode(selectedId, { labels: merged });
    setValue('');
  };
  // 编辑模式：Enter 用输入替换该下标的标签；清空 Enter = 删除该标签
  const commitLabelEdit = () => {
    if (labelEditIndex == null) return;
    const cur = node.metadata?.labels ?? [];
    if (labelEditIndex >= cur.length) return;
    const text = value.trim();
    const next = text ? cur.map((l, i) => (i === labelEditIndex ? text : l)) : cur.filter((_, i) => i !== labelEditIndex);
    useMindMapStore.getState().updateMetadataNode(selectedId, { labels: next.length ? next : undefined });
    close();
  };
  const deleteImage = () => {
    useMindMapStore.getState().updateMetadataNode(selectedId, { image: undefined });
    close();
  };
  // 显式删除：笔记/链接/标签编辑模式的「删除」按钮
  const deleteNote = () => {
    setValue('');
    useMindMapStore.getState().updateMetadataNode(selectedId, { note: undefined });
    close();
  };
  const deleteLink = () => {
    useMindMapStore.getState().updateMetadataNode(selectedId, { link: undefined });
    close();
  };
  const deleteEditedLabel = () => {
    if (labelEditIndex == null) return;
    const cur = node.metadata?.labels ?? [];
    useMindMapStore.getState().updateMetadataNode(selectedId, {
      labels: cur.filter((_, i) => i !== labelEditIndex),
    });
    close();
  };

  const delBtn = (onClick: () => void) => (
    <button
      type="button"
      className="rounded border border-slate-200 px-2 py-0.5 text-xs text-rose-600 hover:bg-rose-50"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      删除
    </button>
  );

  const labelCount = node.metadata?.labels?.length ?? 0;

  return (
    <>
      <div
        className="absolute z-10 rounded-lg border-2 border-blue-500 bg-white p-2 shadow-lg"
        style={{
          left: (box.x + box.width / 2 + 14) * scale + v.x,
          top: box.y * scale + v.y,
          transform: 'translateY(-50%)',
          width: kind === 'image' ? 'auto' : 256,
        }}
        onMouseDown={(e) => {
          // 点击卡片内非输入区不转移焦点，避免误触发失焦关闭
          if (!(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement)) {
            e.preventDefault();
          }
        }}
      >
      {kind !== 'image' && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {TITLE_MAP[kind]}
            {kind === 'note'
              ? <SaveStatusIndicator prefix=" · " />
              : kind === 'labels'
                ? labelEditIndex != null
                  ? ' · Enter 替换'
                  : ' · Enter 添加'
                : ' · Enter 确认'}
          </span>
          {/* 显式删除入口：笔记/链接有内容或标签编辑模式时可用 */}
          {((kind === 'note' && node.metadata?.note) ||
            (kind === 'link' && node.metadata?.link) ||
            (kind === 'labels' && labelEditIndex != null)) &&
            delBtn(kind === 'note' ? deleteNote : kind === 'link' ? deleteLink : deleteEditedLabel)}
        </div>
      )}
      {kind === 'note' && (
        <textarea
          ref={noteRef}
          value={value}
          onChange={(e) => liveNote(e.target.value)}
          rows={4}
          placeholder="输入笔记内容…（清空即删除笔记）"
          className="w-full resize-y rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
          onBlur={close}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
              e.preventDefault();
              close();
            }
            e.stopPropagation();
          }}
        />
      )}
      {kind === 'link' && (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://…"
          className="w-full rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
          onBlur={commitLink}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Escape') {
              e.preventDefault();
              close();
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              commitLink();
            }
          }}
        />
      )}
      {kind === 'labels' && (
        <>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={labelEditIndex != null ? '修改标签' : '输入标签，逗号分隔可多个'}
            className="w-full rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
            onBlur={labelEditIndex != null ? commitLabelEdit : close}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Escape') {
                e.preventDefault();
                close();
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                if (labelEditIndex != null) commitLabelEdit();
                else appendLabels();
              }
              if (e.key === 'Backspace' && labelEditIndex == null && !value) {
                e.preventDefault();
                const cur = node.metadata?.labels ?? [];
                if (cur.length) {
                  useMindMapStore.getState().updateMetadataNode(selectedId, { labels: cur.slice(0, -1) });
                }
              }
            }}
          />
          {labelEditIndex == null && labelCount > 0 && (
            <div className="mt-1 text-xs text-slate-400">已添加 {labelCount} 个 · 空输入按退格删除末尾标签</div>
          )}
        </>
      )}
      {kind === 'image' && (
        // 与笔记卡片同款：标题行（含删除按钮）+ 内容区；点击图片放大查看
        <div className="w-56">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-slate-400">图片</span>
            {delBtn(deleteImage)}
          </div>
          <img
            src={imageSrc}
            alt="节点图片"
            className="block cursor-zoom-in rounded"
            style={{ maxWidth: 220 * scale, maxHeight: 220 * scale }}
            onClick={() => setLightbox(true)}
          />
        </div>
      )}
      </div>
      {lightbox && imageSrc && (
        // 放大查看：lightbox 渲染在卡片外（卡片带 transform，fixed 会相对卡片定位）
        <div
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/70"
          onClick={() => setLightbox(false)}
        >
          <img
            src={imageSrc}
            alt="节点图片放大"
            className="max-h-[85vh] max-w-[85vw] rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
