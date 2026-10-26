// 画布选项：背景色、全局字体、分支线宽、彩虹分支
import { useI18n } from '@eflink-tech/office-kit';
import { DEFAULT_CANVAS_BACKGROUND, getCanvasOptions } from '../../../core/style/canvasOptions';
import { getTheme } from '../../../core/style/themes';
import { useMindMapStore } from '../../../store/mindMapStore';

const FONTS: { value: string; labelKey: string }[] = [
  { value: '', labelKey: 'mind.p.fontDefault' },
  { value: 'serif', labelKey: 'mind.p.fontSerif' },
  { value: 'monospace', labelKey: 'mind.p.fontMono' },
  { value: 'PingFang SC', labelKey: 'PingFang SC' },
  { value: 'Microsoft YaHei', labelKey: 'mind.p.fontYaHei' },
];

const LINE_WIDTHS = [1, 1.5, 2, 2.5, 3];

export function CanvasOptionsSection() {
  const { t } = useI18n();
  const doc = useMindMapStore((s) => s.doc);
  const setCanvasOption = useMindMapStore((s) => s.setCanvasOption);

  if (!doc) return null;

  const opts = getCanvasOptions(doc);
  const theme = getTheme(doc);
  // 与 XMind 一致：未设置时展示白底，不跟随主题 background
  const bgValue = opts.background ?? DEFAULT_CANVAS_BACKGROUND;
  const fontValue = opts.fontFamily ?? '';
  const lineWidth = opts.branchLineWidth ?? theme.connector.width;

  return (
    <section className="mb-4 border-t border-slate-100 pt-4">
      <label className="mb-1 block text-xs text-slate-500" htmlFor="canvas-background">
        {t('mind.p.background')}
      </label>
      <input
        id="canvas-background"
        type="color"
        value={bgValue}
        onChange={(e) => setCanvasOption({ background: e.target.value })}
        className="mb-3 h-8 w-full cursor-pointer rounded border border-slate-200"
      />

      <label className="mb-1 block text-xs text-slate-500" htmlFor="canvas-fontfamily">
        {t('mind.p.globalFont')}
      </label>
      <select
        id="canvas-fontfamily"
        value={fontValue}
        onChange={(e) => {
          const v = e.target.value;
          setCanvasOption({ fontFamily: v === '' ? undefined : v });
        }}
        className="mb-3 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
      >
        {FONTS.map((f) => (
          <option key={f.value} value={f.value}>
            {t(f.labelKey)}
          </option>
        ))}
      </select>

      <label className="mb-1 block text-xs text-slate-500" htmlFor="canvas-linewidth">
        {t('mind.p.branchLineWidth')}
      </label>
      <select
        id="canvas-linewidth"
        value={String(lineWidth)}
        onChange={(e) => setCanvasOption({ branchLineWidth: Number(e.target.value) })}
        className="mb-3 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
      >
        {LINE_WIDTHS.map((w) => (
          <option key={w} value={String(w)}>
            {w === theme.connector.width ? t('mind.p.defaultOption', { width: w }) : w}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={opts.rainbowBranches}
          onChange={(e) => setCanvasOption({ rainbowBranches: e.target.checked })}
          className="rounded border-slate-300"
        />
        {t('mind.p.rainbow')}
      </label>
    </section>
  );
}
