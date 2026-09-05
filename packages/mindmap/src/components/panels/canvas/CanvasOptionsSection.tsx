// 画布选项：背景色、全局字体、分支线宽、彩虹分支
import { DEFAULT_CANVAS_BACKGROUND, getCanvasOptions } from '../../../core/style/canvasOptions';
import { getTheme } from '../../../core/style/themes';
import { useMindMapStore } from '../../../store/mindMapStore';

const FONTS: { value: string; label: string }[] = [
  { value: '', label: '默认' },
  { value: 'serif', label: '衬线' },
  { value: 'monospace', label: '等宽' },
  { value: 'PingFang SC', label: 'PingFang SC' },
  { value: 'Microsoft YaHei', label: '微软雅黑' },
];

const LINE_WIDTHS = [1, 1.5, 2, 2.5, 3];

export function CanvasOptionsSection() {
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
        背景颜色
      </label>
      <input
        id="canvas-background"
        type="color"
        value={bgValue}
        onChange={(e) => setCanvasOption({ background: e.target.value })}
        className="mb-3 h-8 w-full cursor-pointer rounded border border-slate-200"
      />

      <label className="mb-1 block text-xs text-slate-500" htmlFor="canvas-fontfamily">
        全局字体
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
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <label className="mb-1 block text-xs text-slate-500" htmlFor="canvas-linewidth">
        分支线条宽度
      </label>
      <select
        id="canvas-linewidth"
        value={String(lineWidth)}
        onChange={(e) => setCanvasOption({ branchLineWidth: Number(e.target.value) })}
        className="mb-3 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
      >
        {LINE_WIDTHS.map((w) => (
          <option key={w} value={String(w)}>
            {w === theme.connector.width ? `默认 (${w})` : w}
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
        彩虹分支
      </label>
    </section>
  );
}
