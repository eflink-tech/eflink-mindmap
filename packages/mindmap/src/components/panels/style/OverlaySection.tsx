// src/components/panels/style/OverlaySection.tsx
// 选中联系线 / 外框 / 概要时的样式面板：颜色、线宽、文字与删除。
import { Trash2 } from 'lucide-react';
import { useI18n } from '@eflink-tech/office-kit';
import { useMindMapStore } from '../../../store/mindMapStore';

const heading = 'mb-3 flex items-center justify-between text-xs font-medium text-slate-500';
const label = 'mb-1 block text-xs text-slate-500';
const control = 'w-full rounded border border-slate-300 px-2 py-1.5 text-sm';
const colorInput = 'h-8 w-full cursor-pointer rounded border border-slate-200 bg-white p-0.5';

const RELATION_WIDTHS = [1, 1.5, 2, 3, 4];

function SectionHeader({ title, onDelete, deleteLabel }: { title: string; onDelete: () => void; deleteLabel: string }) {
  return (
    <h3 className={heading}>
      {title}
      <button
        type="button"
        onClick={onDelete}
        title={deleteLabel}
        aria-label={deleteLabel}
        className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
      >
        <Trash2 size={14} />
      </button>
    </h3>
  );
}

export function RelationSection({ id }: { id: string }) {
  const { t } = useI18n();
  const relation = useMindMapStore((s) => s.doc?.relations.find((r) => r.id === id));
  const setRelationStyle = useMindMapStore((s) => s.setRelationStyle);
  const updateLabel = useMindMapStore((s) => s.updateRelationLabelById);
  const remove = useMindMapStore((s) => s.removeRelationById);
  if (!relation) return null;

  const color = relation.style?.color ?? '#F43F5E';
  const width = relation.style?.width ?? 2;

  return (
    <section className="mb-4 border-t border-slate-100 pt-4">
      <SectionHeader
        title={t('mind.p.relationSection')}
        onDelete={() => remove(id)}
        deleteLabel={t('mind.p.deleteOverlay', { name: t('mind.p.relationSection') })}
      />
      <label className={label} htmlFor="relation-label">
        {t('mind.p.relationLabelText')}
      </label>
      <input
        id="relation-label"
        value={relation.label ?? ''}
        placeholder={t('mind.p.relationLabelText')}
        onChange={(e) => updateLabel(id, e.target.value)}
        className={`${control} mb-3`}
      />
      <label className={label} htmlFor="relation-color">
        {t('mind.p.color')}
      </label>
      <input
        id="relation-color"
        type="color"
        value={color}
        onChange={(e) => setRelationStyle(id, { color: e.target.value })}
        className={`${colorInput} mb-3`}
      />
      <label className={label} htmlFor="relation-width">
        {t('mind.p.lineWidth')}
      </label>
      <select
        id="relation-width"
        value={width}
        onChange={(e) => setRelationStyle(id, { width: Number(e.target.value) })}
        className={control}
      >
        {RELATION_WIDTHS.map((w) => (
          <option key={w} value={w}>
            {w}
          </option>
        ))}
      </select>
    </section>
  );
}

export function BoundarySection({ id }: { id: string }) {
  const { t } = useI18n();
  const boundary = useMindMapStore((s) => s.doc?.boundaries.find((b) => b.id === id));
  const setBoundaryStyle = useMindMapStore((s) => s.setBoundaryStyle);
  const updateTitle = useMindMapStore((s) => s.updateBoundaryTitleById);
  const remove = useMindMapStore((s) => s.removeBoundaryById);
  if (!boundary) return null;

  const color = boundary.style?.color ?? '#B6BCC3';
  const fill = boundary.style?.fill ?? '#F8FAFC';

  return (
    <section className="mb-4 border-t border-slate-100 pt-4">
      <SectionHeader
        title={t('mind.p.boundarySection')}
        onDelete={() => remove(id)}
        deleteLabel={t('mind.p.deleteOverlay', { name: t('mind.p.boundarySection') })}
      />
      <label className={label} htmlFor="boundary-title">
        {t('mind.p.relationLabelText')}
      </label>
      <input
        id="boundary-title"
        value={boundary.title ?? ''}
        placeholder={t('mind.p.relationLabelText')}
        onChange={(e) => updateTitle(id, e.target.value)}
        className={`${control} mb-3`}
      />
      <label className={label} htmlFor="boundary-color">
        {t('mind.p.borderColor')}
      </label>
      <input
        id="boundary-color"
        type="color"
        value={color}
        onChange={(e) => setBoundaryStyle(id, { color: e.target.value })}
        className={`${colorInput} mb-3`}
      />
      <label className={label} htmlFor="boundary-fill">
        {t('mind.p.fill')}
      </label>
      <input
        id="boundary-fill"
        type="color"
        value={fill}
        onChange={(e) => setBoundaryStyle(id, { fill: e.target.value })}
        className={colorInput}
      />
    </section>
  );
}

export function SummarySection({ id }: { id: string }) {
  const { t } = useI18n();
  const summary = useMindMapStore((s) => s.doc?.summaries.find((s) => s.id === id));
  const setSummaryStyle = useMindMapStore((s) => s.setSummaryStyle);
  const updateText = useMindMapStore((s) => s.updateSummaryTextById);
  const remove = useMindMapStore((s) => s.removeSummaryById);
  if (!summary) return null;

  const fill = summary.style?.fillColor ?? '#FFFFFF';
  const textColor = summary.style?.textColor ?? '#0F172A';
  const borderColor = summary.style?.borderColor ?? '#0F172A';

  return (
    <section className="mb-4 border-t border-slate-100 pt-4">
      <SectionHeader
        title={t('mind.p.summarySection')}
        onDelete={() => remove(id)}
        deleteLabel={t('mind.p.deleteOverlay', { name: t('mind.p.summarySection') })}
      />
      <label className={label} htmlFor="summary-text">
        {t('mind.p.summaryText')}
      </label>
      <input
        id="summary-text"
        value={summary.text}
        placeholder={t('mind.p.summaryText')}
        onChange={(e) => updateText(id, e.target.value)}
        className={`${control} mb-3`}
      />
      <div className="mb-3 flex gap-2">
        <div className="flex-1">
          <label className={label} htmlFor="summary-fill">
            {t('mind.p.fill')}
          </label>
          <input
            id="summary-fill"
            type="color"
            value={fill}
            onChange={(e) => setSummaryStyle(id, { fillColor: e.target.value })}
            className={colorInput}
          />
        </div>
        <div className="flex-1">
          <label className={label} htmlFor="summary-text-color">
            {t('mind.p.textColor')}
          </label>
          <input
            id="summary-text-color"
            type="color"
            value={textColor}
            onChange={(e) => setSummaryStyle(id, { textColor: e.target.value })}
            className={colorInput}
          />
        </div>
      </div>
      <label className={label} htmlFor="summary-border-color">
        {t('mind.p.borderColor')}
      </label>
      <input
        id="summary-border-color"
        type="color"
        value={borderColor}
        onChange={(e) => setSummaryStyle(id, { borderColor: e.target.value })}
        className={colorInput}
      />
    </section>
  );
}
