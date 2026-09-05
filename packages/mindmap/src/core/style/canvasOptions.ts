import type { CanvasOptions, MindMapDocument } from '../../types/mindmap';

/** 画布默认背景：对齐 XMind，与配色方案解耦，切换主题不改此值 */
export const DEFAULT_CANVAS_BACKGROUND = '#FFFFFF';

export const DEFAULT_CANVAS_OPTIONS: CanvasOptions = {
  balanced: true,
  compact: false,
  unifySiblingWidth: false,
  rainbowBranches: true,
  flowAnimation: true,
};

export function getCanvasOptions(doc: MindMapDocument): CanvasOptions {
  return { ...DEFAULT_CANVAS_OPTIONS, ...doc.canvasOptions };
}

/** 有效画布背景：仅尊重用户设置的 background，否则固定白底（不用主题 background） */
export function getCanvasBackground(doc: MindMapDocument): string {
  return getCanvasOptions(doc).background ?? DEFAULT_CANVAS_BACKGROUND;
}

/** 比较有效画布选项是否一致（含可选字段） */
export function canvasOptionsEqual(a: CanvasOptions, b: CanvasOptions): boolean {
  return (
    a.balanced === b.balanced &&
    a.compact === b.compact &&
    a.unifySiblingWidth === b.unifySiblingWidth &&
    a.rainbowBranches === b.rainbowBranches &&
    a.flowAnimation === b.flowAnimation &&
    a.background === b.background &&
    a.fontFamily === b.fontFamily &&
    a.branchLineWidth === b.branchLineWidth
  );
}

export function updateCanvasOptions(
  doc: MindMapDocument,
  patch: Partial<CanvasOptions>,
): MindMapDocument {
  if (Object.keys(patch).length === 0) return doc;
  const current = getCanvasOptions(doc);
  const merged = { ...current, ...patch };
  if (canvasOptionsEqual(current, merged)) return doc;
  return { ...doc, canvasOptions: merged, updatedAt: Date.now() };
}
