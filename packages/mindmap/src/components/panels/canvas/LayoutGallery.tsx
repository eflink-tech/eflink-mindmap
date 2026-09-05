// 布局画廊：按 category 分组，可折叠，三列缩略图网格
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  LAYOUT_PRESETS,
  type LayoutCategory,
  type LayoutPreset,
} from '../../../core/layout/presets';
import { LayoutThumbnail } from './LayoutThumbnails';

export interface LayoutGalleryProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

interface PresetGroup {
  category: LayoutCategory;
  label: string;
  items: LayoutPreset[];
}

function groupByCategory(presets: LayoutPreset[]): PresetGroup[] {
  const order: LayoutCategory[] = [];
  const map = new Map<LayoutCategory, LayoutPreset[]>();
  for (const p of presets) {
    let items = map.get(p.category);
    if (!items) {
      items = [];
      map.set(p.category, items);
      order.push(p.category);
    }
    items.push(p);
  }
  return order.map((category) => {
    const items = map.get(category)!;
    return { category, label: items[0].categoryLabel, items };
  });
}

export function LayoutGallery({ selectedId, onSelect }: LayoutGalleryProps) {
  const groups = useMemo(() => groupByCategory(LAYOUT_PRESETS), []);
  const [collapsed, setCollapsed] = useState<ReadonlySet<LayoutCategory>>(() => new Set());

  const toggle = (category: LayoutCategory) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {groups.map((g) => {
        const isCollapsed = collapsed.has(g.category);
        return (
          <section key={g.category}>
            <button
              type="button"
              data-testid={`layout-category-${g.category}`}
              aria-expanded={!isCollapsed}
              onClick={() => toggle(g.category)}
              className="mb-1 flex w-full items-center gap-1 text-left text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              {g.label}
            </button>
            {!isCollapsed && (
              <div className="grid grid-cols-3 gap-1.5">
                {g.items.map((preset) => {
                  const selected = selectedId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      data-testid={`layout-preset-${preset.id}`}
                      aria-pressed={selected}
                      aria-label={preset.label}
                      title={preset.label}
                      onClick={() => onSelect(preset.id)}
                      className={`flex flex-col items-center rounded border-2 p-1 ${
                        selected
                          ? 'border-blue-500'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <LayoutThumbnail preset={preset} />
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
