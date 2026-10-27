// src/components/toolbar/ToolBar.tsx
// 统一外壳：第一行 office-kit 顶栏（品牌 + 横向菜单 + 右侧动作），第二行思维导图工具条。
// 导入用的隐藏 file input 常驻挂载（不随菜单卸载），否则选完文件收不到 onChange。
import { useRef, useState, type ChangeEvent } from 'react';
import {
  Braces,
  ClipboardPaste,
  CirclePlus,
  Copy,
  Download,
  FilePlus2,
  GitCommitHorizontal,
  Image,
  ImagePlus,
  Keyboard,
  Link2,
  ListTree,
  Maximize,
  MessageCircle,
  Network,
  NotebookPen,
  Redo2,
  Save,
  Scissors,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Spline,
  SquareDashed,
  Sticker,
  Tag,
  Trash2,
  Undo2,
  Upload,
  Waves,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from 'lucide-react';
import { OfficeHeader, useI18n, type OfficeMenu } from '@eflink-tech/office-kit';
import { getActiveEditorBrand } from '../../brand';
import { getEditorBackHref } from '../../core/chrome';
import { menuShortcutLabel } from '../../core/shortcuts/catalog';
import { saveNow, saveNowWithToast } from '../../core/persistence/saveNow';
import { LAST_DOC_KEY } from '../../core/persistence/keys';
import { getCanvasOptions } from '../../core/style/canvasOptions';
import { getMindMapShareHandler } from '../../core/share/shareBridge';
import { useDocumentsStore } from '../../store/documentsStore';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';
import type { MindMapDocument } from '../../types/mindmap';
import { ConfirmDialog } from '../ConfirmDialog';
import { exportEfmJson, exportPng, importEfmJsonFile } from './exportActions';
import { ShortcutsDialog } from './ShortcutsDialog';
import { ShareDialog } from './ShareDialog';

// 图片以 base64 内嵌进文档并持久化到 IndexedDB，限制大小避免文档膨胀
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

interface ToolButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  /** 面板类按钮的开启态 / 连线模式的进行态 */
  active?: boolean;
  disabled?: boolean;
  /** 补充提示（快捷键等），缺省用 label 作为 tooltip */
  title?: string;
}

/** 图标在上、文字在下的工具栏按钮，统一 hover/active/disabled 反馈 */
function ToolButton({ icon: Icon, label, onClick, active = false, disabled = false, title }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-pressed={active || undefined}
      className={`flex h-11 min-w-14 flex-col items-center justify-center gap-1 rounded-md px-2 transition-colors ${
        active
          ? 'bg-blue-50 text-blue-600'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      } disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent`}
    >
      <Icon size={16} />
      <span className="text-center text-[10px] leading-tight">{label}</span>
    </button>
  );
}

function Divider() {
  return <div className="mx-1.5 h-6 w-px shrink-0 bg-slate-200" />;
}

export function ToolBar() {
  const { t } = useI18n();
  const efmRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  // 分享弹窗（doc 为点击"分享"时刻的文档快照，弹窗期间编辑不影响本次分享内容）
  const [shareOpen, setShareOpen] = useState(false);
  const [shareDoc, setShareDoc] = useState<MindMapDocument | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [newDocConfirmOpen, setNewDocConfirmOpen] = useState(false);
  const canUndo = useMindMapStore((s) => s.canUndo());
  const canRedo = useMindMapStore((s) => s.canRedo());
  const selectedId = useMindMapStore((s) => s.selectedId);
  const hasClipboard = useMindMapStore((s) => s.clipboard != null);
  const canvasMode = useUiStore((s) => s.canvasMode);
  // 点击时再取 store，避免 render 期快照与后续 action 脱节
  const store = () => useMindMapStore.getState();
  const panel = useUiStore((st) => st.panel);
  const togglePanel = useUiStore((st) => st.togglePanel);
  const linking = useUiStore((st) => st.linking);
  const openInsertEditor = useUiStore((s) => s.openInsertEditor);
  const setMarkersTab = useUiStore((s) => s.setMarkersTab);
  // 选中节点流动动画开关（持久化在画布选项里，默认开启）
  const flowAnimation = useMindMapStore((s) => (s.doc ? getCanvasOptions(s.doc).flowAnimation === true : false));

  const noSelection = !selectedId;
  const isRoot = !!selectedId && selectedId === store().doc?.rootId;
  const cutOrDeleteDisabled = noSelection || isRoot;

  const confirmNewDoc = () => {
    setNewDocConfirmOpen(false);
    void (async () => {
      try {
        const doc = await useDocumentsStore.getState().createDoc();
        useMindMapStore.getState().open(doc);
        localStorage.setItem(LAST_DOC_KEY, doc.id);
      } catch (err) {
        console.error('新建文档失败', err);
      }
    })();
  };

  const onPickEfm = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) importEfmJsonFile(file);
  };

  const onPickImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const targetId = useMindMapStore.getState().selectedId;
    if (!file || !targetId) return;
    if (file.size > MAX_IMAGE_BYTES) {
      window.alert(t('mind.err.imageTooLarge'));
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
      window.alert(t('mind.err.imageReadFailed'));
    };
    reader.readAsDataURL(file);
  };

  // 打开右侧标记面板并切换到指定 Tab
  const openMarkersPanel = (tab: 'markers' | 'stickers') => {
    setMarkersTab(tab);
    if (panel !== 'markers') togglePanel('markers');
  };

  const menus: OfficeMenu[] = [
    {
      key: 'file',
      label: t('shell.menu.file'),
      items: [
        [{ key: 'new', label: t('mind.file.newMap'), icon: <FilePlus2 size={16} />, onSelect: () => setNewDocConfirmOpen(true) }],
        [
          {
            key: 'save',
            label: t('action.save'),
            icon: <Save size={16} />,
            shortcut: menuShortcutLabel('save'),
            onSelect: () => void saveNowWithToast(),
          },
          { key: 'import', label: t('action.import'), icon: <Upload size={16} />, onSelect: () => efmRef.current?.click() },
          { key: 'exportEfm', label: t('mind.file.exportEfm'), icon: <Download size={16} />, onSelect: exportEfmJson },
          { key: 'exportPng', label: t('action.exportImage'), icon: <Image size={16} />, onSelect: exportPng },
        ],
      ],
    },
    {
      key: 'edit',
      label: t('shell.menu.edit'),
      items: [
        [
          { key: 'undo', label: t('action.undo'), icon: <Undo2 size={16} />, shortcut: menuShortcutLabel('undo'), disabled: !canUndo, onSelect: () => store().undo() },
          { key: 'redo', label: t('action.redo'), icon: <Redo2 size={16} />, shortcut: menuShortcutLabel('redo'), disabled: !canRedo, onSelect: () => store().redo() },
        ],
        [
          { key: 'cut', label: t('action.cut'), icon: <Scissors size={16} />, shortcut: menuShortcutLabel('cut'), disabled: cutOrDeleteDisabled, onSelect: () => store().cutSelected() },
          { key: 'copy', label: t('action.copy'), icon: <Copy size={16} />, shortcut: menuShortcutLabel('copy'), disabled: noSelection, onSelect: () => store().copySelected() },
          { key: 'paste', label: t('action.paste'), icon: <ClipboardPaste size={16} />, shortcut: menuShortcutLabel('paste'), disabled: !hasClipboard, onSelect: () => store().paste() },
          { key: 'delete', label: t('action.delete'), icon: <Trash2 size={16} />, shortcut: menuShortcutLabel('remove'), disabled: cutOrDeleteDisabled, onSelect: () => store().removeSelected() },
        ],
      ],
    },
    {
      key: 'view',
      label: t('shell.menu.view'),
      items: [
        [
          { key: 'fit', label: t('mind.view.fitToScreen'), icon: <Maximize size={16} />, shortcut: menuShortcutLabel('fitToScreen'), onSelect: () => store().fitToScreen() },
          { key: 'zoomIn', label: t('action.zoomIn'), icon: <ZoomIn size={16} />, shortcut: menuShortcutLabel('zoomIn'), onSelect: () => store().zoomIn() },
          { key: 'zoomOut', label: t('action.zoomOut'), icon: <ZoomOut size={16} />, shortcut: menuShortcutLabel('zoomOut'), onSelect: () => store().zoomOut() },
        ],
        [
          canvasMode === 'mindmap'
            ? { key: 'viewSwitch', label: t('mind.view.outline'), icon: <ListTree size={16} />, onSelect: () => useUiStore.getState().setCanvasMode('outline') }
            : { key: 'viewSwitch', label: t('mind.view.mindmap'), icon: <Network size={16} />, onSelect: () => useUiStore.getState().setCanvasMode('mindmap') },
        ],
        [
          { key: 'markers', label: t('mind.panel.markers'), checked: panel === 'markers', onSelect: () => togglePanel('markers') },
          { key: 'format', label: t('mind.panel.format'), checked: panel === 'properties', onSelect: () => togglePanel('properties') },
          { key: 'ai', label: t('mind.tool.ai'), checked: panel === 'ai', onSelect: () => togglePanel('ai') },
        ],
      ],
    },
    {
      key: 'insert',
      label: t('shell.menu.insert'),
      items: [
        [
          { key: 'note', label: t('mind.insert.note'), icon: <NotebookPen size={16} />, disabled: noSelection, onSelect: () => openInsertEditor('note') },
          { key: 'label', label: t('mind.insert.label'), icon: <Tag size={16} />, disabled: noSelection, onSelect: () => openInsertEditor('labels') },
          { key: 'link', label: t('mind.insert.link'), icon: <Link2 size={16} />, disabled: noSelection, onSelect: () => openInsertEditor('link') },
        ],
        [
          { key: 'marker', label: t('mind.insert.marker'), icon: <Sparkles size={16} />, onSelect: () => openMarkersPanel('markers') },
          { key: 'image', label: t('mind.insert.image'), icon: <ImagePlus size={16} />, disabled: noSelection, onSelect: () => imageRef.current?.click() },
          { key: 'sticker', label: t('mind.insert.sticker'), icon: <Sticker size={16} />, onSelect: () => openMarkersPanel('stickers') },
        ],
      ],
    },
    {
      key: 'help',
      label: t('shell.menu.help'),
      items: [
        [{ key: 'shortcuts', label: t('action.shortcuts'), icon: <Keyboard size={16} />, onSelect: () => setShortcutsOpen(true) }],
      ],
    },
  ];

  const actions = (
    <>
      {getMindMapShareHandler() !== null && (
        <>
          <button
            type="button"
            onClick={() => {
              const doc = useMindMapStore.getState().doc;
              if (!doc) return;
              // 分享前强制保存一次云端（保存失败不阻塞分享，快照以当前文档为准）
              void saveNow().then(() => {
                setShareDoc(useMindMapStore.getState().doc);
                setShareOpen(true);
              });
            }}
            title={t('mind.tool.shareTip')}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-[#666] transition-colors hover:bg-[#ececec] hover:text-[#333]"
          >
            <Share2 size={13} />
            {t('shell.share')}
          </button>
          <button
            type="button"
            onClick={() => window.open('/contact', '_blank')}
            title={t('shell.feedback')}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-[#666] transition-colors hover:bg-[#ececec] hover:text-[#333]"
          >
            <MessageCircle size={13} />
            {t('shell.feedback')}
          </button>
        </>
      )}
    </>
  );

  return (
    <>
      <OfficeHeader
        brand={getActiveEditorBrand()}
        backHref={getEditorBackHref()}
        menus={menus}
        actions={actions}
      />

      {/* 工具条：主题结构与面板开关（导入导出与插入项已收拢到顶部菜单） */}
      <div className="flex h-11 shrink-0 items-center border-b border-slate-200 bg-white px-3">
        <ToolButton icon={CirclePlus} label={t('mind.tool.child')} title={`${t('mind.tool.child')} (Tab)`} onClick={() => store().addTopic('child')} />
        <ToolButton icon={GitCommitHorizontal} label={t('mind.tool.sibling')} title={`${t('mind.tool.sibling')} (Enter)`} onClick={() => store().addTopic('sibling')} />
        <Divider />
        {/* 点击后进入连线模式并关闭面板，画布上两次点击完成连线；再次点击取消 */}
        <ToolButton
          icon={Spline}
          label={t('mind.tool.relation')}
          active={linking}
          onClick={() => {
            const ui = useUiStore.getState();
            if (ui.linking) {
              ui.endLinking();
              return;
            }
            ui.startLinking();
            ui.closePanel();
          }}
        />
        <ToolButton icon={Braces} label={t('mind.tool.summary')} title={t('mind.tool.summaryTip')} disabled={!selectedId} onClick={() => store().addSummarySelected()} />
        <ToolButton icon={SquareDashed} label={t('mind.tool.boundary')} title={t('mind.tool.boundaryTip')} disabled={!selectedId} onClick={() => store().addBoundarySelected()} />
        <Divider />
        <ToolButton icon={Undo2} label={t('action.undo')} disabled={!canUndo} onClick={() => store().undo()} />
        <ToolButton icon={Redo2} label={t('action.redo')} disabled={!canRedo} onClick={() => store().redo()} />
        <ToolButton icon={Waves} label={t('mind.tool.flow')} title={t('mind.tool.flowTip')} active={flowAnimation} onClick={() => store().setCanvasOption({ flowAnimation: !flowAnimation })} />
        <ToolButton icon={Maximize} label={t('mind.view.fitToScreen')} title={t('mind.tool.fitTip', { shortcut: menuShortcutLabel('fitToScreen') ?? '' })} onClick={() => store().fitToScreen()} />
        <div className="ml-auto flex items-center">
          <ToolButton icon={Sparkles} label={t('mind.tool.ai')} title={t('mind.tool.aiTip')} active={panel === 'ai'} onClick={() => togglePanel('ai')} />
          <ToolButton icon={Tag} label={t('mind.panel.markers')} active={panel === 'markers'} onClick={() => togglePanel('markers')} />
          <ToolButton icon={SlidersHorizontal} label={t('mind.panel.format')} active={panel === 'properties'} onClick={() => togglePanel('properties')} />
        </div>
      </div>

      {/* 常驻挂载：菜单关闭后选中的文件仍能触发 onChange */}
      <input ref={efmRef} type="file" accept=".efm.json,.json,application/json" className="sr-only" aria-hidden="true" tabIndex={-1} onChange={onPickEfm} />
      <input ref={imageRef} type="file" accept="image/*" className="sr-only" aria-hidden="true" tabIndex={-1} onChange={onPickImage} />

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ShareDialog open={shareOpen} doc={shareDoc} onClose={() => setShareOpen(false)} />
      <ConfirmDialog
        open={newDocConfirmOpen}
        title={t('mind.file.newMap')}
        message={t('mind.file.newConfirm')}
        confirmLabel={t('action.confirm')}
        cancelLabel={t('action.cancel')}
        variant="danger"
        onConfirm={confirmNewDoc}
        onCancel={() => setNewDocConfirmOpen(false)}
      />
    </>
  );
}
