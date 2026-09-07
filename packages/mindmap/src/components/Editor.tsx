// src/components/Editor.tsx
import { useEffect } from 'react';
import type { NavDir } from '../core/editor/navigation';
import { saveNowWithToast } from '../core/persistence/saveNow';
import { useMindMapStore } from '../store/mindMapStore';
import { useUiStore } from '../store/uiStore';
import { Canvas } from './canvas/Canvas';
import { BoundaryEditorOverlay } from './canvas/BoundaryEditorOverlay';
import { NodeInsertOverlay } from './canvas/NodeInsertOverlay';
import { OutlineView } from './outline/OutlineView';
import { AIChatPanel } from './ai/AIChatPanel';
import { MarkerPanel } from './panels/marker/MarkerPanel';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { TextEditorOverlay } from './canvas/TextEditorOverlay';
import { SummaryEditorOverlay } from './canvas/SummaryEditorOverlay';
import { StatusBar } from './statusbar/StatusBar';
import { ToastHost } from './ToastHost';
import { ToolBar } from './toolbar/ToolBar';

// 方向键 → 导航方向
const NAV_DIRS: Record<string, NavDir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

function isModKey(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey;
}

/** Ctrl/Cmd 放大：+ / = / 小键盘 +（按住 Ctrl 时 e.key 常为 '='） */
function isCanvasZoomInKey(e: KeyboardEvent): boolean {
  return (
    e.code === 'Equal' ||
    e.code === 'NumpadAdd' ||
    e.key === '+' ||
    e.key === '='
  );
}

/** Ctrl/Cmd 缩小：- / 小键盘 - */
function isCanvasZoomOutKey(e: KeyboardEvent): boolean {
  return e.code === 'Minus' || e.code === 'NumpadSubtract' || e.key === '-';
}

function isCanvasZoomResetKey(e: KeyboardEvent): boolean {
  return e.code === 'Digit0' || e.code === 'Numpad0' || e.key === '0';
}

/** 浏览器页面缩放快捷键（需在 capture 阶段 preventDefault） */
function isBrowserPageZoomKey(e: KeyboardEvent): boolean {
  if (!isModKey(e)) return false;
  return isCanvasZoomInKey(e) || isCanvasZoomOutKey(e) || isCanvasZoomResetKey(e);
}

function blockBrowserPageZoom(e: KeyboardEvent): void {
  e.preventDefault();
  e.stopPropagation();
}

export function Editor() {
  const panel = useUiStore((s) => s.panel);
  const canvasMode = useUiStore((s) => s.canvasMode);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = isModKey(e);
      // Ctrl/Cmd+S：拦截浏览器「另存为」，立即写入 IndexedDB 并提示（编辑框内也可用）
      if (mod && e.key.toLowerCase() === 's') {
        blockBrowserPageZoom(e);
        void saveNowWithToast();
        return;
      }
      // 画布缩放：capture 阶段拦截，避免触发浏览器页面缩放
      if (isBrowserPageZoomKey(e)) {
        blockBrowserPageZoom(e);
        const s = useMindMapStore.getState();
        if (isCanvasZoomResetKey(e)) {
          s.fitToScreen();
        } else if (isCanvasZoomInKey(e)) {
          s.zoomIn();
        } else if (isCanvasZoomOutKey(e)) {
          s.zoomOut();
        }
        return;
      }
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;
      if (target.isContentEditable) return;
      const s = useMindMapStore.getState();
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        s.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        s.copySelected();
        return;
      }
      if (mod && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        s.cutSelected();
        return;
      }
      if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        s.paste();
        return;
      }
      // Cmd/Ctrl+[ 折叠、Cmd/Ctrl+] 展开、Cmd/Ctrl+/ 切换折叠（对齐 XMind）
      if (mod && e.key === '[') {
        e.preventDefault();
        s.updateMetadataSelected({ collapsed: true });
        return;
      }
      if (mod && e.key === ']') {
        e.preventDefault();
        s.updateMetadataSelected({ collapsed: false });
        return;
      }
      if (mod && e.key === '/') {
        e.preventDefault();
        const collapsed = Boolean(s.doc?.nodes[s.selectedId ?? '']?.metadata?.collapsed);
        s.updateMetadataSelected({ collapsed: !collapsed });
        return;
      }
      if (mod) return;
      // 方向键节点导航（↑↓ 同级、←→ 父子，随布局/分支侧向自适应）
      const navDir = NAV_DIRS[e.key];
      if (navDir) {
        e.preventDefault();
        s.navigate(navDir);
        return;
      }
      // Shift+Enter 在当前节点前插入同级；Escape 优先退出连线模式，否则取消选中（编辑态由编辑器自己处理）
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        s.addTopic('siblingBefore');
        return;
      }
      if (e.key === 'Escape') {
        if (useUiStore.getState().linking) {
          useUiStore.getState().endLinking();
          return;
        }
        // 选中概要时 Esc 只取消概要选中
        if (useMindMapStore.getState().selectedSummaryId) {
          useMindMapStore.getState().selectSummary(null);
          return;
        }
        s.select(null);
        return;
      }
      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          s.addTopic('child');
          break;
        case 'Enter':
          e.preventDefault();
          s.addTopic('sibling');
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          // 选中联系线/概要时 Delete 删除对应结构（节点选中不受影响）
          {
            const st = useMindMapStore.getState();
            if (st.selectedRelationId) {
              s.removeRelationById(st.selectedRelationId);
              break;
            }
            if (st.selectedSummaryId) {
              s.removeSummaryById(st.selectedSummaryId);
              break;
            }
            // 选中外框时 Delete 删除外框（对齐 XMind）
            if (st.selectedBoundaryId) {
              s.removeBoundaryById(st.selectedBoundaryId);
              break;
            }
          }
          s.removeSelected();
          break;
        case 'F2':
        case ' ':
          e.preventDefault();
          // 选中概要时 F2/空格 进入概要编辑；否则编辑选中节点
          {
            const summaryId = useMindMapStore.getState().selectedSummaryId;
            if (summaryId) {
              s.setEditingSummary(summaryId);
              break;
            }
          }
          if (s.selectedId) s.setEditing(s.selectedId);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, []);

  return (
    <div className="flex h-full flex-col">
      <ToolBar />
      <ToastHost />
      {/* min-w-0：允许画布列在侧栏打开时收缩，避免面板被挤出视口 */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative min-w-0 flex-1 overflow-hidden">
          {canvasMode === 'outline' ? (
            <OutlineView />
          ) : (
            <>
              <Canvas />
              <TextEditorOverlay />
              <SummaryEditorOverlay />
              <BoundaryEditorOverlay />
              <NodeInsertOverlay />
            </>
          )}
        </div>
        {panel === 'properties' && <PropertiesPanel />}
        {panel === 'markers' && <MarkerPanel />}
        {/* AI 助手面板（右侧独立列，参考 eflink-draw / eflink-pptx） */}
        {panel === 'ai' && <AIChatPanel />}
      </div>
      <StatusBar />
    </div>
  );
}
