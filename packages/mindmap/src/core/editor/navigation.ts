// 方向键导航纯函数：对齐 XMind 的节点切换习惯
// ↑/↓ 同级上下循环；←/→ 按分支生长方向进入子级 / 回到父级；根节点左右进入对应侧一级分支
import type { LayoutStructureId, MindMapDocument } from '../../types/mindmap';
import { getCanvasOptions } from '../style/canvasOptions';
import { getStructure } from '../layout/structures';

export type NavDir = 'up' | 'down' | 'left' | 'right';

/** 主生长方向：balanced 左右分侧；right/left/up/down 整树沿该方向进子级 */
export type GrowthAxis = 'balanced' | 'right' | 'left' | 'down' | 'up';

const STRUCTURE_GROWTH: Record<LayoutStructureId, GrowthAxis> = {
  'map-balanced': 'balanced',
  'map-right': 'right',
  'map-left': 'left',
  'map-down': 'down',
  'map-up': 'up',
  'map-radial': 'balanced',
  'logic-right': 'right',
  'logic-left': 'left',
  'logic-down': 'down',
  'logic-up': 'up',
  'logic-balanced': 'balanced',
  'logic-outline': 'down',
  'brace-right': 'right',
  'brace-left': 'left',
  'brace-balanced': 'balanced',
  'brace-down': 'down',
  'brace-up': 'up',
  'brace-outline': 'down',
  'org-down': 'down',
  'org-up': 'up',
  'org-right': 'right',
  'org-left': 'left',
  'org-balanced': 'balanced',
  'org-radial': 'right',
  'org-classic': 'down',
  'tree-right': 'right',
  'tree-left': 'left',
  'tree-down': 'down',
  'tree-up': 'up',
  'tree-balanced': 'balanced',
  'tree-radial': 'right',
  'tree-wbs': 'down',
  'timeline-h': 'right',
  'timeline-h-top': 'right',
  'timeline-h-bottom': 'right',
  'timeline-v': 'down',
  'timeline-v-left': 'down',
  'timeline-v-right': 'down',
  'fishbone-rl': 'left',
  'fishbone-lr': 'right',
  'fishbone-bt': 'up',
  'fishbone-tb': 'down',
  'fishbone-6m': 'left',
  'fishbone-6m-effect': 'left',
  'fishbone-comb': 'left',
  'matrix-2x2': 'right',
  'matrix-2x3': 'right',
  'matrix-3x2': 'right',
  'matrix-3x3': 'right',
  'matrix-1x2': 'right',
  'matrix-1x3': 'right',
};

export function growthAxis(structure: LayoutStructureId): GrowthAxis {
  return STRUCTURE_GROWTH[structure];
}

function isAllRightStructure(structure: LayoutStructureId): boolean {
  return growthAxis(structure) === 'right';
}

function isAllLeftStructure(structure: LayoutStructureId): boolean {
  return growthAxis(structure) === 'left';
}

function usesBalancedSides(structure: LayoutStructureId): boolean {
  return growthAxis(structure) === 'balanced';
}

function growsDown(structure: LayoutStructureId): boolean {
  return growthAxis(structure) === 'down';
}

function growsUp(structure: LayoutStructureId): boolean {
  return growthAxis(structure) === 'up';
}

function growsLeft(structure: LayoutStructureId): boolean {
  return growthAxis(structure) === 'left';
}

/** 节点所在一级分支的生长侧：一级分支看 metadata.side（缺省右），深层继承；logic / map-right 全在右侧 */
export function branchSide(doc: MindMapDocument, id: string): 'left' | 'right' {
  const structure = getStructure(doc);
  if (isAllRightStructure(structure)) return 'right';
  if (isAllLeftStructure(structure)) return 'left';
  if (usesBalancedSides(structure) && !getCanvasOptions(doc).balanced) return 'right';
  let cur = doc.nodes[id];
  while (cur && cur.parentId !== null && cur.parentId !== doc.rootId) {
    cur = doc.nodes[cur.parentId];
  }
  if (!cur) return 'right';
  if (cur.parentId === doc.rootId) {
    // 一级分支：优先持久化归属；未标注的（旧文档）复刻布局 splitRootSides 的
    // 「少的一侧、平局靠右」就地归属，保证导航分侧与画面一致
    return cur.metadata?.side ?? inferRootSide(doc, cur.id);
  }
  return cur.metadata?.side ?? 'right';
}

/** 按布局 splitRootSides 的同一规则推断未标注一级分支的侧向 */
function inferRootSide(doc: MindMapDocument, id: string): 'left' | 'right' {
  let left = 0;
  let right = 0;
  for (const k of doc.nodes[doc.rootId].children) {
    const s = doc.nodes[k].metadata?.side;
    const side: 'left' | 'right' =
      s === 'left' ? 'left' : s === 'right' ? 'right' : right <= left ? 'right' : 'left';
    if (side === 'left') left += 1;
    else right += 1;
    if (k === id) return side;
  }
  return 'right';
}

/** 节点是否可见（所有祖先都未折叠） */
export function isVisible(doc: MindMapDocument, id: string): boolean {
  let cur = doc.nodes[id];
  while (cur?.parentId) {
    const parent = doc.nodes[cur.parentId];
    if (!parent) break;
    if (parent.metadata?.collapsed) return false;
    cur = parent;
  }
  return Boolean(cur);
}

/**
 * 循环取同级中的上/下一个（同级按文档顺序纵向排布，数组序即视觉序）。
 * 根的一级分支按左右分属两个区域：↑/↓ 只在同侧内循环，跨区只能靠 ←/→（对齐 XMind）。
 */
function sibling(doc: MindMapDocument, id: string, dir: 'up' | 'down'): string | null {
  const node = doc.nodes[id];
  if (!node.parentId) return null;
  const parent = doc.nodes[node.parentId];
  let list = parent.children;
  const structure = getStructure(doc);
  if (parent.id === doc.rootId && usesBalancedSides(structure) && getCanvasOptions(doc).balanced) {
    const side = branchSide(doc, id);
    list = list.filter((k) => branchSide(doc, k) === side);
  }
  if (list.length < 2) return null;
  const idx = list.indexOf(id);
  if (idx < 0) return null;
  const step = dir === 'down' ? 1 : -1;
  return list[(idx + step + list.length) % list.length];
}

/** 进入首个（可见）子节点；没有子节点或全部被折叠时返回 null */
function firstChild(doc: MindMapDocument, id: string): string | null {
  return doc.nodes[id].children.find((k) => isVisible(doc, k)) ?? null;
}

/**
 * 方向键导航：返回目标节点 id，无目标时返回 null。
 * - mindmap / logic：↑/↓ 同级循环（mindmap 根的一级分支只在同侧内循环）；←/→ 沿生长方向进子级、
 *   逆方向回父级；根的 ←/→ 进入对应侧一级分支
 * - org-down / timeline-v（纵向）：↑ 回父级、↓ 进首个子级、←/→ 同级左右循环
 */
export function navigate(doc: MindMapDocument, fromId: string, dir: NavDir): string | null {
  const from = doc.nodes[fromId];
  if (!from) return null;

  const structure = getStructure(doc);
  if (growsDown(structure)) {
    if (dir === 'up') return from.parentId;
    if (dir === 'down') return firstChild(doc, fromId);
    return sibling(doc, fromId, dir === 'right' ? 'down' : 'up');
  }
  if (growsUp(structure)) {
    if (dir === 'down') return from.parentId;
    if (dir === 'up') return firstChild(doc, fromId);
    return sibling(doc, fromId, dir === 'right' ? 'down' : 'up');
  }
  if (growsLeft(structure)) {
    if (dir === 'right') return from.parentId;
    if (dir === 'left') return firstChild(doc, fromId);
    return sibling(doc, fromId, dir);
  }

  // 根节点：左右分别进入右侧 / 左侧的一级分支（branchSide 已按布局归一化侧向），上下无同级
  if (fromId === doc.rootId) {
    if (dir === 'up' || dir === 'down') return null;
    const want = dir === 'left' ? 'left' : 'right';
    return from.children.find((k) => isVisible(doc, k) && branchSide(doc, k) === want) ?? null;
  }

  const childDir = branchSide(doc, fromId) === 'left' ? 'left' : 'right';
  if (dir === childDir) return firstChild(doc, fromId);
  if (dir === 'up' || dir === 'down') return sibling(doc, fromId, dir);
  return from.parentId;
}

/** 该方向键是否指向「子级」方向（折叠节点上应先展开再进入，供 store 使用） */
export function isChildDirection(doc: MindMapDocument, id: string, dir: NavDir): boolean {
  if (!doc.nodes[id]) return false;
  const structure = getStructure(doc);
  if (growsDown(structure)) return dir === 'down';
  if (growsUp(structure)) return dir === 'up';
  if (growsLeft(structure)) return dir === 'left';
  if (id === doc.rootId) return dir === 'left' || dir === 'right';
  return dir === (branchSide(doc, id) === 'left' ? 'left' : 'right');
}
