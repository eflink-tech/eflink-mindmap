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
  root: ClipNode;
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
