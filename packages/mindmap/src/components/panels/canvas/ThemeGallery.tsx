// 配色方案：对齐 XMind — 缤纷/经典分组 + 色条预览；浮层在触发器左侧（与布局画廊一致）
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '@eflink-tech/office-kit';
import {
  THEME_GROUPS,
  THEMES,
  resolveThemeId,
  themesInGroup,
  type ThemeGroup,
  type ThemeId,
} from '../../../core/style/themes';
import { translateTitle } from '../../../i18n/assetTitles';
import { useMindMapStore } from '../../../store/mindMapStore';

function ColorStrip({ colors, className = '' }: { colors: string[]; className?: string }) {
  return (
    <div className={`flex h-4 overflow-hidden rounded ${className}`}>
      {colors.map((c, i) => (
        <span key={`${c}-${i}`} className="min-w-0 flex-1" style={{ background: c }} />
      ))}
    </div>
  );
}

/** 浮层贴在触发器左侧，与 LayoutSelect.galleryPosition 同策略 */
function galleryPosition(anchor: DOMRect): CSSProperties {
  const width = 300;
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

export function ThemeGallery() {
  const { t, locale } = useI18n();
  const themeId = useMindMapStore((s) => s.doc?.themeId);
  const setTheme = useMindMapStore((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<ThemeGroup>('colorful');
  const [pos, setPos] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const currentId = (resolveThemeId(themeId ?? '') ?? 'classic') as ThemeId;
  const current = THEMES[currentId];
  const currentName = translateTitle(current.name, locale);

  useEffect(() => {
    if (current.group) setGroup(current.group);
  }, [current.group]);

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
      <h3 className="mb-2 text-xs font-medium text-slate-500">{t('mind.c.theme.label')}</h3>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${t('mind.c.theme.label')} ${currentName}`}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded border border-slate-200 px-2 py-1.5 text-left hover:border-slate-300"
      >
        <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{currentName}</span>
        <ColorStrip
          className="w-28 shrink-0"
          colors={current.colors.branches.slice(0, 6)}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            id={listId}
            role="listbox"
            aria-label={t('mind.c.theme.listAria')}
            data-testid="theme-gallery"
            style={pos}
            className="z-50 overflow-hidden rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
          >
            <div className="mb-2 flex border-b border-slate-100">
              {THEME_GROUPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroup(g.id)}
                  className={`flex-1 px-2 py-1.5 text-sm ${
                    group === g.id
                      ? 'border-b-2 border-blue-500 font-medium text-blue-600'
                      : 'text-slate-500'
                  }`}
                >
                  {translateTitle(g.label, locale)}
                </button>
              ))}
            </div>
            <ul className="grid max-h-[min(24rem,calc(100%-2.5rem))] grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto p-1">
              {themesInGroup(group).map(([id, theme]) => {
                const selected = currentId === id;
                const themeName = translateTitle(theme.name, locale);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      aria-label={t('mind.c.theme.apply', { name: themeName })}
                      onClick={() => {
                        setTheme(id);
                        setOpen(false);
                      }}
                      className="w-full rounded text-left hover:bg-slate-50"
                    >
                      <span className="mb-1 block truncate text-xs text-slate-600">{themeName}</span>
                      <ColorStrip
                        className={`h-5 w-full rounded-md ${selected ? 'ring-2 ring-offset-1 ring-slate-800' : ''}`}
                        colors={theme.colors.branches.slice(0, 6)}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </section>
  );
}
