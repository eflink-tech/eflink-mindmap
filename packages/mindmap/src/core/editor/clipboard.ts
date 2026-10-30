// src/core/editor/clipboard.ts
// 子树剪贴板：序列化为与文档无关的树结构，粘贴时生成新 id
import type { MindMapDocument, NodeMetadata, NodeStyle } from '../../types/mindmap';

export interface ClipNode {
  text: string;
  style?: NodeStyle;
  metadata?: NodeMetadata;
  children: ClipNode[];
}

export interface ClipboardData {
  /** 单选复制时的根节点（兼容旧调用方）；多选时等于 roots[0] */
  root: ClipNode;
  /** 多选复制的顶层子树（已剔除被选中的后代，粘贴时按顺序展开） */
  roots?: ClipNode[];
}

// 深拷贝元数据（含 markers/labels 数组），避免剪贴板与多次粘贴结果共享内层引用
export function cloneMetadata(metadata: NodeMetadata, collapsed: boolean): NodeMetadata {
  return {
    ...metadata,
    collapsed,
    markers: metadata.markers?.map((m) => ({ ...m })),
    labels: metadata.labels ? [...metadata.labels] : undefined,
  };
}

function serialize(doc: MindMapDocument, nodeId: string): ClipNode {
  const node = doc.nodes[nodeId];
  return {
    text: node.text,
    style: node.style ? { ...node.style } : undefined,
    metadata: node.metadata ? cloneMetadata(node.metadata, false) : undefined,
    children: node.children.map((c) => serialize(doc, c)),
  };
}

export function copySubtree(doc: MindMapDocument, nodeId: string): ClipboardData | null {
  if (!doc.nodes[nodeId]) return null;
  return { root: serialize(doc, nodeId) };
}

/** 多选复制：只保留最外层选中的子树（父节点也被选中时跳过其后代），按选择顺序输出 */
export function copySubtrees(doc: MindMapDocument, nodeIds: string[]): ClipboardData | null {
  const unique = [...new Set(nodeIds)].filter((id) => doc.nodes[id]);
  if (!unique.length) return null;
  const selected = new Set(unique);
  const roots = unique.filter((id) => {
    let parentId = doc.nodes[id].parentId;
    while (parentId) {
      if (selected.has(parentId)) return false;
      parentId = doc.nodes[parentId]?.parentId ?? null;
    }
    return true;
  });
  if (!roots.length) return null;
  const serialized = roots.map((id) => serialize(doc, id));
  return { root: serialized[0], roots: serialized };
}
