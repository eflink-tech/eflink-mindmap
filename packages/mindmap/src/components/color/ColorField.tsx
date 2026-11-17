import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { ColorPicker, type ColorSelectOptions } from './ColorPicker';

export type ColorFieldProps = {
  value: string;
  onChange: (color: string, options?: ColorSelectOptions) => void;
  onDefault: () => void;
  recentStorageKey: string;
  ariaLabel: string;
  /** 紧凑模式：只显示色块（用于主题分支色等多列排布） */
  compact?: boolean;
  className?: string;
};

const PALETTE_WIDTH = 240;

export function ColorField({
  value,
  onChange,
  onDefault,
  recentStorageKey,
  ariaLabel,
  compact,
  className,
}: ColorFieldProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  const toggle = () => {
    if (open) {
      close();
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - PALETTE_WIDTH - 8)),
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !portalRef.current?.contains(target)) {
        close();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  // 调色板高约 330px：底部放不下时整体上移，保证完整可见
  useLayoutEffect(() => {
    if (!open || !pos) return;
    const height = portalRef.current?.getBoundingClientRect().height ?? 0;
    const maxTop = window.innerHeight - height - 8;
    if (pos.top > maxTop) {
      setPos({ top: Math.max(8, maxTop), left: pos.left });
    }
  }, [open, pos]);

  const handleSelect = (color: string, options?: ColorSelectOptions) => {
    onChange(color, options);
    if (options?.close !== false) close();
  };

  const handleDefault = () => {
    onDefault();
    close();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        title={ariaLabel}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={
          compact
            ? `h-7 w-full rounded border border-slate-200 p-0.5 hover:border-slate-400 ${className ?? ''}`
            : `flex h-8 w-full items-center gap-2 rounded border border-slate-200 bg-white px-1.5 text-xs text-slate-600 hover:border-slate-400 ${className ?? ''}`
        }
      >
        {compact ? (
          <span
            className="block h-full w-full rounded-sm border border-slate-200/70"
            style={{ backgroundColor: value }}
          />
        ) : (
          <>
            <span
              className="h-5 w-5 shrink-0 rounded-sm border border-slate-200"
              style={{ backgroundColor: value }}
            />
            <span className="min-w-0 flex-1 truncate text-left">{value}</span>
            <ChevronDown size={12} className="shrink-0 text-slate-400" />
          </>
        )}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={portalRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 100001 }}
          >
            <ColorPicker
              open={open}
              onOpenChange={close}
              value={value}
              recentStorageKey={recentStorageKey}
              onSelect={handleSelect}
              onDefault={handleDefault}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
