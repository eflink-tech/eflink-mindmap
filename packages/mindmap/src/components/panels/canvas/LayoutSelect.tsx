// 布局选择：触发器 + XMind 风格分组缩略图浮层（无 PRO）
import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_LAYOUT_PRESET_ID,
  getPreset,
  normalizeLayoutId,
} from '../../../core/layout/presets';
import { useMindMapStore } from '../../../store/mindMapStore';
import { LayoutGallery } from './LayoutGallery';
import { LayoutThumbnail } from './LayoutThumbnails';

function galleryPosition(anchor: DOMRect): CSSProperties {
  const width = 288;
  const maxH = Math.min(512, window.innerHeight - 16);
  const top = Math.max(8, Math.min(anchor.top, window.innerHeight - maxH - 8));
  return {
    position: 'fixed',
    top,
    right: window.innerWidth - anchor.left + 8,
    width,
    maxHeight: maxH,
  };
}

export function LayoutSelect() {
  const doc = useMindMapStore((s) => s.doc);
  const setLayout = useMindMapStore((s) => s.setLayout);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();

  const layoutId = doc ? normalizeLayoutId(doc.layout) : DEFAULT_LAYOUT_PRESET_ID;
  const preset = getPreset(layoutId);
  const categoryLabel = preset?.categoryLabel ?? '布局';

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = triggerRef.current;
      if (el) setPos(galleryPosition(el.getBoundingClientRect()));
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <section className="relative mb-4" ref={rootRef}>
      <h3 className="mb-2 text-xs font-medium text-slate-500">布局</h3>
      <button
        ref={triggerRef}
        type="button"
        data-testid="layout-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-label={`布局 ${categoryLabel}`}
        disabled={!doc}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded border border-slate-200 px-2 py-1.5 text-left hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {preset && <LayoutThumbnail preset={preset} className="h-8 w-12 shrink-0" />}
        <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{categoryLabel}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            id={dialogId}
            role="dialog"
            aria-label="布局预设"
            data-testid="layout-gallery"
            style={pos}
            className="z-50 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
          >
            <LayoutGallery
              selectedId={layoutId}
              onSelect={(id) => {
                setLayout(id);
                setOpen(false);
              }}
            />
          </div>,
          document.body,
        )}
    </section>
  );
}
