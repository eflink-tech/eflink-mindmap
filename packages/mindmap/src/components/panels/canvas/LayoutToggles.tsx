// 布局开关：平衡 / 紧凑 / 同级等宽（引擎行为见 Task 7）
import { useI18n } from '@eflink-tech/office-kit';
import { getCanvasOptions } from '../../../core/style/canvasOptions';
import { getStructure } from '../../../core/layout/structures';
import { useMindMapStore } from '../../../store/mindMapStore';

export function LayoutToggles() {
  const { t } = useI18n();
  const doc = useMindMapStore((s) => s.doc);
  const setCanvasOption = useMindMapStore((s) => s.setCanvasOption);

  if (!doc) return null;

  const opts = getCanvasOptions(doc);
  const structure = getStructure(doc);
  const isMindmap = structure === 'map-balanced';
  const disabledTip = isMindmap ? undefined : t('mind.p.mindmapOnly');

  return (
    <section className="mb-4">
      <h3 className="mb-2 text-xs font-medium text-slate-500">{t('mind.p.layoutOptions')}</h3>
      <div className="flex flex-col gap-2">
        <label
          className={`flex items-center gap-2 text-sm ${isMindmap ? 'text-slate-700' : 'text-slate-400'}`}
          title={disabledTip}
        >
          <input
            type="checkbox"
            checked={opts.balanced}
            disabled={!isMindmap}
            title={disabledTip}
            onChange={(e) => setCanvasOption({ balanced: e.target.checked })}
            className="rounded border-slate-300"
          />
          {t('mind.p.balanced')}
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={opts.compact}
            onChange={(e) => setCanvasOption({ compact: e.target.checked })}
            className="rounded border-slate-300"
          />
          {t('mind.p.compact')}
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={opts.unifySiblingWidth}
            onChange={(e) => setCanvasOption({ unifySiblingWidth: e.target.checked })}
            className="rounded border-slate-300"
          />
          {t('mind.p.equalWidthSiblings')}
        </label>
      </div>
    </section>
  );
}
