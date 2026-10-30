// src/components/Editor.tsx
import { useEffect } from 'react';
import type { NavDir } from '../core/editor/navigation';
import { draftKey } from '../core/persistence/autosave';
import { saveNow, saveNowWithToast } from '../core/persistence/saveNow';
import { useDocumentsStore } from '../store/documentsStore';
import { useMindMapStore } from '../store/mindMapStore';
import { startPresentationMode } from '../store/presentation';
import { useUiStore } from '../store/uiStore';
import { Canvas } from './canvas/Canvas';
import { BoundaryEditorOverlay } from './canvas/BoundaryEditorOverlay';
import { NodeInsertOverlay } from './canvas/NodeInsertOverlay';
import { SearchBar } from './canvas/SearchBar';
import { OutlineView } from './outline/OutlineView';
import { AIChatPanel } from './ai/AIChatPanel';
import { MarkerPanel } from './panels/marker/MarkerPanel';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { PresentationControls } from './presentation/PresentationControls';
import { StartScreen } from './start/StartScreen';
import { SheetTabs } from './sheets/SheetTabs';
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
  const presenting = useUiStore((s) => s.presentation !== null);
  const view = useUiStore((s) => s.view);
  const docId = useMindMapStore((s) => s.doc?.id ?? null);

  // 打开/切换文档后载入所属工作簿的画布标签
  useEffect(() => {
    const doc = useMindMapStore.getState().doc;
    if (doc) void useDocumentsStore.getState().loadSheets(doc);
  }, [docId]);

  // 演示模式：尝试进入全屏；用户用系统方式退出全屏时同步结束演示
  useEffect(() => {
    if (!presenting) return;
    void document.documentElement.requestFullscreen?.().catch(() => {
      // 不支持全屏或权限被拒绝时仍在页面内演示
    });
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) useUiStore.getState().stopPresentation();
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (document.fullscreenElement) {
        void document.exitFullscreen?.().catch(() => {});
      }
    };
  }, [presenting]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 文件列表页不响应编辑器快捷键
      if (useUiStore.getState().view === 'start') return;
      const mod = isModKey(e);
      // F5：进入 / 退出演示（抑制浏览器刷新）
      if (e.key === 'F5') {
        e.preventDefault();
        if (useUiStore.getState().presentation) useUiStore.getState().stopPresentation();
        else startPresentationMode();
        return;
      }
      // 演示模式下拦截翻页与退出，禁用其余编辑快捷键
      if (useUiStore.getState().presentation) {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          useUiStore.getState().stopPresentation();
          return;
        }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
          e.preventDefault();
          useUiStore.getState().stepPresentation(1);
          return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
          e.preventDefault();
          useUiStore.getState().stepPresentation(-1);
        }
        return;
      }
      // ⌘S/Ctrl+S：拦截浏览器「另存为」，触发云端保存并提示「已保存」（编辑框内也可用）
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
      // ⌘F/Ctrl+F：打开查找/替换（与浏览器查找一致，任何聚焦状态下都拦截）
      if (mod && e.key.toLowerCase() === 'f') {
        blockBrowserPageZoom(e);
        useUiStore.getState().openSearch();
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
      // 空格：按住进入画布平移模式（光标抓手，任意位置可拖拽）；编辑框内已在上方 return
      if (e.key === ' ') {
        e.preventDefault();
        if (!e.repeat) useUiStore.getState().setSpacePanning(true);
        return;
      }
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
        // 查找浮层优先关闭（浮层内 Esc 已在组件里处理，这里兜底焦点不在输入框时）
        if (useUiStore.getState().searchOpen) {
          useUiStore.getState().closeSearch();
          return;
        }
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
          e.preventDefault();
          // 选中概要时 F2 进入概要编辑；否则编辑选中节点
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
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true });
      // 卸载时退出空格平移模式，避免状态残留
      useUiStore.getState().setSpacePanning(false);
    };
  }, []);

  // 空格松开 / 窗口失焦：退出平移模式（按住空格切窗时 keyup 会丢失）
  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') useUiStore.getState().setSpacePanning(false);
    };
    const onBlur = () => useUiStore.getState().setSpacePanning(false);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // 宿主桥接：外部可查询脏状态、触发云端保存、丢弃本地草稿（编辑器卸载时移除）。
  // __eflinkEditorBridge 是旧宿主的过渡期别名（同一对象），确认宿主全部改用新名后移除。
  useEffect(() => {
    const bridgeRoot = window as unknown as Record<string, unknown>;
    bridgeRoot.__doculumaEditorBridge = {
      isDirty: () => useMindMapStore.getState().dirty,
      save: () => saveNow(),
      discard: () => {
        try {
          const docId = useMindMapStore.getState().doc?.id;
          if (docId) localStorage.removeItem(draftKey(docId));
        } catch {
          /* 存储不可用时忽略 */
        }
      },
    };
    bridgeRoot.__eflinkEditorBridge = bridgeRoot.__doculumaEditorBridge;
    return () => {
      delete bridgeRoot.__doculumaEditorBridge;
      delete bridgeRoot.__eflinkEditorBridge;
    };
  }, []);

  if (view === 'start') {
    return (
      <div className="h-full overflow-auto bg-slate-50">
        <StartScreen />
      </div>
    );
  }

  if (presenting) {
    return (
      <div className="flex h-full flex-col bg-white">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <Canvas />
          <PresentationControls />
        </div>
      </div>
    );
  }

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
          <SearchBar />
        </div>
        {panel === 'properties' && <PropertiesPanel />}
        {panel === 'markers' && <MarkerPanel />}
        {/* AI 助手面板（右侧独立列，参考 eflink-draw / eflink-pptx） */}
        {panel === 'ai' && <AIChatPanel />}
      </div>
      <SheetTabs />
      <StatusBar />
    </div>
  );
}
