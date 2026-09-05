// 撤销/重做历史：快照式纯函数，不修改入参
import type { MindMapDocument } from '../../types/mindmap';

// 历史上限：避免内存无限增长
const CAP = 100;

export interface HistoryState {
  past: MindMapDocument[];
  future: MindMapDocument[];
}

export const emptyHistory: HistoryState = { past: [], future: [] };

export function canUndo(h: HistoryState): boolean {
  return h.past.length > 0;
}

export function canRedo(h: HistoryState): boolean {
  return h.future.length > 0;
}

// 记录新操作：把操作前的快照推入 past；任何新操作清空 redo 栈
export function record(h: HistoryState, snapshot: MindMapDocument): HistoryState {
  return { past: [...h.past.slice(-(CAP - 1)), snapshot], future: [] };
}

// 撤销：返回上一个快照，并把当前文档压入 future
export function undo(
  h: HistoryState,
  current: MindMapDocument,
): { state: HistoryState; doc: MindMapDocument } | null {
  const prev = h.past[h.past.length - 1];
  if (!prev) return null;
  return {
    state: { past: h.past.slice(0, -1), future: [current, ...h.future] },
    doc: prev,
  };
}

// 重做：从 future 取下一个快照，把当前文档压入 past
export function redo(
  h: HistoryState,
  current: MindMapDocument,
): { state: HistoryState; doc: MindMapDocument } | null {
  const [next, ...rest] = h.future;
  if (!next) return null;
  return {
    state: { past: [...h.past.slice(-(CAP - 1)), current], future: rest },
    doc: next,
  };
}
