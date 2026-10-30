// src/components/panels/canvas/ThemeEditor.tsx
// 主题微调：在当前配色之上覆盖主色/分支色/节点形状字号/连线样式，写进 doc.styleOverrides。
import { useI18n } from '@eflink-tech/office-kit';
import { getTheme } from '../../../core/style/themes';
import { useMindMapStore } from '../../../store/mindMapStore';
import type { NodeShape } from '../../../types/mindmap';

const SHAPES: { value: NodeShape; labelKey: string }[] = [
  { value: 'rounded', labelKey: 'mind.p.shapeRounded' },
  { value: 'rectangle', labelKey: 'mind.p.shapeRect' },
  { value: 'pill', labelKey: 'mind.p.shapePill' },
  { value: 'ellipse', labelKey: 'mind.p.shapeEllipse' },
  { value: 'hexagon', labelKey: 'mind.p.shapeHex' },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32];
const LINE_WIDTHS = [1, 1.5, 2, 2.5, 3];
/** 自定义分支颜色只编辑前 6 条，其余沿用原配色 */
const EDITABLE_BRANCHES = 6;

const fieldLabel = 'mb-1 block text-xs text-slate-500';
const control = 'w-full rounded border border-slate-300 px-2 py-1.5 text-sm';

export function ThemeEditor() {
  const { t } = useI18n();
  const doc = useMindMapStore((s) => s.doc);
  const setStyleOverrides = useMindMapStore((s) => s.setStyleOverrides);

  if (!doc) return null;
  const theme = getTheme(doc);
  const custom = doc.styleOverrides != null;

  const setBranchColor = (index: number, color: string) => {
    const branches = [...theme.colors.branches];
    branches[index] = color;
    setStyleOverrides({ colors: { branches } });
  };

  return (
    <section className="mb-4 border-t border-slate-100 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-500">{t('mind.p.themeEditor')}</h3>
        {custom && (
          <button
            type="button"
            onClick={() => setStyleOverrides(null)}
            className="text-xs text-blue-600 hover:underline"
          >
            {t('mind.p.themeReset')}
          </button>
        )}
      </div>

      <label className={fieldLabel} htmlFor="theme-primary">
        {t('mind.p.themePrimary')}
      </label>
      <input
        id="theme-primary"
        type="color"
        value={theme.colors.primary}
        onChange={(e) => setStyleOverrides({ colors: { primary: e.target.value } })}
        className="mb-3 h-8 w-full cursor-pointer rounded border border-slate-200"
      />

      <span className={fieldLabel}>{t('mind.p.themeBranches')}</span>
      <div className="mb-3 grid grid-cols-6 gap-1.5">
        {Array.from({ length: EDITABLE_BRANCHES }, (_, i) => {
          const color = theme.colors.branches[i] ?? theme.colors.primary;
          return (
            <input
              key={i}
              type="color"
              value={color}
              aria-label={t('mind.p.branchColorAria', { n: i + 1 })}
              onChange={(e) => setBranchColor(i, e.target.value)}
              className="h-7 w-full cursor-pointer rounded border border-slate-200 bg-white p-0.5"
            />
          );
        })}
      </div>

      <div className="mb-3 flex gap-2">
        <div className="flex-1">
          <label className={fieldLabel} htmlFor="theme-shape">
            {t('mind.p.shape')}
          </label>
          <select
            id="theme-shape"
            value={theme.node.shape}
            onChange={(e) => setStyleOverrides({ node: { shape: e.target.value as NodeShape } })}
            className={control}
          >
            {SHAPES.map((s) => (
              <option key={s.value} value={s.value}>
                {t(s.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className={fieldLabel} htmlFor="theme-fontsize">
            {t('mind.p.fontSize')}
          </label>
          <select
            id="theme-fontsize"
            value={theme.node.fontSize}
            onChange={(e) => setStyleOverrides({ node: { fontSize: Number(e.target.value) } })}
            className={control}
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className={fieldLabel} htmlFor="theme-connector">
            {t('mind.p.lineType')}
          </label>
          <select
            id="theme-connector"
            value={theme.connector.type}
            onChange={(e) =>
              setStyleOverrides({ connector: { type: e.target.value as 'curve' | 'straight' } })
            }
            className={control}
          >
            <option value="curve">{t('mind.p.curve')}</option>
            <option value="straight">{t('mind.p.straight')}</option>
          </select>
        </div>
        <div className="flex-1">
          <label className={fieldLabel} htmlFor="theme-linewidth">
            {t('mind.p.lineWidth')}
          </label>
          <select
            id="theme-linewidth"
            value={theme.connector.width}
            onChange={(e) => setStyleOverrides({ connector: { width: Number(e.target.value) } })}
            className={control}
          >
            {LINE_WIDTHS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
