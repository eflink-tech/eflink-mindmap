// 分支级方向：覆盖整图生长方向，只作用于选中节点的子树；对固定网格结构不显示
import { useI18n } from '@eflink-tech/office-kit';
import { getPreset } from '../../../core/layout/presets';
import { supportsBranchDirection } from '../../../core/layout/strategies/shared';
import { useMindMapStore } from '../../../store/mindMapStore';
import type { BranchDirection } from '../../../types/mindmap';

const OPTIONS: { value: BranchDirection; labelKey: string }[] = [
  { value: 'right', labelKey: 'mind.p.dirRight' },
  { value: 'left', labelKey: 'mind.p.dirLeft' },
  { value: 'down', labelKey: 'mind.p.dirDown' },
  { value: 'up', labelKey: 'mind.p.dirUp' },
];

interface BranchDirectionSectionProps {
  nodeId: string;
}

export function BranchDirectionSection({ nodeId }: BranchDirectionSectionProps) {
  const { t } = useI18n();
  const doc = useMindMapStore((s) => s.doc);
  const setBranchDirection = useMindMapStore((s) => s.setBranchDirectionSelected);
  if (!doc || !doc.nodes[nodeId] || nodeId === doc.rootId) return null;

  const structure = getPreset(doc.layout)?.structure;
  if (!structure || !supportsBranchDirection(structure)) return null;

  const current = doc.nodes[nodeId].metadata?.branchDirection ?? null;

  return (
    <section className="mt-4 border-t border-slate-100 pt-4">
      <h3 className="mb-2 text-xs font-medium text-slate-500">{t('mind.p.branchDirection')}</h3>
      <div className="flex flex-wrap gap-1" role="group" aria-label={t('mind.p.branchDirection')}>
        <button
          type="button"
          aria-pressed={current === null}
          onClick={() => setBranchDirection(null)}
          className={`rounded border px-2 py-1 text-xs ${
            current === null
              ? 'border-blue-500 bg-blue-50 text-blue-600'
              : 'border-slate-300 text-slate-600'
          }`}
        >
          {t('mind.p.branchInherit')}
        </button>
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={current === o.value}
            onClick={() => setBranchDirection(o.value)}
            className={`rounded border px-2 py-1 text-xs ${
              current === o.value
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-slate-300 text-slate-600'
            }`}
          >
            {t(o.labelKey)}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-400">{t('mind.p.branchDirectionHint')}</p>
    </section>
  );
}
