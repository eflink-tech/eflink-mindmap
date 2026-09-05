// 结构区：只读提示，结构由画布 Tab 的布局决定
import { DEFAULT_LAYOUT_PRESET_ID, legacyLayoutLabel } from '../../../core/layout/presets';
import { useMindMapStore } from '../../../store/mindMapStore';

export function StructureSection() {
  const layout = useMindMapStore((s) => s.doc?.layout ?? DEFAULT_LAYOUT_PRESET_ID);

  return (
    <section className="mt-4 border-t border-slate-100 pt-4">
      <h3 className="mb-2 text-xs font-medium text-slate-500">结构</h3>
      <p className="text-sm text-slate-600">当前：{legacyLayoutLabel(layout)}</p>
      <p className="mt-1 text-xs text-slate-400">结构由「画布」Tab 中的布局决定</p>
    </section>
  );
}
