// UI 状态：视图切换与侧边面板开关
import { create } from 'zustand';
// 延迟调用（仅函数体内使用）：切换画布模式时联动退出节点编辑态
import { useMindMapStore } from './mindMapStore';

export type PanelKind = 'properties' | 'markers' | 'ai';
export type PropertiesTab = 'style' | 'canvas';
/** 标记面板 Tab（贴纸菜单项跳转用） */
export type MarkersTab = 'markers' | 'stickers';
/** 插入菜单的节点旁编辑器类型；image 为查看/删除图片的浮层 */
export type InsertEditorKind = 'note' | 'labels' | 'link' | 'image';
/** 画布主区视图模式：思维导图画布 / 大纲列表 */
export type CanvasMode = 'mindmap' | 'outline';

/** 演示模式：ids 为逐页聚焦的节点序列，index 为当前页 */
export interface PresentationState {
  ids: string[];
  index: number;
}

interface UiStore {
  view: 'start' | 'editor';
  panel: PanelKind | null;
  propertiesTab: PropertiesTab;
  markersTab: MarkersTab;
  /** 插入菜单触发的节点旁编辑器（笔记/标签/链接/图片查看）；null 时不显示 */
  insertEditor: InsertEditorKind | null;
  /** 标签编辑模式：指向 labels 的下标（点击胶囊进入）；null 为追加新标签 */
  labelEditIndex: number | null;
  canvasMode: CanvasMode;
  // 联系线创建模式：是否处于连线中、已选定的起点节点 id
  linking: boolean;
  linkFrom: string | null;
  /** 顶部轻提示；null 表示不显示。error 由调用方显式给出，文案已多语，不能再靠中文关键词猜 */
  toast: { text: string; error: boolean } | null;
  /** 空格按住状态：进入画布平移模式（光标抓手，任意位置可拖拽移动画布） */
  spacePanning: boolean;
  /** 查找/替换浮层是否打开 */
  searchOpen: boolean;
  /** 查找词（实时过滤）；替换框单独维护在组件内 */
  searchQuery: string;
  /** 标记过滤：只显示带该标记的节点（markerId）；null 不过滤 */
  markerFilter: string | null;
  /** 演示模式（隐藏工具栏等外壳，逐页聚焦节点）；null 为未演示 */
  presentation: PresentationState | null;
  startPresentation: (ids: string[]) => void;
  stepPresentation: (delta: 1 | -1) => void;
  stopPresentation: () => void;
  setSpacePanning: (v: boolean) => void;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (q: string) => void;
  setMarkerFilter: (id: string | null) => void;
  setView: (v: 'start' | 'editor') => void;
  togglePanel: (p: PanelKind) => void;
  closePanel: () => void;
  setPropertiesTab: (tab: PropertiesTab) => void;
  setMarkersTab: (tab: MarkersTab) => void;
  openInsertEditor: (kind: InsertEditorKind, labelEditIndex?: number | null) => void;
  closeInsertEditor: () => void;
  setCanvasMode: (m: CanvasMode) => void;
  startLinking: () => void;
  pickLinkFrom: (id: string) => void;
  endLinking: () => void;
  showToast: (message: string, opts?: { durationMs?: number; error?: boolean }) => void;
  clearToast: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useUiStore = create<UiStore>((set, get) => ({
  view: 'start',
  panel: null,
  propertiesTab: 'style',
  markersTab: 'markers',
  insertEditor: null,
  labelEditIndex: null,
  canvasMode: 'mindmap',
  linking: false,
  linkFrom: null,
  toast: null,
  spacePanning: false,
  searchOpen: false,
  searchQuery: '',
  markerFilter: null,
  presentation: null,
  setSpacePanning: (v) => set({ spacePanning: v }),
  openSearch: () => set({ searchOpen: true }),
  // 关闭时清空过滤条件，避免隐藏的命中高亮/标记过滤残留
  closeSearch: () => set({ searchOpen: false, searchQuery: '', markerFilter: null }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setMarkerFilter: (id) => set({ markerFilter: id }),
  // 演示模式进入时收拢查找/浮层，避免演示画面被遮挡
  startPresentation: (ids) =>
    ids.length > 0 &&
    set({
      presentation: { ids, index: 0 },
      searchOpen: false,
      searchQuery: '',
      markerFilter: null,
      insertEditor: null,
      panel: null,
      canvasMode: 'mindmap',
    }),
  stepPresentation: (delta) => {
    const state = get().presentation;
    if (!state) return;
    const index = Math.min(state.ids.length - 1, Math.max(0, state.index + delta));
    if (index !== state.index) set({ presentation: { ...state, index } });
  },
  stopPresentation: () => set({ presentation: null }),
  // 切回开始页时复位连线/查找/演示状态，避免残留到下一场景
  setView: (view) =>
    set(
      view === 'start'
        ? {
            view,
            linking: false,
            linkFrom: null,
            searchOpen: false,
            searchQuery: '',
            markerFilter: null,
            presentation: null,
          }
        : { view },
    ),
  togglePanel: (p) => set({ panel: get().panel === p ? null : p }),
  closePanel: () => set({ panel: null }),
  setPropertiesTab: (tab) => set({ propertiesTab: tab }),
  setMarkersTab: (tab) => set({ markersTab: tab }),
  // 打开插入编辑器时收起侧边面板，避免遮挡；labelEditIndex 指定被编辑的标签下标
  openInsertEditor: (kind, labelEditIndex = null) =>
    set({ insertEditor: kind, labelEditIndex, panel: null }),
  closeInsertEditor: () => set({ insertEditor: null, labelEditIndex: null }),
  // 切换画布模式时退出节点编辑态（浮层编辑器只存在于画布模式）
  setCanvasMode: (mode) => {
    useMindMapStore.getState().setEditing(null);
    set({ canvasMode: mode });
  },
  // 进入连线模式：以当前选中节点为起点（对齐 XMind）；无选中时起点为空，由画布首次点击补选
  startLinking: () => set({ linking: true, linkFrom: useMindMapStore.getState().selectedId ?? null }),
  pickLinkFrom: (id) => set({ linkFrom: id }),
  endLinking: () => set({ linking: false, linkFrom: null }),
  showToast: (message, opts) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: { text: message, error: opts?.error === true } });
    toastTimer = setTimeout(() => {
      set({ toast: null });
      toastTimer = undefined;
    }, opts?.durationMs ?? 2500);
  },
  clearToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = undefined;
    set({ toast: null });
  },
}));
