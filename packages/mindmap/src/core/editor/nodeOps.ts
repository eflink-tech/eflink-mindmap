// 节点操作纯函数：所有函数返回新文档，不修改入参
import type {
  Boundary,
  Marker,
  MindMapDocument,
  MindMapNode,
  NodeMetadata,
  NodeStyle,
  Relation,
  Summary,
} from '../../types/mindmap';
import { newId } from '../../utils/id';
import { DEFAULT_LAYOUT_PRESET_ID } from '../layout/presets';
import { groupOf, markerEq, type MarkerGroupId } from '../markers/registry';
import { cloneMetadata, type ClipNode, type ClipboardData } from './clipboard';
import { branchSide } from './navigation';

const ROOT_TEXT = '中心主题';
const DEFAULT_TEXT = '分支主题';
const DEFAULT_TITLE = '思维导图';

function withNodes(doc: MindMapDocument, nodes: Record<string, MindMapNode>): MindMapDocument {
  return { ...doc, nodes, updatedAt: Date.now() };
}

function makeNode(id: string, parentId: string | null, text: string): MindMapNode {
  return { id, parentId, children: [], text };
}

// 一级分支的左右归属取「已有归属少的一侧」，平局靠右；只统计已标注的兄弟
function nextRootChildSide(doc: MindMapDocument): 'left' | 'right' {
  let left = 0;
  let right = 0;
  for (const id of doc.nodes[doc.rootId].children) {
    const side = doc.nodes[id].metadata?.side;
    if (side === 'left') left += 1;
    else if (side === 'right') right += 1;
  }
  return right <= left ? 'right' : 'left';
}

// 根的直接子节点补写左右归属（已有归属不覆盖），供布局稳定分侧使用
function ensureRootSide(doc: MindMapDocument, childId: string): MindMapDocument {
  const node = doc.nodes[childId];
  if (!node || node.parentId !== doc.rootId || node.metadata?.side) return doc;
  return withNodes(doc, {
    ...doc.nodes,
    [childId]: { ...node, metadata: { ...node.metadata, side: nextRootChildSide(doc) } },
  });
}

// 显式传入标题时，根节点文本与标题保持一致；未传时沿用默认根文本
export function createDocument(title?: string): MindMapDocument {
  const rootId = newId();
  return {
    id: newId(),
    title: title ?? DEFAULT_TITLE,
    rootId,
    nodes: { [rootId]: makeNode(rootId, null, title ?? ROOT_TEXT) },
    themeId: 'classic',
    layout: DEFAULT_LAYOUT_PRESET_ID,
    viewport: { x: 0, y: 0, scale: 1 },
    relations: [],
    boundaries: [],
    summaries: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function subtreeIds(doc: MindMapDocument, id: string): string[] {
  const out: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    out.push(cur);
    stack.push(...(doc.nodes[cur]?.children ?? []));
  }
  return out;
}

export function addChild(doc: MindMapDocument, parentId: string, text = DEFAULT_TEXT): MindMapDocument {
  const parent = doc.nodes[parentId];
  if (!parent) return doc;
  const id = newId();
  const expanded = parent.metadata?.collapsed
    ? { ...parent, metadata: { ...parent.metadata, collapsed: false } }
    : parent;
  return ensureRootSide(
    withNodes(doc, {
      ...doc.nodes,
      [id]: makeNode(id, parentId, text),
      [parentId]: { ...expanded, children: [...expanded.children, id] },
    }),
    id,
  );
}

export function addSibling(
  doc: MindMapDocument,
  nodeId: string,
  text = DEFAULT_TEXT,
  position: 'before' | 'after' = 'after',
): MindMapDocument {
  const node = doc.nodes[nodeId];
  if (!node) return doc;
  if (node.parentId === null) return addChild(doc, nodeId, text);
  const parent = doc.nodes[node.parentId];
  const index = parent.children.indexOf(nodeId);
  const id = newId();
  const children = [...parent.children];
  children.splice(position === 'before' ? index : index + 1, 0, id);
  // 一级分支的新同级必须继承目标分支的渲染侧（旧文档未标注时按布局同一规则推断），
  // 否则留给布局按数量推断，新节点可能落到另一侧、与目标分离
  const created = makeNode(id, parent.id, text);
  if (parent.id === doc.rootId) created.metadata = { side: branchSide(doc, nodeId) };
  return withNodes(doc, {
    ...doc.nodes,
    [id]: created,
    [parent.id]: { ...parent, children },
  });
}

export function updateText(doc: MindMapDocument, nodeId: string, text: string): MindMapDocument {
  const node = doc.nodes[nodeId];
  if (!node) return doc;
  return withNodes(doc, { ...doc.nodes, [nodeId]: { ...node, text } });
}

// 合并节点自定义样式；传 null 清除样式；patch 中 value === undefined 则删除该键
export function updateStyle(
  doc: MindMapDocument,
  nodeId: string,
  style: NodeStyle | null,
): MindMapDocument {
  const node = doc.nodes[nodeId];
  if (!node) return doc;
  // 空对象补丁视为无操作，避免在节点上残留无意义的 {} 样式
  if (style !== null && Object.keys(style).length === 0) return doc;
  if (style === null) {
    return withNodes(doc, { ...doc.nodes, [nodeId]: { ...node, style: undefined } });
  }
  const merged: NodeStyle = { ...node.style };
  for (const [k, v] of Object.entries(style)) {
    if (v === undefined) delete merged[k as keyof NodeStyle];
    else (merged as Record<string, unknown>)[k] = v;
  }
  const nextStyle = Object.keys(merged).length === 0 ? undefined : merged;
  return withNodes(doc, { ...doc.nodes, [nodeId]: { ...node, style: nextStyle } });
}

export function removeNode(doc: MindMapDocument, nodeId: string): MindMapDocument {
  const node = doc.nodes[nodeId];
  if (!node || node.parentId === null) return doc;
  const removed = new Set(subtreeIds(doc, nodeId));
  const parent = doc.nodes[node.parentId];
  const nodes: Record<string, MindMapNode> = { ...doc.nodes };
  for (const id of removed) delete nodes[id];
  nodes[parent.id] = { ...parent, children: parent.children.filter((c) => !removed.has(c)) };

  // 清理引用被删子树的关系结构，避免孤儿引用
  const relations = doc.relations.filter((r) => !removed.has(r.from) && !removed.has(r.to));

  const boundaries = doc.boundaries
    .map((b) => {
      const nodeIds = b.nodeIds.filter((id) => !removed.has(id));
      // 成员无变化保留原对象；成员删空则整个外框删除
      if (nodeIds.length === b.nodeIds.length) return b;
      return nodeIds.length > 0 ? { ...b, nodeIds } : null;
    })
    .filter((b): b is Boundary => b !== null);

  // 被删节点在父 children 中的下标，用于调整同组概要区间
  const idx = parent.children.indexOf(nodeId);
  const summaries: Summary[] = [];
  for (const s of doc.summaries) {
    // 概要挂在被删子树内 → 一并删除；其它父节点的概要原样保留
    if (removed.has(s.parentId)) continue;
    if (s.parentId !== parent.id) {
      summaries.push(s);
      continue;
    }
    const [lo, hi] = s.range;
    if (idx < lo) {
      // 删除位置在区间之前：区间整体左移
      summaries.push({ ...s, range: [lo - 1, hi - 1] });
    } else if (idx <= hi) {
      // 删除位置在区间内：右端收缩；区间只剩被删成员时概要失去意义，一并删除
      if (lo === hi) continue;
      summaries.push({ ...s, range: [lo, hi - 1] });
    } else {
      summaries.push(s);
    }
  }

  const next = withNodes(doc, nodes);
  return { ...next, relations, boundaries, summaries };
}

export function moveNode(
  doc: MindMapDocument,
  dragId: string,
  targetParentId: string,
  index: number,
): MindMapDocument {
  const drag = doc.nodes[dragId];
  const targetParent = doc.nodes[targetParentId];
  if (!drag || !targetParent || drag.parentId === null) return doc;
  if (dragId === targetParentId) return doc;
  if (subtreeIds(doc, dragId).includes(targetParentId)) return doc;

  const oldParent = doc.nodes[drag.parentId];
  const nodes: Record<string, MindMapNode> = { ...doc.nodes };
  const oldChildren = oldParent.children.filter((c) => c !== dragId);
  nodes[oldParent.id] = { ...oldParent, children: oldChildren };

  const newChildren = [...(targetParentId === oldParent.id ? oldChildren : targetParent.children)];
  const clamped = Math.max(0, Math.min(index, newChildren.length));
  newChildren.splice(clamped, 0, dragId);
  nodes[targetParent.id] = { ...targetParent, children: newChildren };
  nodes[dragId] = { ...drag, parentId: targetParentId };
  // 拖到根级别且无归属时补写一侧；已有归属保持不变，避免拖动排序引起左右跳动
  return ensureRootSide(withNodes(doc, nodes), dragId);
}

export function toggleCollapse(doc: MindMapDocument, nodeId: string): MindMapDocument {
  const node = doc.nodes[nodeId];
  if (!node) return doc;
  const collapsed = !node.metadata?.collapsed;
  return withNodes(doc, {
    ...doc.nodes,
    [nodeId]: { ...node, metadata: { ...node.metadata, collapsed } },
  });
}

// 将剪贴板子树粘贴为目标节点的子节点，所有节点生成新 id
export function pasteSubtree(
  doc: MindMapDocument,
  targetId: string,
  clip: ClipboardData,
): MindMapDocument {
  const target = doc.nodes[targetId];
  if (!target) return doc;

  const nodes: Record<string, MindMapNode> = { ...doc.nodes };
  function build(c: ClipNode, parentId: string): string {
    const id = newId();
    nodes[id] = {
      id,
      parentId,
      children: [],
      text: c.text,
      style: c.style ? { ...c.style } : undefined,
      metadata: c.metadata ? cloneMetadata(c.metadata, false) : undefined,
    };
    nodes[id].children = c.children.map((child) => build(child, id));
    return id;
  }

  const rootCopy = build(clip.root, targetId);
  nodes[targetId] = {
    ...target,
    children: [...target.children, rootCopy],
    metadata: { ...target.metadata, collapsed: false },
  };
  // 粘贴到根级别时重新分配左右归属，避免多次粘贴堆在同一侧
  if (targetId === doc.rootId) {
    nodes[rootCopy] = {
      ...nodes[rootCopy],
      metadata: { ...nodes[rootCopy].metadata, side: nextRootChildSide({ ...doc, nodes }) },
    };
  }
  return withNodes(doc, nodes);
}

// 追加联系线：自连或任一端节点不存在时返回原文档
export function addRelation(doc: MindMapDocument, from: string, to: string): MindMapDocument {
  if (from === to || !doc.nodes[from] || !doc.nodes[to]) return doc;
  const rel: Relation = { id: newId(), from, to };
  return { ...doc, relations: [...doc.relations, rel], updatedAt: Date.now() };
}

// 修改联系线标签
export function updateRelationLabel(doc: MindMapDocument, id: string, label: string): MindMapDocument {
  if (!doc.relations.some((r) => r.id === id)) return doc;
  return {
    ...doc,
    relations: doc.relations.map((r) => (r.id === id ? { ...r, label } : r)),
    updatedAt: Date.now(),
  };
}

// 删除联系线
export function removeRelation(doc: MindMapDocument, id: string): MindMapDocument {
  if (!doc.relations.some((r) => r.id === id)) return doc;
  return { ...doc, relations: doc.relations.filter((r) => r.id !== id), updatedAt: Date.now() };
}

// 追加外框：成员节点必须同属一个父节点，跨父节点时返回原文档
export function addBoundary(doc: MindMapDocument, nodeIds: string[]): MindMapDocument {
  if (!nodeIds.length || nodeIds.some((id) => !doc.nodes[id])) return doc;
  const parents = new Set(nodeIds.map((id) => doc.nodes[id].parentId));
  if (parents.size !== 1) return doc;
  const boundary: Boundary = { id: newId(), nodeIds: [...nodeIds] };
  return { ...doc, boundaries: [...doc.boundaries, boundary], updatedAt: Date.now() };
}

// 删除外框
export function removeBoundary(doc: MindMapDocument, id: string): MindMapDocument {
  if (!doc.boundaries.some((b) => b.id === id)) return doc;
  return { ...doc, boundaries: doc.boundaries.filter((b) => b.id !== id), updatedAt: Date.now() };
}

// 修改外框备注标题；空串移除标题（标签 chip 随之消失）
export function updateBoundaryTitle(doc: MindMapDocument, id: string, title: string): MindMapDocument {
  if (!doc.boundaries.some((b) => b.id === id)) return doc;
  const next = title.trim();
  return {
    ...doc,
    boundaries: doc.boundaries.map((b) => (b.id === id ? { ...b, title: next || undefined } : b)),
    updatedAt: Date.now(),
  };
}

// 在父节点的指定子节点区间上创建概要；区间越界或反向时返回原文档
export function addSummary(
  doc: MindMapDocument,
  parentId: string,
  range: [number, number],
  text: string,
): MindMapDocument {
  const parent = doc.nodes[parentId];
  if (!parent || range[0] < 0 || range[1] >= parent.children.length || range[0] > range[1]) return doc;
  // 拷贝区间数组，避免调用方后续修改污染文档
  const summary: Summary = { id: newId(), parentId, range: [range[0], range[1]], text };
  return { ...doc, summaries: [...doc.summaries, summary], updatedAt: Date.now() };
}

// 修改概要文本
export function updateSummaryText(doc: MindMapDocument, id: string, text: string): MindMapDocument {
  if (!doc.summaries.some((s) => s.id === id)) return doc;
  return {
    ...doc,
    summaries: doc.summaries.map((s) => (s.id === id ? { ...s, text } : s)),
    updatedAt: Date.now(),
  };
}

// 删除概要
export function removeSummary(doc: MindMapDocument, id: string): MindMapDocument {
  if (!doc.summaries.some((s) => s.id === id)) return doc;
  return { ...doc, summaries: doc.summaries.filter((s) => s.id !== id), updatedAt: Date.now() };
}

// 合并节点元数据补丁（浅合并）
export function updateMetadata(
  doc: MindMapDocument,
  nodeId: string,
  patch: Partial<NodeMetadata>,
): MindMapDocument {
  const node = doc.nodes[nodeId];
  if (!node) return doc;
  // 数组字段拷贝后再合并，防止外部数组引用被共享进文档
  const merged: NodeMetadata = { ...node.metadata, ...patch };
  if (patch.markers) merged.markers = patch.markers.map((m) => ({ ...m }));
  if (patch.labels) merged.labels = [...patch.labels];
  return withNodes(doc, {
    ...doc.nodes,
    [nodeId]: { ...node, metadata: merged },
  });
}

// 设置标记：同分组标记互斥（替换），不同分组追加；旧版 progress 并入任务组
export function setMarker(doc: MindMapDocument, nodeId: string, marker: Marker): MindMapDocument {
  const node = doc.nodes[nodeId];
  if (!node) return doc;
  const group = groupOf(marker);
  const others = (node.metadata?.markers ?? []).filter((m) => groupOf(m) !== group);
  return updateMetadata(doc, nodeId, { markers: [...others, marker] });
}

// 按分组删除标记
export function removeMarkerGroup(
  doc: MindMapDocument,
  nodeId: string,
  group: MarkerGroupId,
): MindMapDocument {
  const node = doc.nodes[nodeId];
  if (!node) return doc;
  const markers = (node.metadata?.markers ?? []).filter((m) => groupOf(m) !== group);
  return updateMetadata(doc, nodeId, { markers });
}

// 切换标记：已应用同一图标则整组移除，否则按组写入（对齐 XMind 点击切换语义）
export function toggleMarker(doc: MindMapDocument, nodeId: string, marker: Marker): MindMapDocument {
  const node = doc.nodes[nodeId];
  if (!node) return doc;
  const markers = node.metadata?.markers ?? [];
  if (markers.some((m) => markerEq(m, marker))) {
    return removeMarkerGroup(doc, nodeId, groupOf(marker));
  }
  return setMarker(doc, nodeId, marker);
}

// 按类型删除标记（保留旧 API 语义：删除该类型全部标记）
export function removeMarker(doc: MindMapDocument, nodeId: string, type: Marker['type']): MindMapDocument {
  const node = doc.nodes[nodeId];
  if (!node) return doc;
  const markers = (node.metadata?.markers ?? []).filter((m) => m.type !== type);
  return updateMetadata(doc, nodeId, { markers });
}
