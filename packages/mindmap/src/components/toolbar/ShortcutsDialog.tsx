// 快捷键总览弹窗：按分组列出全部快捷键
import { useEffect, type JSX } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@eflink-tech/office-kit';
import { formatShortcut, SHORTCUT_GROUPS, isMacPlatform } from '../../core/shortcuts/catalog';
import { translateTitle } from '../../i18n/assetTitles';

export function ShortcutsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element | null {
  const { t, locale } = useI18n();
  const mac = isMacPlatform();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-dialog-title"
        className="flex max-h-[min(80vh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 id="shortcuts-dialog-title" className="text-base font-semibold text-slate-800">
            {t('action.shortcuts')}
          </h2>
          <button
            type="button"
            aria-label={t('action.close')}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          <p className="mb-4 text-xs text-slate-400">
            {t(mac ? 'mind.c.shortcuts.macNote' : 'mind.c.shortcuts.winNote')}
          </p>
          <div className="space-y-5">
            {SHORTCUT_GROUPS.map((group) => (
              <section key={group.title}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {translateTitle(group.title, locale)}
                </h3>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {group.items.map((item) => {
                    const primary = formatShortcut(item.keys, mac);
                    const alts = (item.altKeys ?? []).map((k) => formatShortcut(k, mac));
                    const keysText = [primary, ...alts].join(' / ');
                    return (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm"
                      >
                        <span className="text-slate-700">{translateTitle(item.label, locale)}</span>
                        <kbd className="shrink-0 rounded bg-slate-50 px-2 py-0.5 font-sans text-[12px] tabular-nums text-slate-500">
                          {keysText}
                        </kbd>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
