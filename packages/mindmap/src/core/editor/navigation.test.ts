// 方向键导航纯函数测试
import { describe, expect, it } from 'vitest';
import type { MindMapDocument, MindMapNode } from '../../types/mindmap';
import { addChild, createDocument, updateMetadata } from './nodeOps';
import { branchSide, growthAxis, isChildDirection, isVisible, navigate } from './navigation';
import { LAYOUT_PRESETS } from '../layout/presets';
import { getStructure } from '../layout/structures';
import { DEFAULT_CANVAS_OPTIONS } from '../style/canvasOptions';

function byText(doc: MindMapDocument, text: string): string {
  const node = Object.values(doc.nodes).find((n) => n.text === text);
  if (!node) throw new Error(`node ${text} not found`);
  return node.id;
}

/** 右侧分支 A、C,左侧分支 B;A 子 A1、A2,B 子 B1。数组序 [A, B, C] 即视觉自上而下混排 */
function sampleDoc(): MindMapDocument {
  let doc = createDocument();
  doc = addChild(doc, doc.rootId, 'A');
  doc = addChild(doc, doc.rootId, 'B');
  doc = updateMetadata(doc, byText(doc, 'B'), { side: 'left' });
  doc = addChild(doc, doc.rootId, 'C');
  doc = addChild(doc, byText(doc, 'A'), 'A1');
  doc = addChild(doc, byText(doc, 'A'), 'A2');
  doc = addChild(doc, byText(doc, 'B'), 'B1');
  return doc;
}

/** 旧文档：一级分支均未持久化 side（该功能上线前创建），分侧全靠布局规则推断 */
function legacyDoc(): MindMapDocument {
  const base = createDocument();
  const mk = (id: string, text: string): MindMapNode => ({
    id,
    parentId: base.rootId,
    children: [],
    text,
  });
  const a = mk('a', 'R1');
  const b = mk('b', 'R2');
  const c = mk('c', 'R3');
  return {
    ...base,
    nodes: {
      [base.rootId]: { ...base.nodes[base.rootId], children: [a.id, b.id, c.id] },
      [a.id]: a,
      [b.id]: b,
      [c.id]: c,
    },
  };
}

describe('branchSide', () => {
  it('深层节点继承一级分支的侧向', () => {
    const doc = sampleDoc();
    expect(branchSide(doc, byText(doc, 'A1'))).toBe('right');
    expect(branchSide(doc, byText(doc, 'B1'))).toBe('left');
  });

  it('logic 布局全部视为右侧', () => {
    const doc = { ...sampleDoc(), layout: 'logic' as const };
    expect(branchSide(doc, byText(doc, 'B1'))).toBe('right');
  });

  it('map-right-curve 全部视为右侧（忽略 balanced 与 side）', () => {
    const doc = {
      ...sampleDoc(),
      layout: 'map-right-curve',
      canvasOptions: { ...DEFAULT_CANVAS_OPTIONS, balanced: true },
    };
    expect(branchSide(doc, byText(doc, 'B1'))).toBe('right');
  });
});

describe('isVisible', () => {
  it('折叠祖先下的节点不可见', () => {
    let doc = sampleDoc();
    doc = updateMetadata(doc, byText(doc, 'A'), { collapsed: true });
    expect(isVisible(doc, byText(doc, 'A'))).toBe(true);
    expect(isVisible(doc, byText(doc, 'A1'))).toBe(false);
    expect(isVisible(doc, byText(doc, 'B1'))).toBe(true);
  });
});

describe('navigate (mindmap)', () => {
  const doc = sampleDoc();

  it('根节点左右进入对应侧一级分支', () => {
    expect(navigate(doc, doc.rootId, 'right')).toBe(byText(doc, 'A'));
    expect(navigate(doc, doc.rootId, 'left')).toBe(byText(doc, 'B'));
    expect(navigate(doc, doc.rootId, 'up')).toBeNull();
    expect(navigate(doc, doc.rootId, 'down')).toBeNull();
  });

  it('↑↓ 只在同侧区域内循环，不跨到另一侧', () => {
    const a = byText(doc, 'A');
    const b = byText(doc, 'B');
    const c = byText(doc, 'C');
    // 右侧 [A, C]：A ↓ 到 C（跳过中间的左侧 B），C ↓ 循环回 A
    expect(navigate(doc, a, 'down')).toBe(c);
    expect(navigate(doc, c, 'down')).toBe(a);
    expect(navigate(doc, c, 'up')).toBe(a);
    // 左侧只有 B：上下不动
    expect(navigate(doc, b, 'down')).toBeNull();
    expect(navigate(doc, b, 'up')).toBeNull();
  });

  it('深层节点（无分侧）↑↓ 在同级间循环', () => {
    const a1 = byText(doc, 'A1');
    const a2 = byText(doc, 'A2');
    expect(navigate(doc, a1, 'down')).toBe(a2);
    // 末尾向下循环回第一个
    expect(navigate(doc, a2, 'down')).toBe(a1);
  });

  it('旧文档未标注 side：按布局平衡规则推断分侧，↑↓ 仍不跨区', () => {
    // 布局推断：R1 右、R2 左、R3 右（少的一侧、平局靠右）
    const doc2 = legacyDoc();
    expect(branchSide(doc2, 'a')).toBe('right');
    expect(branchSide(doc2, 'b')).toBe('left');
    expect(branchSide(doc2, 'c')).toBe('right');
    // 用户反馈场景：R1 ↓ 应回 R3（跳过左侧的 R2），而不是跨到 R2
    expect(navigate(doc2, 'a', 'down')).toBe('c');
    expect(navigate(doc2, 'c', 'up')).toBe('a');
    // 根节点左右分别进入推断出的右/左侧分支
    expect(navigate(doc2, doc2.rootId, 'right')).toBe('a');
    expect(navigate(doc2, doc2.rootId, 'left')).toBe('b');
    // R2 左侧独支：上下不动
    expect(navigate(doc2, 'b', 'down')).toBeNull();
  });

  it('右侧分支：→ 进首子级、← 回父级', () => {
    const a = byText(doc, 'A');
    expect(navigate(doc, a, 'right')).toBe(byText(doc, 'A1'));
    expect(navigate(doc, byText(doc, 'A2'), 'left')).toBe(a);
  });

  it('左侧分支：← 进首子级、→ 回父级', () => {
    const b = byText(doc, 'B');
    expect(navigate(doc, b, 'left')).toBe(byText(doc, 'B1'));
    expect(navigate(doc, byText(doc, 'B1'), 'right')).toBe(b);
  });

  it('无子节点时向子级方向返回 null', () => {
    expect(navigate(doc, byText(doc, 'A1'), 'right')).toBeNull();
  });

  it('折叠节点上的向子级方向返回 null（由 store 先展开）', () => {
    let collapsed = sampleDoc();
    collapsed = updateMetadata(collapsed, byText(collapsed, 'A'), { collapsed: true });
    expect(navigate(collapsed, byText(collapsed, 'A'), 'right')).toBeNull();
    expect(isChildDirection(collapsed, byText(collapsed, 'A'), 'right')).toBe(true);
  });
});

describe('navigate (logic)', () => {
  it('所有分支视为右侧：← 回父级、→ 进子级', () => {
    const doc = { ...sampleDoc(), layout: 'logic' as const };
    const b = byText(doc, 'B');
    expect(navigate(doc, b, 'left')).toBe(doc.rootId);
    expect(navigate(doc, b, 'right')).toBe(byText(doc, 'B1'));
    // 根左侧无分支
    expect(navigate(doc, doc.rootId, 'left')).toBeNull();
  });
});

describe('navigate (tree)', () => {
  const doc = { ...sampleDoc(), layout: 'tree' as const };

  it('↓ 进首个子级、↑ 回父级', () => {
    expect(navigate(doc, doc.rootId, 'down')).toBe(byText(doc, 'A'));
    expect(navigate(doc, byText(doc, 'A1'), 'up')).toBe(byText(doc, 'A'));
    expect(navigate(doc, doc.rootId, 'up')).toBeNull();
  });

  it('←→ 在同级间左右循环', () => {
    const a1 = byText(doc, 'A1');
    const a2 = byText(doc, 'A2');
    expect(navigate(doc, a1, 'right')).toBe(a2);
    expect(navigate(doc, a2, 'right')).toBe(a1);
    expect(navigate(doc, a2, 'left')).toBe(a1);
  });

  it('isChildDirection 只认 ↓', () => {
    expect(isChildDirection(doc, doc.rootId, 'down')).toBe(true);
    expect(isChildDirection(doc, doc.rootId, 'left')).toBe(false);
  });
});

describe('navigate (preset ids)', () => {
  it('map-right-curve：根 ← 无目标，B 视为右侧分支', () => {
    const doc = { ...sampleDoc(), layout: 'map-right-curve' };
    const b = byText(doc, 'B');
    expect(navigate(doc, doc.rootId, 'left')).toBeNull();
    expect(navigate(doc, b, 'left')).toBe(doc.rootId);
    expect(navigate(doc, b, 'right')).toBe(byText(doc, 'B1'));
  });

  it('org-down-rounded 与 tree 导航一致：↓ 进子级', () => {
    const doc = { ...sampleDoc(), layout: 'org-down-rounded' };
    expect(navigate(doc, doc.rootId, 'down')).toBe(byText(doc, 'A'));
    expect(isChildDirection(doc, doc.rootId, 'down')).toBe(true);
  });

  it('tree-right-1：→ 进子级、← 回父级（非 org-down）', () => {
    const doc = { ...sampleDoc(), layout: 'tree-right-1' };
    const a = byText(doc, 'A');
    expect(navigate(doc, a, 'right')).toBe(byText(doc, 'A1'));
    expect(navigate(doc, byText(doc, 'A1'), 'left')).toBe(a);
    expect(isChildDirection(doc, a, 'right')).toBe(true);
    expect(isChildDirection(doc, a, 'down')).toBe(false);
    expect(navigate(doc, doc.rootId, 'down')).toBeNull();
  });

  it('brace-solid：→ 进子级、← 回父级（非 org-down）', () => {
    const doc = { ...sampleDoc(), layout: 'brace-solid' };
    const a = byText(doc, 'A');
    expect(branchSide(doc, byText(doc, 'B1'))).toBe('right');
    expect(navigate(doc, a, 'right')).toBe(byText(doc, 'A1'));
    expect(navigate(doc, byText(doc, 'A1'), 'left')).toBe(a);
    expect(isChildDirection(doc, a, 'right')).toBe(true);
    expect(isChildDirection(doc, a, 'down')).toBe(false);
    expect(navigate(doc, doc.rootId, 'down')).toBeNull();
  });

  it('timeline-h-rect：→ 进子级、← 回父级', () => {
    const doc = { ...sampleDoc(), layout: 'timeline-h-rect' };
    const a = byText(doc, 'A');
    expect(navigate(doc, a, 'right')).toBe(byText(doc, 'A1'));
    expect(navigate(doc, byText(doc, 'A1'), 'left')).toBe(a);
    expect(isChildDirection(doc, a, 'right')).toBe(true);
    expect(isChildDirection(doc, a, 'down')).toBe(false);
    expect(navigate(doc, doc.rootId, 'right')).toBe(a);
    expect(navigate(doc, doc.rootId, 'down')).toBeNull();
  });

  it('timeline-v-alt：↓ 进子级、↑ 回父级', () => {
    const doc = { ...sampleDoc(), layout: 'timeline-v-alt' };
    const a = byText(doc, 'A');
    expect(navigate(doc, doc.rootId, 'down')).toBe(a);
    expect(navigate(doc, a, 'down')).toBe(byText(doc, 'A1'));
    expect(navigate(doc, byText(doc, 'A1'), 'up')).toBe(a);
    expect(isChildDirection(doc, a, 'down')).toBe(true);
    expect(isChildDirection(doc, a, 'right')).toBe(false);
    expect(navigate(doc, a, 'right')).toBe(byText(doc, 'B'));
  });

  it('fishbone-1：→ 进子级、← 回父级', () => {
    const doc = { ...sampleDoc(), layout: 'fishbone-1' };
    const a = byText(doc, 'A');
    expect(navigate(doc, a, 'right')).toBe(byText(doc, 'A1'));
    expect(navigate(doc, byText(doc, 'A1'), 'left')).toBe(a);
    expect(isChildDirection(doc, a, 'right')).toBe(true);
    expect(isChildDirection(doc, a, 'down')).toBe(false);
    expect(navigate(doc, doc.rootId, 'right')).toBe(a);
    expect(navigate(doc, doc.rootId, 'down')).toBeNull();
    expect(branchSide(doc, byText(doc, 'B1'))).toBe('right');
  });

  it('matrix-2x2-1：→ 进子级、← 回父级（含左象限，子树 logic-right）', () => {
    const doc = { ...sampleDoc(), layout: 'matrix-2x2-1' };
    const a = byText(doc, 'A');
    const b = byText(doc, 'B');
    expect(navigate(doc, a, 'right')).toBe(byText(doc, 'A1'));
    expect(navigate(doc, byText(doc, 'A1'), 'left')).toBe(a);
    expect(isChildDirection(doc, a, 'right')).toBe(true);
    expect(isChildDirection(doc, a, 'down')).toBe(false);
    expect(navigate(doc, b, 'right')).toBe(byText(doc, 'B1'));
    expect(navigate(doc, b, 'left')).toBe(doc.rootId);
    expect(branchSide(doc, byText(doc, 'B1'))).toBe('right');
    expect(navigate(doc, doc.rootId, 'right')).toBe(a);
    expect(navigate(doc, doc.rootId, 'down')).toBeNull();
  });

  it('全预设主生长方向与向子级键一致', () => {
    const base = sampleDoc();
    for (const p of LAYOUT_PRESETS) {
      const doc = { ...base, layout: p.id };
      const axis = growthAxis(getStructure(doc));
      const a = byText(doc, 'A');
      if (axis === 'down') {
        expect(isChildDirection(doc, a, 'down'), p.id).toBe(true);
        expect(isChildDirection(doc, a, 'right'), p.id).toBe(false);
      } else {
        expect(isChildDirection(doc, a, 'right'), p.id).toBe(true);
        expect(isChildDirection(doc, a, 'down'), p.id).toBe(false);
      }
    }
  });
});
