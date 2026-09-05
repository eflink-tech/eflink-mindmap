// 标记面板：标记 | 贴纸 两个 Tab（对齐 XMind）。
// 点击图标 = 切换选中节点上的标记（同组互斥、再次点击移除），多选时整体应用。
// Tab 状态存于 uiStore：插入菜单的「贴纸」项会直接跳转到贴纸 Tab。
import { useState } from 'react';
import { MARKER_GROUPS, STICKER_GROUPS, markerEq, markerId, markerLabel, stickerMarker } from '../../../core/markers/registry';
import type { Marker } from '../../../types/mindmap';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUiStore } from '../../../store/uiStore';
import { MarkerIconSvg } from './MarkerIconSvg';

const TABS: { id: 'markers' | 'stickers'; label: string }[] = [
  { id: 'markers', label: '标记' },
  { id: 'stickers', label: '贴纸' },
];

function TabButton({ tab, label, current, onSelect }: {
  tab: 'markers' | 'stickers';
  label: string;
  current: 'markers' | 'stickers';
  onSelect: (t: 'markers' | 'stickers') => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={current === tab}
      onClick={() => onSelect(tab)}
      className={`flex-1 border-b-2 px-3 py-2 text-sm ${
        current === tab
          ? 'border-slate-800 font-medium text-slate-900'
          : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {label}
    </button>
  );
}

/** 可折叠分组标题（▼ 对齐 XMind） */
function GroupHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center gap-1 py-1.5 text-left text-xs font-medium text-slate-700 hover:text-slate-900"
    >
      <span
        className={`inline-block transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
        aria-hidden="true"
      >
        ▼
      </span>
      {title}
    </button>
  );
}

export function MarkerPanel() {
  const tab = useUiStore((s) => s.markersTab);
  const setTab = useUiStore((s) => s.setMarkersTab);
  const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set());

  const doc = useMindMapStore((s) => s.doc);
  const selectedId = useMindMapStore((s) => s.selectedId);
  const toggleMarkerSelected = useMindMapStore((s) => s.toggleMarkerSelected);

  const node = selectedId ? doc?.nodes[selectedId] : undefined;
  const markers = node?.metadata?.markers ?? [];
  const hasNode = !!node;

  const toggle = (marker: Marker) => toggleMarkerSelected(marker);
  const isActive = (marker: Marker) => markers.some((m) => markerEq(m, marker));

  const toggleGroup = (id: string) => {
    setClosedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const iconButtonClass = (active: boolean) =>
    `flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
      active ? 'bg-blue-50 ring-1 ring-blue-400' : 'hover:bg-slate-100'
    }`;

  /** 符号组（emoji 标记）直接以大号 emoji 文本展示，其余用矢量图标 */
  const iconContent = (marker: Marker) =>
    marker.type === 'emoji' ? (
      <span className="text-2xl leading-none">{marker.value}</span>
    ) : (
      <MarkerIconSvg marker={marker} size={26} />
    );

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex border-b border-slate-200">
        {TABS.map((t) => (
          <TabButton key={t.id} tab={t.id} label={t.label} current={tab} onSelect={setTab} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!hasNode && <p className="mb-2 text-sm text-slate-400">请先选中一个节点</p>}

        {tab === 'markers' && (
          <>
            {MARKER_GROUPS.map((group) => {
              const open = !closedGroups.has(group.id);
              return (
                <section key={group.id} className="mb-1">
                  <GroupHeader title={group.title} open={open} onToggle={() => toggleGroup(group.id)} />
                  {open && (
                    <div className="grid grid-cols-7 gap-1 pb-2 pl-4">
                      {group.items.map((marker) => {
                        const active = hasNode && isActive(marker);
                        return (
                          <button
                            key={markerId(marker)}
                            type="button"
                            title={markerLabel(marker)}
                            aria-pressed={active || undefined}
                            disabled={!hasNode}
                            className={`${iconButtonClass(active)} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                            onClick={() => toggle(marker)}
                          >
                            {iconContent(marker)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
            <p className="pt-1 text-xs leading-5 text-slate-400">
              点击图标应用到选中节点；同组标记互斥，再次点击已应用的图标可移除。
            </p>
          </>
        )}

        {tab === 'stickers' &&
          STICKER_GROUPS.map((group) => (
            <section key={group.id} className="mb-3">
              <h3 className="py-1.5 text-xs font-medium text-slate-700">▼ {group.title}</h3>
              <div className="grid grid-cols-6 gap-1 pl-4">
                {group.items.map((value) => {
                  const marker = stickerMarker(value);
                  const active = hasNode && isActive(marker);
                  return (
                    <button
                      key={`${group.id}-${value}`}
                      type="button"
                      title={value}
                      aria-pressed={active || undefined}
                      disabled={!hasNode}
                      className={`${iconButtonClass(active)} text-3xl disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
                      onClick={() => toggle(marker)}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}
