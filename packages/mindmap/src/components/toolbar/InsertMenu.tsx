// src/components/toolbar/InsertMenu.tsx
// 插入下拉菜单（对齐 XMind）：笔记/标签/链接打开选中节点旁的浮层编辑器，
// 标记/贴纸跳转右侧标记面板对应 Tab，本地图片直接打开文件选择。
// 隐藏的 file input 必须常驻挂载（不能随菜单卸载），否则选文件后 onChange 不会触发。
import { useEffect, useRef } from 'react';
import { ImagePlus, Link2, NotebookPen, Sparkles, Sticker, Tag, type LucideIcon } from 'lucide-react';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';

// 图片以 base64 内嵌进文档并持久化到 IndexedDB，限制大小避免文档膨胀
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

interface Item {
  key: string;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onSelect: () => void;
}

export function InsertMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const selectedId = useMindMapStore((s) => s.selectedId);
  const openInsertEditor = useUiStore((s) => s.openInsertEditor);
  const setMarkersTab = useUiStore((s) => s.setMarkersTab);
  const togglePanel = useUiStore((s) => s.togglePanel);
  const panel = useUiStore((s) => s.panel);

  // 点击菜单外任意区域关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = document.getElementById('insert-menu');
      if (el && !el.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose]);

  // 打开右侧标记面板并切换到指定 Tab
  const openMarkersPanel = (tab: 'markers' | 'stickers') => {
    setMarkersTab(tab);
    if (panel !== 'markers') togglePanel('markers');
  };

  const items: Item[] = [
    { key: 'note', icon: NotebookPen, label: '笔记', disabled: !selectedId, onSelect: () => openInsertEditor('note') },
    { key: 'labels', icon: Tag, label: '标签', disabled: !selectedId, onSelect: () => openInsertEditor('labels') },
    { key: 'link', icon: Link2, label: '链接', disabled: !selectedId, onSelect: () => openInsertEditor('link') },
    { key: 'marker', icon: Sparkles, label: '标记', onSelect: () => openMarkersPanel('markers') },
    {
      key: 'image',
      icon: ImagePlus,
      label: '本地图片',
      disabled: !selectedId,
      onSelect: () => fileRef.current?.click(),
    },
    { key: 'sticker', icon: Sticker, label: '贴纸', onSelect: () => openMarkersPanel('stickers') },
  ];

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const targetId = useMindMapStore.getState().selectedId;
    if (!file || !targetId) return;
    if (file.size > MAX_IMAGE_BYTES) {
      window.alert('图片过大（上限 2MB），请选择更小的图片');
      return;
    }
    // 快照当前选中节点：读取完成时选中节点可能已切换，图片应落在发起选择的节点上
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        useMindMapStore.getState().updateMetadataNode(targetId, { image: reader.result as string });
      }
    };
    reader.onerror = () => {
      console.error('图片读取失败', reader.error);
      window.alert('图片读取失败，请重新选择文件');
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      {open && (
        <div
          id="insert-menu"
          className="absolute left-0 top-full z-30 mt-1 w-44 rounded-lg border border-slate-100 bg-white py-1.5 shadow-lg"
        >
          {items.map(({ key, icon: Icon, label, disabled, onSelect }) => (
            <button
              key={key}
              type="button"
              disabled={disabled}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
              onClick={() => {
                onSelect();
                onClose();
              }}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
      {/* 常驻挂载：菜单关闭后选中的文件仍能触发 onChange */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onPickFile}
      />
    </>
  );
}
