// 文本样式：字体、加粗/斜体/下划线/删除线、对齐
import { Bold, Italic, Strikethrough, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useI18n } from '@eflink-tech/office-kit';
import { resolveNodeStyle } from '../../../core/style/apply';
import { getTheme } from '../../../core/style/themes';
import { useMindMapStore } from '../../../store/mindMapStore';
import type { TextAlign } from '../../../types/mindmap';

const FONTS: { value: string; labelKey: string }[] = [
  { value: '', labelKey: 'mind.p.fontSystem' },
  { value: 'serif', labelKey: 'mind.p.fontSerif' },
  { value: 'monospace', labelKey: 'mind.p.fontMono' },
  { value: 'PingFang SC', labelKey: 'PingFang SC' },
  { value: 'Microsoft YaHei', labelKey: 'mind.p.fontYaHei' },
];

const ALIGNS: { value: TextAlign; labelKey: string; Icon: typeof AlignLeft }[] = [
  { value: 'left', labelKey: 'mind.p.alignLeft', Icon: AlignLeft },
  { value: 'center', labelKey: 'mind.p.alignCenter', Icon: AlignCenter },
  { value: 'right', labelKey: 'mind.p.alignRight', Icon: AlignRight },
];

interface TextSectionProps {
  nodeId: string;
}

export function TextSection({ nodeId }: TextSectionProps) {
  const { t } = useI18n();
  const doc = useMindMapStore((s) => s.doc);
  const setNodeStyle = useMindMapStore((s) => s.setNodeStyle);

  if (!doc || !doc.nodes[nodeId]) return null;

  const node = doc.nodes[nodeId];
  const resolved = resolveNodeStyle(doc, getTheme(doc), nodeId);
  const fontValue = node.style?.fontFamily ?? '';
  const isBold = resolved.fontWeight === 'bold';

  return (
    <section className="mt-4 border-t border-slate-100 pt-4">
      <h3 className="mb-2 text-xs font-medium text-slate-500">{t('mind.p.text')}</h3>

      <label className="mb-1 block text-xs text-slate-500" htmlFor="style-fontfamily">
        {t('mind.p.font')}
      </label>
      <select
        id="style-fontfamily"
        value={fontValue}
        onChange={(e) => {
          const v = e.target.value;
          setNodeStyle({ fontFamily: v === '' ? undefined : v });
        }}
        className="mb-3 w-full rounded border border-slate-300 px-2 py-1 text-sm"
      >
        {FONTS.map((f) => (
          <option key={f.value} value={f.value}>
            {t(f.labelKey)}
          </option>
        ))}
      </select>

      <span id="style-textdeco" className="mb-1 block text-xs text-slate-500">
        {t('mind.p.style')}
      </span>
      <div className="mb-3 flex gap-1" role="group" aria-labelledby="style-textdeco">
        <button
          type="button"
          title={t('mind.p.bold')}
          aria-label={t('mind.p.bold')}
          aria-pressed={isBold}
          onClick={() => setNodeStyle({ fontWeight: isBold ? 'normal' : 'bold' })}
          className={`rounded border p-1.5 ${
            isBold ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200'
          }`}
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          title={t('mind.p.italic')}
          aria-label={t('mind.p.italic')}
          aria-pressed={resolved.italic}
          onClick={() => setNodeStyle({ italic: !resolved.italic })}
          className={`rounded border p-1.5 ${
            resolved.italic ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200'
          }`}
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          title={t('mind.p.underline')}
          aria-label={t('mind.p.underline')}
          aria-pressed={resolved.underline}
          onClick={() => setNodeStyle({ underline: !resolved.underline })}
          className={`rounded border p-1.5 ${
            resolved.underline ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200'
          }`}
        >
          <Underline size={16} />
        </button>
        <button
          type="button"
          title={t('mind.p.strikethrough')}
          aria-label={t('mind.p.strikethrough')}
          aria-pressed={resolved.strikethrough}
          onClick={() => setNodeStyle({ strikethrough: !resolved.strikethrough })}
          className={`rounded border p-1.5 ${
            resolved.strikethrough ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200'
          }`}
        >
          <Strikethrough size={16} />
        </button>
      </div>

      <span id="style-textalign" className="mb-1 block text-xs text-slate-500">
        {t('mind.p.align')}
      </span>
      <div className="flex gap-1" role="group" aria-labelledby="style-textalign">
        {ALIGNS.map(({ value, labelKey, Icon }) => (
          <button
            key={value}
            type="button"
            title={t(labelKey)}
            aria-label={t(labelKey)}
            aria-pressed={resolved.textAlign === value}
            onClick={() => setNodeStyle({ textAlign: value })}
            className={`flex-1 rounded border p-1.5 ${
              resolved.textAlign === value
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-slate-200'
            }`}
          >
            <Icon size={16} className="mx-auto" />
          </button>
        ))}
      </div>
    </section>
  );
}
