// src/components/statusbar/StatusBar.tsx
// 底部状态栏（参考 XMind）：左侧为文档名（点击改名，参考 eflink-draw BottomBar）与保存状态，
// 右侧为画布缩放比例下拉与「大纲 / 思维导图」视图切换
import { Check, ChevronDown, ListTree, Network, Pencil } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';
import { SaveStatusIndicator } from './SaveStatusIndicator';

// 与滚轮连续缩放不同，此处仅提供固定档位（与 store 内 zoomStep 步进共用一组值）
const ZOOM_PRESETS = [0.5, 0.7, 0.8, 1, 1.2, 1.5, 2];

export function StatusBar() {
  const scale = useMindMapStore((s) => s.doc?.viewport.scale ?? 1);
  const multiCount = useMindMapStore((s) => s.selectedIds.length);
  const canvasMode = useUiStore((s) => s.canvasMode);
  const setCanvasMode = useUiStore((s) => s.setCanvasMode);
  const docTitle = useMindMapStore((s) => s.doc?.title ?? '');
  const hasDoc = useMindMapStore((s) => s.doc != null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // 文档名改名的行内编辑态（顶栏入口已移除，名字统一收口到底部状态栏）
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  // Esc 取消时置位，让随后的 blur 不再提交（与 BrandHeader 原行内编辑同一模式）
  const skipRenameCommitRef = useRef(false);

  // 进入改名：聚焦并全选现有标题
  useEffect(() => {
    if (!renaming) return;
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [renaming]);

  const beginRename = () => {
    const doc = useMindMapStore.getState().doc;
    if (!doc) return;
    skipRenameCommitRef.current = false;
    setDraft(doc.title);
    setRenaming(true);
  };

  // 提交改名：renameTitle 内部先持久化、成功后才同步内存；空值/同名会被忽略
  const commitRename = () => {
    if (skipRenameCommitRef.current) {
      skipRenameCommitRef.current = false;
      setRenaming(false);
      return;
    }
    setRenaming(false);
    void useMindMapStore.getState().renameTitle(draft);
  };

  // 打开菜单期间：点击外部或按 Esc 关闭
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const zoomButton =
    'flex h-6 items-center gap-0.5 rounded px-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900';
  const menuItem =
    'flex w-full items-center gap-1.5 px-3 py-1 text-left text-xs text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900';

  return (
    <div className="flex h-8 shrink-0 items-center justify-end gap-1 border-t border-slate-200 bg-white px-3">
      {/* 文档名：最左侧，点击进入行内改名（成功后画布各处标题跟随；失败 toast 且不改本地） */}
      {renaming ? (
        <input
          ref={renameInputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              skipRenameCommitRef.current = true;
              setRenaming(false);
            }
          }}
          aria-label="文档名"
          className="h-6 w-40 rounded border border-blue-400 px-1.5 text-xs text-slate-800 outline-none"
        />
      ) : (
        <button
          type="button"
          disabled={!hasDoc}
          title="点击重命名文档"
          onClick={beginRename}
          className="flex h-6 min-w-0 max-w-[200px] items-center gap-1 rounded px-1 text-xs text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-default disabled:hover:bg-transparent"
        >
          <Pencil size={12} className="shrink-0 text-slate-400" />
          <span className="truncate">{docTitle}</span>
        </button>
      )}
      {/* 保存状态：mr-auto 占据左侧，与右侧控件组分开 */}
      <span
        className="mr-auto text-xs text-slate-400"
        title="⌘S/Ctrl+S 保存到云端"
      >
        <SaveStatusIndicator />
      </span>
      {/* 多选反馈：框选 / Shift+点击选中多个节点时显示数量 */}
      {multiCount > 1 && (
        <span className="mr-1 text-xs text-slate-500" data-testid="selection-count">
          已选 {multiCount} 个节点
        </span>
      )}
      {/* 缩放比例：点击弹出档位菜单，向上展开 */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          title="缩放比例"
          aria-label={`缩放比例 ${Math.round(scale * 100)}%`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className={zoomButton}
        >
          {Math.round(scale * 100)}%
          <ChevronDown
            size={12}
            className={`text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {menuOpen && (
          <div className="absolute bottom-full right-0 z-20 mb-1 min-w-32 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
            {ZOOM_PRESETS.map((p) => {
              const active = Math.abs(scale - p) < 0.001;
              return (
                <button
                  key={p}
                  type="button"
                  className={menuItem}
                  onClick={() => {
                    useMindMapStore.getState().zoomTo(p);
                    setMenuOpen(false);
                  }}
                >
                  <Check size={12} className={`text-blue-600 ${active ? 'opacity-100' : 'opacity-0'}`} />
                  {Math.round(p * 100)}%
                </button>
              );
            })}
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              className={menuItem}
              title="适应屏幕 (Cmd/Ctrl+0)"
              onClick={() => {
                useMindMapStore.getState().fitToScreen();
                setMenuOpen(false);
              }}
            >
              <Check size={12} className="opacity-0" />
              适应屏幕
            </button>
          </div>
        )}
      </div>

      {/* 视图切换：与 XMind 一致，按钮显示的是可切换到的目标视图 */}
      <button
        type="button"
        title={canvasMode === 'mindmap' ? '切换到大纲视图' : '切换到思维导图视图'}
        aria-pressed={canvasMode === 'outline'}
        onClick={() => setCanvasMode(canvasMode === 'mindmap' ? 'outline' : 'mindmap')}
        className={zoomButton}
      >
        {canvasMode === 'mindmap' ? <ListTree size={13} /> : <Network size={13} />}
        {canvasMode === 'mindmap' ? '大纲' : '思维导图'}
      </button>
    </div>
  );
}
