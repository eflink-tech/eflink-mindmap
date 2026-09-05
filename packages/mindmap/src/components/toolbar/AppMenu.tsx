// src/components/toolbar/AppMenu.tsx
// 汉堡主菜单：一级（文件 / 编辑 / 查看 / 快捷键）+ 右侧飞出二级。
// 隐藏 file input 常驻挂载（对齐 InsertMenu）：菜单关闭后仍能收到导入 onChange。
import { useEffect, useRef, useState, type ChangeEvent, type ReactElement, type ReactNode } from 'react';
import {
  ClipboardPaste,
  Copy,
  Download,
  Eye,
  FilePlus2,
  FileText,
  Image,
  Keyboard,
  ListTree,
  Maximize2,
  Network,
  Pencil,
  Save,
  Scissors,
  SquarePen,
  Trash2,
  Undo2,
  Redo2,
  Upload,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from 'lucide-react';
import { menuShortcutLabel } from '../../core/shortcuts/catalog';
import { saveNowWithToast } from '../../core/persistence/saveNow';
import { useDocumentsStore } from '../../store/documentsStore';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';
import { exportEfmJson, exportPng, importEfmJsonFile } from './exportActions';
import { ConfirmDialog } from '../ConfirmDialog';
import { ShortcutsDialog } from './ShortcutsDialog';

type Flyout = 'file' | 'edit' | 'view' | null;

const panelClass =
  'rounded-lg border border-slate-100 bg-white py-1.5 shadow-lg';

const itemClass =
  'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent';

function ShortcutHint({ text }: { text: string }) {
  return (
    <span className="shrink-0 font-sans text-[11px] tabular-nums tracking-wide text-slate-400">
      {text}
    </span>
  );
}

function MenuItem({
  icon: Icon,
  label,
  shortcut,
  disabled,
  trailing,
  onClick,
  onMouseEnter,
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  trailing?: ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
}) {
  return (
    <button
      type="button"
      className={itemClass}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <Icon size={15} className="shrink-0 opacity-70" aria-hidden />
      <span className="min-w-0 flex-1">{label}</span>
      {shortcut ? <ShortcutHint text={shortcut} /> : null}
      {trailing}
    </button>
  );
}

export function AppMenu({
  open,
  onClose,
  onRequestRename,
}: {
  open: boolean;
  onClose: () => void;
  onRequestRename: () => void;
}): ReactElement {
  const fileRef = useRef<HTMLInputElement>(null);
  const [flyout, setFlyout] = useState<Flyout>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [newDocConfirmOpen, setNewDocConfirmOpen] = useState(false);

  const canUndo = useMindMapStore((s) => s.canUndo());
  const canRedo = useMindMapStore((s) => s.canRedo());
  const selectedId = useMindMapStore((s) => s.selectedId);
  const rootId = useMindMapStore((s) => s.doc?.rootId);
  const hasClipboard = useMindMapStore((s) => s.clipboard != null);
  const canvasMode = useUiStore((s) => s.canvasMode);

  const noSelection = !selectedId;
  const isRoot = !!selectedId && selectedId === rootId;
  const copyDisabled = noSelection;
  const cutOrDeleteDisabled = noSelection || isRoot;
  const pasteDisabled = !hasClipboard;
  const viewSwitchLabel = canvasMode === 'mindmap' ? '大纲视图' : '思维导图视图';
  const ViewSwitchIcon = canvasMode === 'mindmap' ? ListTree : Network;

  // 外部 mousedown 关闭；汉堡按钮（aria-label=菜单）由父级切换，此处排除以免与 toggle 打架
  useEffect(() => {
    if (!open) {
      setFlyout(null);
      return;
    }
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const el = document.getElementById('app-menu');
      if (el?.contains(target)) return;
      const elem = target instanceof Element ? target : target.parentElement;
      if (elem?.closest('[aria-label="菜单"]')) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const runAndClose = (fn: () => void) => {
    fn();
    onClose();
  };

  const handleNewDocClick = () => {
    onClose();
    setNewDocConfirmOpen(true);
  };

  const confirmNewDoc = () => {
    setNewDocConfirmOpen(false);
    void (async () => {
      try {
        const doc = await useDocumentsStore.getState().createDoc();
        useMindMapStore.getState().open(doc);
        localStorage.setItem('efmindmap:lastDoc', doc.id);
      } catch (err) {
        console.error('新建文档失败', err);
      }
    })();
  };

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) importEfmJsonFile(file);
  };

  return (
    <>
      {open && (
        <div
          id="app-menu"
          className={`absolute left-0 top-full z-30 mt-1 w-44 ${panelClass}`}
        >
          <FlyoutTrigger
            icon={FileText}
            label="文件"
            active={flyout === 'file'}
            onEnter={() => setFlyout('file')}
          >
            <MenuItem icon={FilePlus2} label="新建导图" onClick={handleNewDocClick} />
            <MenuItem
              icon={Save}
              label="保存"
              shortcut={menuShortcutLabel('save')}
              onClick={() => runAndClose(() => void saveNowWithToast())}
            />
            <MenuItem
              icon={Pencil}
              label="重命名"
              onClick={() => {
                onRequestRename();
                onClose();
              }}
            />
            <MenuItem
              icon={Upload}
              label="导入文件"
              onClick={() =>
                runAndClose(() => {
                  fileRef.current?.click();
                })
              }
            />
            <MenuItem
              icon={Download}
              label="导出 EFM"
              onClick={() => runAndClose(() => exportEfmJson())}
            />
            <MenuItem
              icon={Image}
              label="导出图片"
              onClick={() => runAndClose(() => exportPng())}
            />
          </FlyoutTrigger>

          <FlyoutTrigger
            icon={SquarePen}
            label="编辑"
            active={flyout === 'edit'}
            wide
            onEnter={() => setFlyout('edit')}
          >
            <MenuItem
              icon={Undo2}
              label="撤销"
              shortcut={menuShortcutLabel('undo')}
              disabled={!canUndo}
              onClick={() => runAndClose(() => useMindMapStore.getState().undo())}
            />
            <MenuItem
              icon={Redo2}
              label="重做"
              shortcut={menuShortcutLabel('redo')}
              disabled={!canRedo}
              onClick={() => runAndClose(() => useMindMapStore.getState().redo())}
            />
            <MenuItem
              icon={Copy}
              label="复制"
              shortcut={menuShortcutLabel('copy')}
              disabled={copyDisabled}
              onClick={() => runAndClose(() => useMindMapStore.getState().copySelected())}
            />
            <MenuItem
              icon={Scissors}
              label="剪切"
              shortcut={menuShortcutLabel('cut')}
              disabled={cutOrDeleteDisabled}
              onClick={() => runAndClose(() => useMindMapStore.getState().cutSelected())}
            />
            <MenuItem
              icon={ClipboardPaste}
              label="粘贴"
              shortcut={menuShortcutLabel('paste')}
              disabled={pasteDisabled}
              onClick={() => runAndClose(() => useMindMapStore.getState().paste())}
            />
            <MenuItem
              icon={Trash2}
              label="删除"
              shortcut={menuShortcutLabel('remove')}
              disabled={cutOrDeleteDisabled}
              onClick={() => runAndClose(() => useMindMapStore.getState().removeSelected())}
            />
          </FlyoutTrigger>

          <FlyoutTrigger
            icon={Eye}
            label="查看"
            active={flyout === 'view'}
            wide
            onEnter={() => setFlyout('view')}
          >
            <MenuItem
              icon={Maximize2}
              label="适应屏幕"
              shortcut={menuShortcutLabel('fitToScreen')}
              onClick={() => runAndClose(() => useMindMapStore.getState().fitToScreen())}
            />
            <MenuItem
              icon={ZoomIn}
              label="放大"
              shortcut={menuShortcutLabel('zoomIn')}
              onClick={() => runAndClose(() => useMindMapStore.getState().zoomIn())}
            />
            <MenuItem
              icon={ZoomOut}
              label="缩小"
              shortcut={menuShortcutLabel('zoomOut')}
              onClick={() => runAndClose(() => useMindMapStore.getState().zoomOut())}
            />
            <MenuItem
              icon={ViewSwitchIcon}
              label={viewSwitchLabel}
              onClick={() =>
                runAndClose(() => {
                  const ui = useUiStore.getState();
                  ui.setCanvasMode(ui.canvasMode === 'mindmap' ? 'outline' : 'mindmap');
                })
              }
            />
          </FlyoutTrigger>

          <div className="my-1.5 border-t border-slate-100" />
          <MenuItem
            icon={Keyboard}
            label="快捷键"
            onMouseEnter={() => setFlyout(null)}
            onClick={() => {
              onClose();
              setShortcutsOpen(true);
            }}
          />
        </div>
      )}
      {/* 常驻挂载：菜单关闭后选中的文件仍能触发 onChange */}
      <input
        ref={fileRef}
        type="file"
        accept=".efm.json,.json,application/json"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onPickFile}
      />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ConfirmDialog
        open={newDocConfirmOpen}
        title="新建导图"
        message="确定新建导图？当前画布将被清空并替换为空白导图。"
        confirmLabel="确定"
        cancelLabel="取消"
        variant="danger"
        onConfirm={confirmNewDoc}
        onCancel={() => setNewDocConfirmOpen(false)}
      />
    </>
  );
}

function FlyoutTrigger({
  icon: Icon,
  label,
  active,
  wide,
  onEnter,
  children,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  wide?: boolean;
  onEnter: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative" onMouseEnter={onEnter}>
      <MenuItem
        icon={Icon}
        label={label}
        trailing={<span className="text-slate-400">›</span>}
        onClick={onEnter}
        onMouseEnter={onEnter}
      />
      {active && (
        <div
          className={`absolute left-full top-0 z-40 ml-0.5 ${wide ? 'w-56' : 'w-48'} ${panelClass}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
