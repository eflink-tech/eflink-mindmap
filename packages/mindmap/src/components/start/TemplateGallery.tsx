// src/components/start/TemplateGallery.tsx
import { useI18n } from '@eflink-tech/office-kit';
import { getPreset } from '../../core/layout/presets';
import { THEMES } from '../../core/style/themes';
import { TEMPLATES, type TemplateSpec } from '../../core/templates/catalog';
import { translateTitle } from '../../i18n/assetTitles';

interface TemplateGalleryProps {
  creatingId: string | null;
  onCreate: (spec: TemplateSpec) => void;
}

/** 起始页模板库：卡片用模板主题的主色做小色条预览，名称与布局随界面语言 */
export function TemplateGallery({ creatingId, onCreate }: TemplateGalleryProps) {
  const { t } = useI18n();

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{t('mind.template.title')}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TEMPLATES.map((spec) => {
          const colors = THEMES[spec.theme].colors;
          const layoutLabel = translateTitle(getPreset(spec.layout)?.label ?? '');
          const name = translateTitle(spec.name);
          return (
            <button
              key={spec.id}
              type="button"
              disabled={creatingId !== null}
              aria-label={t('mind.template.use', { name })}
              onClick={() => onCreate(spec)}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white text-left transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md disabled:cursor-wait disabled:opacity-60"
            >
              <span
                className="flex h-16 items-end gap-1 px-3 pb-2"
                style={{
                  background: `linear-gradient(135deg, ${colors.branches[0]}26, ${
                    colors.branches[1] ?? colors.primary
                  }26)`,
                }}
              >
                {colors.branches.slice(0, 4).map((color, i) => (
                  <span
                    key={`${color}-${i}`}
                    className="rounded-full"
                    style={{
                      background: color,
                      width: 22 + i * 6,
                      height: 6,
                      opacity: creatingId === spec.id ? 0.4 : 1,
                    }}
                  />
                ))}
              </span>
              <span className="flex flex-col gap-0.5 px-3 py-2.5">
                <span className="truncate text-sm font-medium text-slate-800">{name}</span>
                <span className="text-xs text-slate-400">{layoutLabel}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
