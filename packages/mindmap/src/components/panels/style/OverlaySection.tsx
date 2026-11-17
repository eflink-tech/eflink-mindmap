// src/components/panels/style/OverlaySection.tsx
// 选中联系线 / 外框 / 概要时的样式面板：颜色、线宽、文字与删除。
import { Trash2 } from 'lucide-react';
import { useI18n } from '@eflink-tech/office-kit';
import { useMindMapStore } from '../../../store/mindMapStore';
import { ColorField, colorRecentKey } from '../../color';

const heading = 'mb-3 flex items-center justify-between text-xs font-medium text-slate-500';
const label = 'mb-1 block text-xs text-slate-500';
const control = 'w-full rounded border border-slate-300 px-2 py-1.5 text-sm';

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
      <label className={label}>
        {t('mind.p.color')}
      </label>
      <ColorField
        value={color}
        onChange={(next) => setRelationStyle(id, { color: next })}
        onDefault={() => setRelationStyle(id, { color: '#F43F5E' })}
        recentStorageKey={colorRecentKey('relation')}
        ariaLabel={t('mind.p.color')}
        className="mb-3"
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
      <label className={label}>
        {t('mind.p.borderColor')}
      </label>
      <ColorField
        value={color}
        onChange={(next) => setBoundaryStyle(id, { color: next })}
        onDefault={() => setBoundaryStyle(id, { color: '#B6BCC3' })}
        recentStorageKey={colorRecentKey('boundary-color')}
        ariaLabel={t('mind.p.borderColor')}
        className="mb-3"
      />
      <label className={label}>
        {t('mind.p.fill')}
      </label>
      <ColorField
        value={fill}
        onChange={(next) => setBoundaryStyle(id, { fill: next })}
        onDefault={() => setBoundaryStyle(id, { fill: '#F8FAFC' })}
        recentStorageKey={colorRecentKey('boundary-fill')}
        ariaLabel={t('mind.p.fill')}
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
          <label className={label}>
            {t('mind.p.fill')}
          </label>
          <ColorField
            value={fill}
            onChange={(next) => setSummaryStyle(id, { fillColor: next })}
            onDefault={() => setSummaryStyle(id, { fillColor: '#FFFFFF' })}
            recentStorageKey={colorRecentKey('summary-fill')}
            ariaLabel={t('mind.p.fill')}
          />
        </div>
        <div className="flex-1">
          <label className={label}>
            {t('mind.p.textColor')}
          </label>
          <ColorField
            value={textColor}
            onChange={(next) => setSummaryStyle(id, { textColor: next })}
            onDefault={() => setSummaryStyle(id, { textColor: '#0F172A' })}
            recentStorageKey={colorRecentKey('summary-text')}
            ariaLabel={t('mind.p.textColor')}
          />
        </div>
      </div>
      <label className={label}>
        {t('mind.p.borderColor')}
      </label>
      <ColorField
        value={borderColor}
        onChange={(next) => setSummaryStyle(id, { borderColor: next })}
        onDefault={() => setSummaryStyle(id, { borderColor: '#0F172A' })}
        recentStorageKey={colorRecentKey('summary-border')}
        ariaLabel={t('mind.p.borderColor')}
      />
    </section>
  );
}
