import type { Box, DropPreview, MindMapDocument } from '../../types/mindmap';
import { subtreeIds } from './nodeOps';

/**
 * 根据落点在节点 Box 内的垂直位置，判定为 before / child / after 三区
 * 上 25% → before，下 25% → after，中间 → child
 */
export function hitZone(b: Box, p: { x: number; y: number }): 'before' | 'after' | 'child' {
  const top = b.y - b.height / 2;
  const rel = (p.y - top) / b.height;
  if (rel < 0.25) return 'before';
  if (rel > 0.75) return 'after';
  return 'child';
}

/**
 * 判定 id 是否位于 ancestorId 的子树中（含自身）
 */
export function isInSubtree(doc: MindMapDocument, ancestorId: string, id: string): boolean {
  return subtreeIds(doc, ancestorId).includes(id);
}

/**
 * 在给定落点位置查找目标节点及对应 zone
 * 规则：
 * - 命中自身或自身后代 → null（避免环）
 * - 命中根节点 → 只接受 child
 * - 命中其它节点 → 按 hitZone 判定
 */
export function findDropTarget(
  doc: MindMapDocument,
  positions: Record<string, Box>,
  dragId: string,
  p: { x: number; y: number },
): DropPreview | null {
  const dragSubtree = new Set(subtreeIds(doc, dragId));
  for (const [id, b] of Object.entries(positions)) {
    if (dragSubtree.has(id)) continue;
    const inside =
      p.x >= b.x - b.width / 2 &&
      p.x <= b.x + b.width / 2 &&
      p.y >= b.y - b.height / 2 &&
      p.y <= b.y + b.height / 2;
    if (!inside) continue;
    if (id === doc.rootId) return { targetId: id, zone: 'child' };
    return { targetId: id, zone: hitZone(b, p) };
  }
  return null;
}
