// src/components/statusbar/StatusBar.tsx
// 底部状态栏（参考 XMind）：右侧为画布缩放比例下拉与「大纲 / 思维导图」视图切换
import { Check, ChevronDown, ListTree, Network } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';

// 与滚轮连续缩放不同，此处仅提供固定档位（与 store 内 zoomStep 步进共用一组值）
const ZOOM_PRESETS = [0.5, 0.7, 0.8, 1, 1.2, 1.5, 2];

export function StatusBar() {
  const scale = useMindMapStore((s) => s.doc?.viewport.scale ?? 1);
  const multiCount = useMindMapStore((s) => s.selectedIds.length);
  const canvasMode = useUiStore((s) => s.canvasMode);
  const setCanvasMode = useUiStore((s) => s.setCanvasMode);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
