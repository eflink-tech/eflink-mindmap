// src/components/presentation/PresentationControls.tsx
// 演示模式底部控制条：上一页 / 页码 / 下一页 / 退出；翻页时把当前节点居中。
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect } from 'react';
import { useI18n } from '@eflink-tech/office-kit';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';

export function PresentationControls() {
  const { t } = useI18n();
  const presentation = useUiStore((s) => s.presentation);
  const nodeId = presentation?.ids[presentation.index] ?? null;

  useEffect(() => {
    if (nodeId) useMindMapStore.getState().focusNode(nodeId);
  }, [nodeId]);

  if (!presentation || !nodeId) return null;

  const btn =
    'flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-30';

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-1 shadow-lg backdrop-blur">
        <button
          type="button"
          className={btn}
          title={t('mind.present.prev')}
          aria-label={t('mind.present.prev')}
          disabled={presentation.index === 0}
          onClick={() => useUiStore.getState().stepPresentation(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-12 text-center text-xs tabular-nums text-white/80">
          {t('mind.present.page', {
            current: presentation.index + 1,
            total: presentation.ids.length,
          })}
        </span>
        <button
          type="button"
          className={btn}
          title={t('mind.present.next')}
          aria-label={t('mind.present.next')}
          disabled={presentation.index >= presentation.ids.length - 1}
          onClick={() => useUiStore.getState().stepPresentation(1)}
        >
          <ChevronRight size={18} />
        </button>
        <div className="mx-1 h-5 w-px bg-white/20" />
        <button
          type="button"
          className={btn}
          title={t('mind.present.exit')}
          aria-label={t('mind.present.exit')}
          onClick={() => useUiStore.getState().stopPresentation()}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
