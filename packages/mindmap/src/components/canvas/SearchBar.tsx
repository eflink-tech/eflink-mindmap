// 查找/替换浮层：Ctrl/Cmd+F 打开，Enter 下一个、Shift+Enter 上一个、Esc 关闭；
// 右侧「标记过滤」只保留带该标记的节点（其余节点淡出），与查找互不影响。
import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@eflink-tech/office-kit';
import { searchNodes } from '../../core/editor/search';
import { markerId, markerLabel } from '../../core/markers/registry';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';

export function SearchBar() {
  const { t } = useI18n();
  const open = useUiStore((s) => s.searchOpen);
  const query = useUiStore((s) => s.searchQuery);
  const markerFilter = useUiStore((s) => s.markerFilter);
  const close = useUiStore((s) => s.closeSearch);
  const setQuery = useUiStore((s) => s.setSearchQuery);
  const setMarkerFilter = useUiStore((s) => s.setMarkerFilter);
  const doc = useMindMapStore((s) => s.doc);
  const selectedId = useMindMapStore((s) => s.selectedId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replacement, setReplacement] = useState('');
  // 关闭时顺带收起替换行：在渲染期同步，避免 effect 里 setState 触发级联渲染
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setReplaceOpen(false);
      setReplacement('');
    }
  }

  const matches = useMemo(() => (doc ? searchNodes(doc, query) : []), [doc, query]);

  // 文档中实际出现的标记，作为过滤下拉选项
  const markerOptions = useMemo(() => {
    if (!doc) return [];
    const seen = new Map<string, string>();
    for (const node of Object.values(doc.nodes)) {
      for (const m of node.metadata?.markers ?? []) {
        const id = markerId(m);
        if (!seen.has(id)) seen.set(id, markerLabel(m));
      }
    }
    return [...seen.entries()];
  }, [doc]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [open]);

  if (!open) return null;

  const currentIndex = selectedId ? matches.indexOf(selectedId) : -1;
  const goto = (delta: 1 | -1) => {
    if (!matches.length) return;
    const base = currentIndex >= 0 ? currentIndex : delta > 0 ? -1 : 0;
    const next = matches[(base + delta + matches.length) % matches.length];
    const store = useMindMapStore.getState();
    store.select(next);
    store.focusNode(next);
  };

  const replaceCurrent = () => {
    if (!query || currentIndex < 0) return;
    useMindMapStore.getState().replaceInNodes([matches[currentIndex]], query, replacement);
  };

  const replaceEvery = () => {
    if (!query || !matches.length) return;
    useMindMapStore.getState().replaceInNodes(matches, query, replacement);
  };

  const countText = !query.trim()
    ? ''
    : matches.length
      ? `${currentIndex >= 0 ? currentIndex + 1 : 1}/${matches.length}`
      : t('mind.search.noResult');

  return (
    <div className="absolute right-3 top-3 z-20 w-80 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Enter') {
              e.preventDefault();
              goto(e.shiftKey ? -1 : 1);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              close();
            }
          }}
          placeholder={t('mind.search.placeholder')}
          className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
        />
        <span className="w-12 shrink-0 text-center text-xs text-slate-400">{countText}</span>
        <button
          type="button"
          title={t('mind.search.prev')}
          disabled={!matches.length}
          className="rounded px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          onClick={() => goto(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          title={t('mind.search.next')}
          disabled={!matches.length}
          className="rounded px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          onClick={() => goto(1)}
        >
          ↓
        </button>
        <button
          type="button"
          title={t('action.close')}
          className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
          onClick={close}
        >
          ✕
        </button>
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <button
          type="button"
          className={`rounded px-1.5 py-0.5 text-xs ${
            replaceOpen ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-100'
          }`}
          onClick={() => setReplaceOpen((v) => !v)}
        >
          {t('mind.search.replace')}
        </button>
        <span className="ml-auto text-xs text-slate-400">{t('mind.search.filter')}</span>
        <select
          value={markerFilter ?? ''}
          onChange={(e) => setMarkerFilter(e.target.value || null)}
          className="max-w-32 rounded border border-slate-200 px-1 py-0.5 text-xs text-slate-600 outline-none"
        >
          <option value="">{t('mind.search.allMarkers')}</option>
          {markerOptions.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {replaceOpen && (
        <div className="mt-1.5 flex items-center gap-1">
          <input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.metaKey || e.ctrlKey) replaceEvery();
                else replaceCurrent();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                close();
              }
            }}
            placeholder={t('mind.search.replacePlaceholder')}
            className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
          />
          <button
            type="button"
            disabled={currentIndex < 0}
            className="rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            onClick={replaceCurrent}
          >
            {t('mind.search.replace')}
          </button>
          <button
            type="button"
            disabled={!matches.length}
            className="rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            onClick={replaceEvery}
          >
            {t('mind.search.replaceAll')}
          </button>
        </div>
      )}
    </div>
  );
}
