import { create } from 'zustand';
import { copySubtree, type ClipboardData } from '../core/editor/clipboard';
import {
  addBoundary, addChild, addRelation, addSibling, addSummary,
  pasteSubtree, removeBoundary, removeMarkerGroup, removeNode, removeRelation, removeSummary,
  setMarker, toggleCollapse, updateBoundaryTitle, updateMetadata, updateStyle, updateText,
} from '../core/editor/nodeOps';
import { groupOf, markerEq } from '../core/markers/registry';
import {
  canRedo as canRedoFn, canUndo as canUndoFn, emptyHistory, record, redo, undo,
  type HistoryState,
} from '../core/editor/history';
import { applyLayoutPreset } from '../core/layout/applyPreset';
import { layoutDocument } from '../core/layout/engine';
import { normalizeLayoutId } from '../core/layout/presets';
// navigateTo：方向键导航纯函数（别名避免与 action 同名混淆）
import { isChildDirection, navigate as navigateTo, type NavDir } from '../core/editor/navigation';
import { scheduleSave } from '../core/persistence/autosave';
import { renameDocument } from '../core/persistence/db';
import { getTheme, resolveThemeId } from '../core/style/themes';
import { updateCanvasOptions } from '../core/style/canvasOptions';
import type {
  CanvasOptions, DropPreview, LayoutResult, LayoutType, Marker, MindMapDocument, NodeMetadata, NodeStyle, ViewportState,
} from '../types/mindmap';
import { useUiStore } from './uiStore';
import { useDocumentsStore } from './documentsStore';

interface MindMapStore {
  doc: MindMapDocument | null;
  /** 是否有未保存到云端的改动：导图结构/节点变化置 true；仅云端保存成功后置 false（写本地草稿不清除） */
  dirty: boolean;
  layoutResult: LayoutResult | null;
  selectedId: string | null;
  /** 多选集合（框选 / Shift+点击）；为空时无选中，单选时为 [selectedId]，selectedId 始终是最后点击的锚点 */
  selectedIds: string[];
  /** 联系线选中：与 selectedId 互斥（选中连线即取消选中节点） */
  selectedRelationId: string | null;
  /** 概要选中：与节点/联系线选中互斥（Delete 删除概要） */
  selectedSummaryId: string | null;
  /** 外框选中：与其他选中互斥（Delete 删除外框，左上角加号打开备注输入） */
  selectedBoundaryId: string | null;
  /** 外框备注编辑态（加号/双击标签进入）：与外框选中并存 */
  editingBoundaryId: string | null;
  editingId: string | null;
  /** 概要编辑态（双击概要盒进入）：与节点编辑互斥 */
  editingSummaryId: string | null;
  dropPreview: DropPreview | null;
  history: HistoryState;
  batch: MindMapDocument | null;
  stageSize: { width: number; height: number };
  clipboard: ClipboardData | null;
  autoFitPending: boolean;

  open: (doc: MindMapDocument) => void;
  /** 云端保存成功后调用：清除 dirty；传入保存时的 doc 引用，若保存期间又有编辑则保持 dirty */
  markSaved: (saved?: MindMapDocument) => void;
  copySelected: () => void;
  cutSelected: () => void;
  paste: () => void;
  clearClipboard: () => void;
  act: (op: (doc: MindMapDocument) => MindMapDocument) => void;
  addTopic: (kind: 'child' | 'sibling' | 'siblingBefore') => void;
  removeSelected: () => void;
  editSelectedText: (text: string) => void;
  beginBatch: () => void;
  endBatch: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  select: (id: string | null) => void;
  /** Shift+点击：节点在多选集合中加入/移出 */
  toggleSelect: (id: string) => void;
  /** 框选：整体替换多选集合（过滤已删除节点） */
  selectMany: (ids: string[]) => void;
  selectRelation: (id: string | null) => void;
  selectSummary: (id: string | null) => void;
  /** 外框选中：与其他选中互斥；传 null 取消选中 */
  selectBoundary: (id: string | null) => void;
  /** 进入外框备注编辑（加号点击/双击标签），同时保持外框选中 */
  setEditingBoundary: (id: string | null) => void;
  setEditingSummary: (id: string | null) => void;
  setEditing: (id: string | null) => void;
  /** 方向键节点导航（↑↓ 同级、←→ 父子，随布局/分支侧向自适应） */
  navigate: (dir: NavDir) => void;
  setDropPreview: (p: DropPreview | null) => void;
  setViewport: (v: ViewportState) => void;
  setStageSize: (s: { width: number; height: number }) => void;
  setLayout: (t: LayoutType) => void;
  setTheme: (themeId: string) => void;
  setCanvasOption: (patch: Partial<CanvasOptions>) => void;
  /** patch 中显式 undefined 会删除对应样式键（如 fixedWidth「适合」） */
  setNodeStyle: (style: { [K in keyof NodeStyle]?: NodeStyle[K] | undefined }) => void;
  clearNodeStyle: () => void;
  fitToScreen: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (scale: number) => void;
  zoomStep: (dir: 1 | -1) => void;
  addBoundarySelected: () => void;
  addSummarySelected: () => void;
  pickLinkNode: (id: string) => void;
  removeRelationById: (id: string) => void;
  removeBoundaryById: (id: string) => void;
  /** 提交外框备注标题（空串移除标题） */
  updateBoundaryTitleById: (id: string, title: string) => void;
  removeSummaryById: (id: string) => void;
  updateMetadataSelected: (patch: Partial<NodeMetadata>) => void;
  updateMetadataNode: (id: string, patch: Partial<NodeMetadata>) => void;
  setMarkerSelected: (m: Marker) => void;
  /** 切换标记：以锚点节点状态为准应用到全部选中节点（已应用则整组移除） */
  toggleMarkerSelected: (m: Marker) => void;
  /** 重命名文档标题：同步内存与 IndexedDB，不进入撤销历史 */
  renameTitle: (title: string) => Promise<void>;
}

function relayout(doc: MindMapDocument): LayoutResult {
  return layoutDocument(doc, getTheme(doc));
}

/** 缩放档位：底部状态栏下拉与 zoomIn/zoomOut 步进共用（滚轮缩放不受限，仍为连续缩放） */
const ZOOM_STEPS = [0.5, 0.7, 0.8, 1, 1.2, 1.5, 2];

export const useMindMapStore = create<MindMapStore>((set, get) => ({
  doc: null,
  dirty: false,
  layoutResult: null,
  selectedId: null,
  selectedIds: [],
  selectedRelationId: null,
  selectedSummaryId: null,
  selectedBoundaryId: null,
  editingBoundaryId: null,
  editingId: null,
  editingSummaryId: null,
  dropPreview: null,
  history: emptyHistory,
  batch: null,
  stageSize: { width: 1200, height: 800 },
  clipboard: null,
  autoFitPending: false,

  open: (doc) => {
    // 切换文档时清理连线模式，避免 linkFrom 指向旧文档节点
    useUiStore.getState().endLinking();
    const normalizedLayout = normalizeLayoutId(doc.layout);
    const openedDoc = normalizedLayout === doc.layout ? doc : { ...doc, layout: normalizedLayout };
    const layoutResult = relayout(openedDoc);
    set({
      doc: openedDoc,
      layoutResult,
      // 新打开的文档视为与存储一致（打开前刚从云端读取或建档落库）
      dirty: false,
      selectedId: openedDoc.rootId,
      selectedIds: [openedDoc.rootId],
      selectedRelationId: null,
      selectedSummaryId: null,
      selectedBoundaryId: null,
      editingBoundaryId: null,
      editingId: null,
      editingSummaryId: null,
      dropPreview: null,
      history: emptyHistory,
      batch: null,
      clipboard: null,
      autoFitPending: true,
    });
  },

  copySelected: () => {
    const { doc, selectedId } = get();
    if (!doc || !selectedId) return;
    const clip = copySubtree(doc, selectedId);
    if (clip) set({ clipboard: clip });
  },

  cutSelected: () => {
    const { doc, selectedId } = get();
    if (!doc || !selectedId || selectedId === doc.rootId) return;
    const clip = copySubtree(doc, selectedId);
    if (!clip) return;
    set({ clipboard: clip });
    // removeSelected 内部会把 selectedId 回退到被删节点的父节点，粘贴目标自然存在
    get().removeSelected();
  },

  paste: () => {
    const { clipboard, selectedId } = get();
    if (!clipboard || !selectedId) return;
    get().act((d) => pasteSubtree(d, selectedId, clipboard));
  },

  clearClipboard: () => set({ clipboard: null }),

  markSaved: (saved) => {
    // 保存期间文档又被编辑（引用变化）→ 保持 dirty，等待下一次保存
    if (!saved || get().doc === saved) set({ dirty: false });
  },

  act: (op) => {
    const { doc, history, batch } = get();
    if (!doc) return;
    const next = op(doc);
    if (next === doc) return;
    // batch 模式下不记录历史（用于编辑态实时更新）
    if (batch) {
      set({ doc: next, layoutResult: relayout(next), dirty: true });
    } else {
      set({ doc: next, layoutResult: relayout(next), history: record(history, doc), dirty: true });
    }
    scheduleSave(next);
  },

  addTopic: (kind) => {
    const { doc, selectedId, act } = get();
    if (!doc || !selectedId) return;
    const before = new Set(Object.keys(doc.nodes));
    act((d) => {
      if (kind === 'child') return addChild(d, selectedId);
      // Shift+Enter 在当前节点前插入，普通 Enter 在其后插入
      return addSibling(d, selectedId, undefined, kind === 'siblingBefore' ? 'before' : 'after');
    });
    const next = get().doc;
    if (!next) return;
    const added = Object.keys(next.nodes).find((id) => !before.has(id));
    if (added) set({ selectedId: added, selectedIds: [added], editingId: added });
  },

  removeSelected: () => {
    const { doc, selectedId, selectedIds, act } = get();
    if (!doc) return;
    // 多选批量删除：根节点不可删；removeNode 对已随祖先删除的节点幂等
    const ids = (selectedIds.length ? selectedIds : selectedId ? [selectedId] : []).filter(
      (id) => id !== doc.rootId,
    );
    if (!ids.length) return;
    const parentId = doc.nodes[selectedId ?? ids[0]]?.parentId ?? doc.rootId;
    act((d) => ids.reduce((acc, id) => removeNode(acc, id), d));
    // 被删成员所在的外框可能已被级联清理，选中态一并复位
    set({
      selectedId: parentId,
      selectedIds: [parentId],
      editingId: null,
      selectedBoundaryId: null,
      editingBoundaryId: null,
    });
    // 删除节点后 linkFrom 可能悬空，清理连线模式
    useUiStore.getState().endLinking();
  },

  editSelectedText: (text) => {
    const { selectedId, act } = get();
    if (!selectedId) return;
    act((d) => updateText(d, selectedId, text));
    set({ editingId: null });
  },

  beginBatch: () => set({ batch: get().doc }),

  endBatch: () => {
    const { batch, doc, history } = get();
    if (!batch || !doc || batch === doc) {
      set({ batch: null });
      return;
    }
    set({ batch: null, history: record(history, batch), dirty: true });
    scheduleSave(doc);
  },

  undo: () => {
    const { doc, history, selectedId, selectedIds, selectedRelationId, selectedSummaryId, selectedBoundaryId } = get();
    if (!doc) return;
    const r = undo(history, doc);
    if (!r) return;
    const sel = r.doc.nodes[selectedId ?? ''] ? selectedId : r.doc.rootId;
    // 撤销后节点/联系线/概要/外框可能已不存在，失效选中一并清掉
    const ids = selectedIds.filter((id) => r.doc.nodes[id]);
    const relSel = r.doc.relations.some((x) => x.id === selectedRelationId) ? selectedRelationId : null;
    const sumSel = r.doc.summaries.some((x) => x.id === selectedSummaryId) ? selectedSummaryId : null;
    const bndSel = r.doc.boundaries.some((x) => x.id === selectedBoundaryId) ? selectedBoundaryId : null;
    set({
      doc: r.doc,
      history: r.state,
      layoutResult: relayout(r.doc),
      dirty: true,
      selectedId: sel,
      selectedIds: ids.length ? ids : sel ? [sel] : [],
      selectedRelationId: relSel,
      selectedSummaryId: sumSel,
      selectedBoundaryId: bndSel,
      editingBoundaryId: bndSel ? get().editingBoundaryId : null,
    });
    scheduleSave(r.doc);
  },

  redo: () => {
    const { doc, history, selectedId, selectedIds, selectedRelationId, selectedSummaryId, selectedBoundaryId } = get();
    if (!doc) return;
    const r = redo(history, doc);
    if (!r) return;
    const sel = r.doc.nodes[selectedId ?? ''] ? selectedId : r.doc.rootId;
    const ids = selectedIds.filter((id) => r.doc.nodes[id]);
    const relSel = r.doc.relations.some((x) => x.id === selectedRelationId) ? selectedRelationId : null;
    const sumSel = r.doc.summaries.some((x) => x.id === selectedSummaryId) ? selectedSummaryId : null;
    const bndSel = r.doc.boundaries.some((x) => x.id === selectedBoundaryId) ? selectedBoundaryId : null;
    set({
      doc: r.doc,
      history: r.state,
      layoutResult: relayout(r.doc),
      dirty: true,
      selectedId: sel,
      selectedIds: ids.length ? ids : sel ? [sel] : [],
      selectedRelationId: relSel,
      selectedSummaryId: sumSel,
      selectedBoundaryId: bndSel,
      editingBoundaryId: bndSel ? get().editingBoundaryId : null,
    });
    scheduleSave(r.doc);
  },

  canUndo: () => canUndoFn(get().history),
  canRedo: () => canRedoFn(get().history),

  // 节点与联系线选中互斥：选中一边清掉另一边
  select: (id) =>
    set({
      selectedId: id,
      selectedIds: id ? [id] : [],
      selectedRelationId: null,
      selectedSummaryId: null,
      selectedBoundaryId: null,
      editingBoundaryId: null,
      editingSummaryId: null,
    }),

  // Shift+点击切换多选；锚点（selectedId）始终指向最后一次操作
  toggleSelect: (id) => {
    const { selectedId, selectedIds } = get();
    if (selectedIds.includes(id)) {
      const rest = selectedIds.filter((x) => x !== id);
      set({
        selectedIds: rest,
        selectedId: id === selectedId ? rest[rest.length - 1] ?? null : selectedId,
        selectedRelationId: null,
        selectedSummaryId: null,
        selectedBoundaryId: null,
        editingBoundaryId: null,
        editingSummaryId: null,
      });
    } else {
      set({
        selectedIds: [...selectedIds, id],
        selectedId: id,
        selectedRelationId: null,
        selectedSummaryId: null,
        selectedBoundaryId: null,
        editingBoundaryId: null,
        editingSummaryId: null,
      });
    }
  },

  // 框选：整体替换多选集合；锚点尽量保持不变，否则取新集合最后一个
  selectMany: (ids) => {
    const { doc, selectedId } = get();
    if (!doc) return;
    const valid = ids.filter((id) => doc.nodes[id]);
    set({
      selectedIds: valid,
      selectedId: selectedId && valid.includes(selectedId) ? selectedId : valid[valid.length - 1] ?? null,
      selectedRelationId: null,
      selectedSummaryId: null,
      selectedBoundaryId: null,
      editingBoundaryId: null,
      editingSummaryId: null,
    });
  },

  selectRelation: (id) =>
    set({
      selectedRelationId: id,
      selectedId: null,
      selectedIds: [],
      editingId: null,
      selectedSummaryId: null,
      selectedBoundaryId: null,
      editingBoundaryId: null,
      editingSummaryId: null,
    }),

  // 概要选中：与节点/联系线选中互斥
  selectSummary: (id) =>
    set({
      selectedSummaryId: id,
      selectedId: null,
      selectedIds: [],
      selectedRelationId: null,
      selectedBoundaryId: null,
      editingBoundaryId: null,
      editingId: null,
      editingSummaryId: null,
    }),

  // 外框选中：与其他选中互斥（编辑态一并退出）
  selectBoundary: (id) =>
    set({
      selectedBoundaryId: id,
      selectedId: null,
      selectedIds: [],
      selectedRelationId: null,
      selectedSummaryId: null,
      editingId: null,
      editingSummaryId: null,
      editingBoundaryId: null,
    }),

  // 进入外框备注编辑：保持外框选中（加号点击/双击标签触发）
  setEditingBoundary: (id) =>
    set({
      editingBoundaryId: id,
      selectedBoundaryId: id,
      selectedId: null,
      selectedIds: [],
      selectedRelationId: null,
      selectedSummaryId: null,
      editingId: null,
      editingSummaryId: null,
    }),

  // 进入概要编辑态（双击概要盒）；同时选中该概要保持高亮
  setEditingSummary: (id) =>
    set({
      editingSummaryId: id,
      selectedSummaryId: id,
      selectedId: null,
      selectedIds: [],
      selectedRelationId: null,
      selectedBoundaryId: null,
      editingBoundaryId: null,
      editingId: null,
    }),
  setEditing: (id) =>
    set({
      editingId: id,
      editingSummaryId: null,
      selectedBoundaryId: null,
      editingBoundaryId: null,
    }),
  setDropPreview: (p) => set({ dropPreview: p }),

  // 方向键导航：折叠节点上按「向子级」方向先展开（对齐 XMind），其余只移动选中
  navigate: (dir) => {
    const { doc, selectedId } = get();
    if (!doc) return;
    if (!selectedId || !doc.nodes[selectedId]) {
      get().select(doc.rootId);
      return;
    }
    const node = doc.nodes[selectedId];
    if (
      isChildDirection(doc, selectedId, dir) &&
      node.children.length > 0 &&
      node.metadata?.collapsed
    ) {
      get().act((d) => toggleCollapse(d, selectedId));
      return;
    }
    const target = navigateTo(doc, selectedId, dir);
    if (target && doc.nodes[target]) get().select(target);
  },

  setViewport: (v) => {
    const { doc } = get();
    if (!doc) return;
    const next = { ...doc, viewport: v };
    set({ doc: next });
    scheduleSave(next);
  },

  setStageSize: (s) => set({ stageSize: s }),

  setLayout: (t) =>
    get().act((d) => {
      const next = applyLayoutPreset(d, t);
      return next === d ? d : next;
    }),

  setTheme: (themeId) => {
    // 非法主题 id 直接拒绝；旧 id 归一到新 id 再写入，避免持久化后渲染静默回退
    const resolved = resolveThemeId(themeId);
    if (!resolved) return;
    get().act((d) => (d.themeId === resolved ? d : { ...d, themeId: resolved, updatedAt: Date.now() }));
  },

  setCanvasOption: (patch) => get().act((d) => updateCanvasOptions(d, patch)),

  setNodeStyle: (style) => {
    const { selectedId } = get();
    if (!selectedId) return;
    get().act((d) => updateStyle(d, selectedId, style));
  },

  clearNodeStyle: () => {
    const { selectedId } = get();
    if (!selectedId) return;
    get().act((d) => updateStyle(d, selectedId, null));
  },

  fitToScreen: () => {
    const { layoutResult, stageSize, doc } = get();
    if (!layoutResult || !doc) return;
    const b = layoutResult.contentBounds;
    if (b.width === 0 || b.height === 0) return;
    const scale = Math.min(
      1.5,
      Math.max(0.1, Math.min((stageSize.width - 120) / b.width, (stageSize.height - 120) / b.height)),
    );
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    get().setViewport({ scale, x: stageSize.width / 2 - cx * scale, y: stageSize.height / 2 - cy * scale });
    set({ autoFitPending: false });
  },

  /** 按档位步进缩放（底部状态栏 / 快捷键用） */
  zoomIn: () => get().zoomStep(1),
  zoomOut: () => get().zoomStep(-1),

  /** 缩放到指定比例，以当前视口中心为锚点，画面中心不跑偏 */
  zoomTo: (nextScale) => {
    const { doc, stageSize } = get();
    if (!doc) return;
    const scale = Math.min(3, Math.max(0.1, nextScale));
    const v = doc.viewport;
    if (scale === v.scale) return;
    const wx = (stageSize.width / 2 - v.x) / v.scale;
    const wy = (stageSize.height / 2 - v.y) / v.scale;
    get().setViewport({ scale, x: stageSize.width / 2 - wx * scale, y: stageSize.height / 2 - wy * scale });
  },

  zoomStep: (dir) => {
    const { doc } = get();
    if (!doc) return;
    const cur = doc.viewport.scale;
    const eps = 1e-6;
    let next: number | undefined;
    if (dir > 0) {
      next = ZOOM_STEPS.find((s) => s > cur + eps) ?? Math.min(3, cur * 1.2);
    } else {
      next = [...ZOOM_STEPS].reverse().find((s) => s < cur - eps) ?? Math.max(0.1, cur / 1.2);
    }
    get().zoomTo(next);
  },

  addBoundarySelected: () => {
    const { selectedId, selectedIds } = get();
    if (!selectedId) return;
    // 多选（同一父节点下）整体加外框；跨父节点由 addBoundary 拒绝（返回原文档）
    const ids = selectedIds.length > 1 ? selectedIds : [selectedId];
    get().act((d) => addBoundary(d, ids));
  },

  addSummarySelected: () => {
    const { doc, selectedId, selectedIds } = get();
    if (!doc || !selectedId) return;
    const ids = selectedIds.length > 1 ? selectedIds : [selectedId];
    // 锚点是根节点时改用第一个非根成员（根节点自身无同级，不做概要）
    const anchor = ids.map((id) => doc.nodes[id]).find((n) => n && n.parentId !== null);
    if (!anchor?.parentId) return;
    const children = doc.nodes[anchor.parentId].children;
    const indexes = ids.map((id) => children.indexOf(id));
    // 跨父节点的多选没有共同区间，不创建
    if (indexes.some((i) => i < 0)) return;
    get().act((d) => addSummary(d, anchor.parentId!, [Math.min(...indexes), Math.max(...indexes)], '概要'));
  },

  // 联系线创建模式：第一次点击记录起点，第二次点击生成联系线并退出模式
  pickLinkNode: (id) => {
    const ui = useUiStore.getState();
    if (!ui.linking) return;
    if (!ui.linkFrom) {
      ui.pickLinkFrom(id);
      return;
    }
    // 第二次点击仍是起点：自连无意义，保留连线模式与起点，不退出
    if (id === ui.linkFrom) return;
    const from = ui.linkFrom;
    get().act((d) => addRelation(d, from, id));
    ui.endLinking();
  },

  removeRelationById: (id) => {
    get().act((d) => removeRelation(d, id));
    // 删除的是当前选中连线时清掉选中（含撤销重做期间悬空的情况）
    if (get().selectedRelationId === id) set({ selectedRelationId: null });
  },
  removeBoundaryById: (id) => {
    get().act((d) => removeBoundary(d, id));
    // 删除的是当前选中/正在编辑的外框时清掉对应状态（撤销重做期间也可能悬空）
    if (get().selectedBoundaryId === id) set({ selectedBoundaryId: null });
    if (get().editingBoundaryId === id) set({ editingBoundaryId: null });
  },

  updateBoundaryTitleById: (id, title) => get().act((d) => updateBoundaryTitle(d, id, title)),
  removeSummaryById: (id) => {
    get().act((d) => removeSummary(d, id));
    // 删除的是当前选中/正在编辑的概要时清掉对应状态
    if (get().selectedSummaryId === id || get().editingSummaryId === id) {
      set({ selectedSummaryId: null, editingSummaryId: null });
    }
  },

  updateMetadataSelected: (patch) => {
    const { selectedId } = get();
    if (!selectedId) return;
    get().act((d) => updateMetadata(d, selectedId, patch));
  },

  // 按节点 id 写入元数据：供异步回调使用，避免回调触发时选中节点已变化
  updateMetadataNode: (id, patch) => get().act((d) => updateMetadata(d, id, patch)),

  setMarkerSelected: (marker) => {
    const { selectedId } = get();
    if (!selectedId) return;
    get().act((d) => setMarker(d, selectedId, marker));
  },

  // 标记应用到多选集合整体：以锚点（selectedId）是否已有该标记为准，保证一次点击结果一致
  toggleMarkerSelected: (marker) => {
    const { doc, selectedId, selectedIds } = get();
    if (!doc || !selectedId) return;
    const ids = selectedIds.length ? selectedIds : [selectedId];
    const has = (doc.nodes[selectedId].metadata?.markers ?? []).some((m) => markerEq(m, marker));
    get().act((d) =>
      ids.reduce(
        (acc, id) => (has ? removeMarkerGroup(acc, id, groupOf(marker)) : setMarker(acc, id, marker)),
        d,
      ),
    );
  },

  renameTitle: async (title) => {
    const { doc } = get();
    if (!doc) return;
    const next = title.trim() || doc.title;
    if (next === doc.title) return;
    set({ doc: { ...doc, title: next, updatedAt: Date.now() } });
    await renameDocument(doc.id, next);
    await useDocumentsStore.getState().refresh();
  },
}));
