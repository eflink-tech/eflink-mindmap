// 节点外观：填充/边框色、线型线宽、字号、字重、形状、定宽与清除自定义样式
import { Eraser } from 'lucide-react';
import { resolveNodeStyle } from '../../../core/style/apply';
import { getTheme } from '../../../core/style/themes';
import { useMindMapStore } from '../../../store/mindMapStore';
import type { BorderStyle, FontWeight, NodeShape } from '../../../types/mindmap';

const FONT_SIZES = [12, 14, 16, 18, 20, 24];

const SHAPES: { value: NodeShape; label: string }[] = [
  { value: 'rounded', label: '圆角矩形' },
  { value: 'ellipse', label: '椭圆' },
  { value: 'rectangle', label: '矩形' },
];

const FONT_WEIGHTS: { value: FontWeight; label: string }[] = [
  { value: 'normal', label: '常规' },
  { value: 'bold', label: '加粗' },
];

const BORDER_STYLES: { value: BorderStyle; label: string }[] = [
  { value: 'solid', label: '实线' },
  { value: 'dashed', label: '虚线' },
  { value: 'none', label: '无' },
];

const BORDER_WIDTHS = [1, 2, 3, 4];

interface ShapeSectionProps {
  nodeId: string;
}

export function ShapeSection({ nodeId }: ShapeSectionProps) {
  const doc = useMindMapStore((s) => s.doc);
  const setNodeStyle = useMindMapStore((s) => s.setNodeStyle);
  const clearNodeStyle = useMindMapStore((s) => s.clearNodeStyle);

  if (!doc || !doc.nodes[nodeId]) return null;

  const resolved = resolveNodeStyle(doc, getTheme(doc), nodeId);
  const node = doc.nodes[nodeId];

  return (
    <section>
      <h3 className="mb-2 text-xs font-medium text-slate-500">外观</h3>

      <label className="mb-1 block text-xs text-slate-500" htmlFor="style-fill">
        填充色
      </label>
      <input
        id="style-fill"
        type="color"
        value={resolved.fillColor}
        onChange={(e) => setNodeStyle({ fillColor: e.target.value })}
        className="mb-3 h-8 w-full cursor-pointer rounded border border-slate-200"
      />

      <label className="mb-1 block text-xs text-slate-500" htmlFor="style-text">
        文字色
      </label>
      <input
        id="style-text"
        type="color"
        value={resolved.textColor}
        onChange={(e) => setNodeStyle({ textColor: e.target.value })}
        className="mb-3 h-8 w-full cursor-pointer rounded border border-slate-200"
      />

      <label className="mb-1 block text-xs text-slate-500" htmlFor="style-border">
        边框色
      </label>
      <div className="mb-3 flex items-center gap-2">
        <input
          id="style-border"
          type="color"
          value={resolved.borderColor === 'transparent' ? '#000000' : resolved.borderColor}
          onChange={(e) => setNodeStyle({ borderColor: e.target.value })}
          className="h-8 w-full cursor-pointer rounded border border-slate-200"
        />
        <button
          type="button"
          onClick={() => setNodeStyle({ borderColor: 'transparent' })}
          className="shrink-0 rounded border border-slate-200 px-2 py-1 text-xs"
          aria-label="无边框"
          aria-pressed={resolved.borderColor === 'transparent'}
          title="无边框"
        >
          无
        </button>
      </div>

      <span id="style-borderstyle" className="mb-1 block text-xs text-slate-500">
        边框线型
      </span>
      <div className="mb-3 flex gap-2" role="group" aria-labelledby="style-borderstyle">
        {BORDER_STYLES.map((b) => (
          <button
            key={b.value}
            type="button"
            onClick={() => setNodeStyle({ borderStyle: b.value })}
            aria-pressed={resolved.borderStyle === b.value}
            className={`flex-1 rounded border px-2 py-1 text-sm ${
              resolved.borderStyle === b.value
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-slate-200'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-xs text-slate-500" htmlFor="style-borderwidth">
        边框宽度
      </label>
      <select
        id="style-borderwidth"
        value={resolved.borderWidth}
        onChange={(e) => setNodeStyle({ borderWidth: Number(e.target.value) })}
        disabled={resolved.borderStyle === 'none'}
        className="mb-3 w-full rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-40"
      >
        {BORDER_WIDTHS.map((n) => (
          <option key={n} value={n}>
            {n}px
          </option>
        ))}
      </select>

      <label className="mb-1 block text-xs text-slate-500" htmlFor="style-fontsize">
        字号
      </label>
      <select
        id="style-fontsize"
        value={resolved.fontSize}
        onChange={(e) => setNodeStyle({ fontSize: Number(e.target.value) })}
        className="mb-3 w-full rounded border border-slate-300 px-2 py-1 text-sm"
      >
        {FONT_SIZES.map((n) => (
          <option key={n} value={n}>
            {n}px
          </option>
        ))}
      </select>

      <span id="style-fontweight" className="mb-1 block text-xs text-slate-500">
        字重
      </span>
      <div className="mb-3 flex gap-2" role="group" aria-labelledby="style-fontweight">
        {FONT_WEIGHTS.map((w) => (
          <button
            key={w.value}
            type="button"
            onClick={() => setNodeStyle({ fontWeight: w.value })}
            aria-pressed={resolved.fontWeight === w.value}
            className={`flex-1 rounded border px-2 py-1 text-sm ${
              resolved.fontWeight === w.value
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-slate-200'
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-xs text-slate-500" htmlFor="style-shape">
        形状
      </label>
      <select
        id="style-shape"
        value={resolved.shape}
        onChange={(e) => setNodeStyle({ shape: e.target.value as NodeShape })}
        className="mb-3 w-full rounded border border-slate-300 px-2 py-1 text-sm"
      >
        {SHAPES.map((sh) => (
          <option key={sh.value} value={sh.value}>
            {sh.label}
          </option>
        ))}
      </select>

      <label className="mb-1 block text-xs text-slate-500" htmlFor="style-fixedwidth">
        节点宽度
      </label>
      <div className="mb-3 flex items-center gap-2">
        <input
          id="style-fixedwidth"
          type="number"
          min={40}
          max={800}
          placeholder="自动"
          value={resolved.fixedWidth ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              setNodeStyle({ fixedWidth: undefined });
              return;
            }
            const n = Number(raw);
            if (!Number.isFinite(n) || n <= 0) return;
            setNodeStyle({ fixedWidth: Math.min(800, Math.max(40, n)) });
          }}
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={() => setNodeStyle({ fixedWidth: undefined })}
          className="shrink-0 rounded border border-slate-200 px-2 py-1 text-xs"
          title="按内容适合宽度"
          aria-pressed={resolved.fixedWidth == null}
        >
          适合
        </button>
      </div>

      <button
        type="button"
        onClick={clearNodeStyle}
        disabled={!node.style}
        className="flex w-full items-center justify-center gap-1 rounded border border-slate-200 px-2 py-1.5 text-sm disabled:opacity-30"
        title="恢复主题默认样式"
      >
        <Eraser size={14} /> 清除自定义样式
      </button>
    </section>
  );
}
