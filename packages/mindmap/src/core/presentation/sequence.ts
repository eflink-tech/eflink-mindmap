// packages/mindmap/src/core/presentation/sequence.ts
// 演示模式的翻页序列：从起始节点（默认根节点）按前序遍历展开，
// 保证父主题先于子主题出现；折叠的分支也保留在序列里，演示时逐页聚焦。
import type { MindMapDocument } from '../../types/mindmap';

export function presentationSequence(doc: MindMapDocument, startId?: string | null): string[] {
  const start = startId && doc.nodes[startId] ? startId : doc.rootId;
  const out: string[] = [];
  const stack = [start];
  while (stack.length) {
    const id = stack.pop()!;
    if (!doc.nodes[id]) continue;
    out.push(id);
    const children = doc.nodes[id].children;
    for (let i = children.length - 1; i >= 0; i -= 1) stack.push(children[i]);
  }
  return out;
}
