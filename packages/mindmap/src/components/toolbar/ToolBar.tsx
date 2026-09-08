// src/components/toolbar/ToolBar.tsx
import { useEffect, useRef, useState } from 'react';
import {
  Braces,
  CirclePlus,
  GitCommitHorizontal,
  Maximize,
  Network,
  Redo2,
  Share2,
  MessageCircle,
  SlidersHorizontal,
  Sparkles,
  Spline,
  SquareDashed,
  Tag,
  Undo2,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { getCanvasOptions } from '../../core/style/canvasOptions';
import { getMindMapShareHandler } from '../../core/share/shareBridge';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUiStore } from '../../store/uiStore';
import type { MindMapDocument } from '../../types/mindmap';
import { BrandHeader } from './BrandHeader';
import { InsertMenu } from './InsertMenu';
import { ShareDialog } from './ShareDialog';

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
      className={`flex h-11 w-14 flex-col items-center justify-center gap-1 rounded-md transition-colors ${
        active
          ? 'bg-blue-50 text-blue-600'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      } disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent`}
    >
      <Icon size={16} />
      <span className="text-[10px] leading-none">{label}</span>
    </button>
  );
}

function Divider() {
  return <div className="mx-1.5 h-6 w-px shrink-0 bg-slate-200" />;
}

export function ToolBar() {
  // 插入下拉菜单开关
  const [insertOpen, setInsertOpen] = useState(false);
  const insertWrapRef = useRef<HTMLDivElement>(null);
  // 分享弹窗（doc 为点击"分享"时刻的文档快照，弹窗期间编辑不影响本次分享内容）
  const [shareOpen, setShareOpen] = useState(false);
  const [shareDoc, setShareDoc] = useState<MindMapDocument | null>(null);
  const closeShare = useRef(() => setShareOpen(false)).current;
  const canUndo = useMindMapStore((s) => s.canUndo());
  const canRedo = useMindMapStore((s) => s.canRedo());
  const selectedId = useMindMapStore((s) => s.selectedId);
  // 点击时再取 store，避免 render 期快照与后续 action 脱节
  const store = () => useMindMapStore.getState();
  const panel = useUiStore((st) => st.panel);
  const togglePanel = useUiStore((st) => st.togglePanel);
  const linking = useUiStore((st) => st.linking);
  // 选中节点流动动画开关（持久化在画布选项里，默认开启）
  const flowAnimation = useMindMapStore((s) => (s.doc ? getCanvasOptions(s.doc).flowAnimation === true : false));

  // 点击插入按钮以外区域时收起下拉菜单
  useEffect(() => {
    if (!insertOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!insertWrapRef.current?.contains(e.target as Node)) setInsertOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [insertOpen]);

  return (
    // 左右各占 flex-1 夹住中间组，保证主题操作始终水平居中（参考 XMind 布局）
    <div className="flex h-12 items-center border-b border-slate-200 bg-white px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <BrandHeader />
      </div>

      {/* 中间：主题与结构操作 */}
      <div className="flex items-center">
        <ToolButton
          icon={Network}
          label="子主题"
          title="子主题 (Tab)"
          onClick={() => store().addTopic('child')}
        />
        <ToolButton
          icon={GitCommitHorizontal}
          label="同级主题"
          title="同级主题 (Enter)"
          onClick={() => store().addTopic('sibling')}
        />
        <Divider />
        {/* 点击后进入连线模式并关闭面板，画布上两次点击完成连线；再次点击取消 */}
        <ToolButton
          icon={Spline}
          label="联系"
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
        <ToolButton
          icon={Braces}
          label="概要"
          title="概要（选中同级节点后创建；可 Shift+拖拽框选或 Shift+点击多选）"
          disabled={!selectedId}
          onClick={() => store().addSummarySelected()}
        />
        <ToolButton
          icon={SquareDashed}
          label="外框"
          title="外框（选中同级节点后创建；可 Shift+拖拽框选或 Shift+点击多选）"
          disabled={!selectedId}
          onClick={() => store().addBoundarySelected()}
        />
        <div className="relative" ref={insertWrapRef}>
          <ToolButton
            icon={CirclePlus}
            label="插入"
            active={insertOpen}
            onClick={() => setInsertOpen((v) => !v)}
          />
          <InsertMenu open={insertOpen} onClose={() => setInsertOpen(false)} />
        </div>
      </div>

      {/* 右侧：撤销/视图/格式面板（导入导出已收拢到汉堡菜单） */}
      <div className="flex flex-1 items-center justify-end">
        <ToolButton icon={Undo2} label="撤销" disabled={!canUndo} onClick={() => store().undo()} />
        <ToolButton icon={Redo2} label="重做" disabled={!canRedo} onClick={() => store().redo()} />
        <ToolButton
          icon={Waves}
          label="流动"
          title="选中节点流动动画"
          active={flowAnimation}
          onClick={() => store().setCanvasOption({ flowAnimation: !flowAnimation })}
        />
        <ToolButton icon={Maximize} label="适应屏幕" title="适应屏幕 (⌘0)" onClick={() => store().fitToScreen()} />
        <Divider />
        <ToolButton
          icon={Sparkles}
          label="AI"
          title="AI 助手（生成导图 / 展开分支）"
          active={panel === 'ai'}
          onClick={() => togglePanel('ai')}
        />
        <ToolButton
          icon={Tag}
          label="标记"
          active={panel === 'markers'}
          onClick={() => togglePanel('markers')}
        />
        <ToolButton
          icon={SlidersHorizontal}
          label="格式"
          active={panel === 'properties'}
          onClick={() => togglePanel('properties')}
        />
        {/* 分享入口仅在宿主注入分享实现后出现（纯组件独立运行时不显示） */}
        {getMindMapShareHandler() !== null && (
          <>
          <ToolButton
            icon={Share2}
            label="分享"
            title="生成分享链接"
            onClick={() => {
              const doc = useMindMapStore.getState().doc;
              if (!doc) return;
              setShareDoc(doc);
              setShareOpen(true);
            }}
          />
          <ToolButton
            icon={MessageCircle}
            label="反馈"
            title="问题反馈"
            onClick={() => window.open('/contact', '_blank')}
          />
          </>
        )}
      </div>

      <ShareDialog open={shareOpen} doc={shareDoc} onClose={closeShare} />
    </div>
  );
}
