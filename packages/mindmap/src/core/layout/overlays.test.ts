// 覆盖层几何纯函数测试
import { describe, expect, it } from 'vitest';
import {
  boundaryBox,
  boundaryCoverageBoxes,
  computeSummaryOverlays,
  quadPoints,
  relationPath,
  summaryAnchor,
  summaryBracket,
  summaryInputs,
  summaryPlacement,
} from './overlays';
import type { Box, MindMapNode } from '../../types/mindmap';

const boxA: Box = { x: 0, y: 0, width: 100, height: 40 }; // 中心 (0,0)
const boxB: Box = { x: 300, y: 100, width: 100, height: 40 };

// 概要用轴对齐夹具（同级节点在真实布局中要么纵向堆叠、要么横向并排）
const boxBelow: Box = { x: 0, y: 100, width: 100, height: 40 }; // 纵向堆叠：rect y -20..120，高 140
const boxRight: Box = { x: 300, y: 0, width: 100, height: 40 }; // 横向并排：rect x -50..350，宽 400

describe('boundaryCoverageBoxes', () => {
  // parent → child(可见) → grandchild(可见)；child2(折叠，自身可见)；ghost(已删除)
  const nodes: Record<string, MindMapNode> = {
    parent: { id: 'parent', parentId: null, children: ['child', 'child2', 'ghost'], text: 'p' },
    child: { id: 'child', parentId: 'parent', children: ['grandchild'], text: 'c' },
    grandchild: { id: 'grandchild', parentId: 'child', children: [], text: 'g' },
    child2: { id: 'child2', parentId: 'parent', children: ['hidden'], text: 'c2' },
    hidden: { id: 'hidden', parentId: 'child2', children: [], text: 'h' },
    ghost: { id: 'ghost', parentId: 'parent', children: [], text: 'x' },
  };
  const positions: Record<string, Box> = {
    parent: boxA,
    child: boxB,
    grandchild: { x: 600, y: 50, width: 80, height: 30 },
    child2: { x: 500, y: 200, width: 90, height: 30 },
  };

  it('包含成员及其全部可见后代，排除折叠与已删除节点', () => {
    const boxes = boundaryCoverageBoxes(nodes, positions, ['parent']);
    // parent、child、grandchild、child2 命中；hidden（折叠后代）与 ghost（已删除）排除
    expect(boxes).toHaveLength(4);
    expect(boxes).toContainEqual(boxA);
    expect(boxes).toContainEqual(boxB);
    expect(boxes).toContainEqual(positions.grandchild);
    expect(boxes).toContainEqual(positions.child2); // child2 自身可见，计入
  });

  it('折叠成员的整个子树不参与外框', () => {
    // child 不在 positions（模拟折叠）→ 其自身与后代都不计入
    const boxes = boundaryCoverageBoxes(nodes, { parent: boxA, child2: positions.child2 }, ['parent']);
    expect(boxes).toHaveLength(2);
  });

  it('成员全部不可见时返回空数组', () => {
    expect(boundaryCoverageBoxes(nodes, {}, ['child', 'child2'])).toEqual([]);
  });

  it('未知成员 id 被忽略', () => {
    expect(boundaryCoverageBoxes(nodes, positions, ['nope'])).toEqual([]);
  });
});

describe('boundaryBox', () => {
  it('取成员包围盒并外扩 padding', () => {
    const r = boundaryBox([boxA, boxB], 16);
    // y 方向并集区间为 [-20, 120]（boxA 上缘 -20，boxB 下缘 120），高度 140
    expect(r).toEqual({ x: -50 - 16, y: -20 - 16, width: 400 + 32, height: 140 + 32 });
  });

  it('空数组返回 null', () => {
    expect(boundaryBox([], 16)).toBeNull();
  });
});

describe('relationPath', () => {
  it('从源盒边缘到目标盒边缘生成曲线', () => {
    const p = relationPath(boxA, boxB);
    // 中心连线与盒边缘的交点：A 侧 s=50/300，得 (50, 100/6)；B 侧对称得 (250, 100-100/6)
    expect(p.start.x).toBeCloseTo(50);
    expect(p.start.y).toBeCloseTo(100 / 6);
    expect(p.end.x).toBeCloseTo(250);
    expect(p.end.y).toBeCloseTo(100 - 100 / 6);
    expect(p.d).toContain('M');
    expect(p.d).toContain('Q');
  });

  it('labelPosition 位于弦中点', () => {
    const p = relationPath(boxA, boxB);
    // 渲染实际用两点直线，标签与画线同源取弦中点，允许 25px 容差
    expect(Math.abs(p.labelPosition.x - (50 + 250) / 2)).toBeLessThan(25);
  });

  it('control 是弦中点沿法线偏移的曲线控制点', () => {
    const p = relationPath(boxA, boxB);
    // 控制点不在弦上（有弧度），且朝向与弦垂直方向偏移
    const chordDy = p.end.y - p.start.y;
    const toCtrlDy = p.control.y - (p.start.y + p.end.y) / 2;
    expect(toCtrlDy).not.toBe(0);
    // 偏移方向为法向：|控制点相对中点的位移| 与弦方向不平行由 offset 定义保证，这里验证量级有限
    expect(Math.hypot(p.control.x - p.labelPosition.x, toCtrlDy)).toBeLessThanOrEqual(40);
    expect(chordDy).toBeGreaterThan(0);
  });

  it('quadPoints 采样过起终点、中段靠近控制点', () => {
    const pts = quadPoints({ x: 0, y: 0 }, { x: 50, y: 100 }, { x: 100, y: 0 });
    expect(pts[0]).toBe(0);
    expect(pts[1]).toBe(0);
    expect(pts[pts.length - 2]).toBe(100);
    expect(pts[pts.length - 1]).toBe(0);
    // t=0.5：x=50, y=50（弦中点 y=0，采样点被控制点拉向 100）
    const mid = Math.floor(pts.length / 4); // 25 个点，中点索引 12
    expect(pts[mid * 2]).toBeCloseTo(50);
    expect(pts[mid * 2 + 1]).toBeCloseTo(50);
  });
});

describe('summaryPlacement', () => {
  // 纵向堆叠夹具：rect x -50..50, y -20..120，中心 (0, 50)
  it('纵向堆叠成员永远朝左右外侧：父在左 → right，父在右 → left', () => {
    expect(summaryPlacement([boxA, boxBelow], { x: -300, y: 50, width: 80, height: 40 })?.side).toBe('right');
    expect(summaryPlacement([boxA, boxBelow], { x: 300, y: 50, width: 80, height: 40 })?.side).toBe('left');
  });

  it('父在斜上方仍朝右（深层列表不再翻成朝上/朝下）', () => {
    // 父点纵距远大于横距，但成员纵向堆叠 → 朝向只看左右
    expect(summaryPlacement([boxA, boxBelow], { x: -300, y: -400, width: 80, height: 40 })?.side).toBe('right');
  });

  it('横向并排成员朝上下外侧：父在上 → bottom，父在下 → top', () => {
    expect(summaryPlacement([boxA, boxRight], { x: 150, y: -300, width: 80, height: 40 })?.side).toBe('bottom');
    expect(summaryPlacement([boxA, boxRight], { x: 150, y: 400, width: 80, height: 40 })?.side).toBe('top');
  });

  it('单成员按父点相对位移主轴判定（横向优先）', () => {
    expect(summaryPlacement([boxA], { x: -200, y: -150, width: 80, height: 40 })?.side).toBe('right');
    expect(summaryPlacement([boxA], { x: 0, y: -200, width: 80, height: 40 })?.side).toBe('bottom');
  });

  it('空成员数组返回 null', () => {
    expect(summaryPlacement([], { x: 0, y: 0, width: 80, height: 40 })).toBeNull();
  });
});

describe('summaryAnchor', () => {
  // 纵向堆叠夹具：右缘 50、跨度 140 → 外凸 16.8 + 小刺 8；gap 24 → 锚点距右缘 48.8
  it('mindmap 布局下锚点在大括号外缘之外', () => {
    const parentBox: Box = { x: -300, y: 50, width: 80, height: 40 };
    const anchor = summaryAnchor([boxA, boxBelow], parentBox, 24);
    expect(anchor).not.toBeNull();
    expect(anchor!.x).toBeCloseTo(50 + 16.8 + 8 + 24); // 区间右缘 50 之外
    expect(anchor!.y).toBeCloseTo(50); // 垂直居中于区间
  });

  it('路径上的节点盒把锚点整体外推（不遮挡内容）', () => {
    const parentBox: Box = { x: -300, y: 50, width: 80, height: 40 };
    // 障碍盒在跨度内（y 30..70）且右缘 270 超出成员右缘 50
    const anchor = summaryAnchor([boxA, boxBelow], parentBox, 24, [{ x: 220, y: 50, width: 100, height: 40 }]);
    expect(anchor!.x).toBeCloseTo(270 + 16.8 + 8 + 24);
  });

  it('空成员数组返回 null', () => {
    const parentBox: Box = { x: -300, y: 50, width: 80, height: 40 };
    expect(summaryAnchor([], parentBox, 24)).toBeNull();
  });
});

describe('summaryBracket', () => {
  // 纵向堆叠夹具：x=-50..50, y=-20..120，右缘 50、下缘 120、高 140 → 外凸深度 16.8
  const parentLeft: Box = { x: -300, y: 50, width: 80, height: 40 };

  it('父在左时大括号沿右缘外凸，中尖最远且垂直居中', () => {
    const points = summaryBracket([boxA, boxBelow], parentLeft)!;
    const depth = 16.8;
    // 端部回钩：首点在右缘内侧（朝成员一侧），第二点贴右缘
    expect(points[0]).toBeCloseTo(50 - 6);
    expect(points[1]).toBeCloseTo(-20);
    expect(points[2]).toBeCloseTo(50);
    // 中尖：整个折线的最大 x，位于区间垂直中点
    const xs = points.filter((_, i) => i % 2 === 0);
    const maxIdx = xs.indexOf(Math.max(...xs));
    expect(xs[maxIdx]).toBeCloseTo(50 + depth + 8);
    expect(points[maxIdx * 2 + 1]).toBeCloseTo(50);
    // 收尾回钩落在下缘
    expect(points[points.length - 2]).toBeCloseTo(50 - 6);
    expect(points[points.length - 1]).toBeCloseTo(120);
  });

  it('路径上的节点盒把整个括号外推', () => {
    const points = summaryBracket([boxA, boxBelow], parentLeft, [{ x: 220, y: 50, width: 100, height: 40 }])!;
    expect(points[2]).toBeCloseTo(270); // 括号贴障碍右缘（首点为朝成员的回钩）
    const xs = points.filter((_, i) => i % 2 === 0);
    const maxIdx = xs.indexOf(Math.max(...xs));
    expect(xs[maxIdx]).toBeCloseTo(270 + 16.8 + 8);
  });

  it('横向并排成员父在上时大括号沿下缘外凸（树状图）', () => {
    const parentTop: Box = { x: 150, y: -300, width: 80, height: 40 };
    const points = summaryBracket([boxA, boxRight], parentTop)!;
    // 跨度取宽度 400 → 深度封顶 30；中尖 y = 20 + 30 + 8
    expect(points[0]).toBeCloseTo(-50);
    expect(points[1]).toBeCloseTo(20 - 6);
    const ys = points.filter((_, i) => i % 2 === 1);
    const maxIdx = ys.indexOf(Math.max(...ys));
    expect(ys[maxIdx]).toBeCloseTo(20 + 38);
    expect(points[maxIdx * 2]).toBeCloseTo(150);
  });

  it('父在右时大括号沿左缘外凸', () => {
    const parentRight: Box = { x: 300, y: 50, width: 80, height: 40 };
    const points = summaryBracket([boxA, boxBelow], parentRight)!;
    const xs = points.filter((_, i) => i % 2 === 0);
    const minIdx = xs.indexOf(Math.min(...xs));
    // 左缘 -50，中尖外凸 16.8 + 8
    expect(xs[minIdx]).toBeCloseTo(-50 - 16.8 - 8);
    expect(points[minIdx * 2 + 1]).toBeCloseTo(50);
    // 端部回钩在左缘内侧
    expect(points[0]).toBeCloseTo(-50 + 6);
  });

  it('父在下时大括号沿上缘外凸', () => {
    const parentBottom: Box = { x: 150, y: 400, width: 80, height: 40 };
    const points = summaryBracket([boxA, boxRight], parentBottom)!;
    const ys = points.filter((_, i) => i % 2 === 1);
    const minIdx = ys.indexOf(Math.min(...ys));
    // 上缘 -20，跨度取宽度 400 → 深度封顶 30，中尖再带 8 小刺
    expect(ys[minIdx]).toBeCloseTo(-20 - 38);
    expect(points[minIdx * 2]).toBeCloseTo(150);
  });

  it('空成员数组返回 null', () => {
    expect(summaryBracket([], parentLeft)).toBeNull();
  });
});

describe('computeSummaryOverlays', () => {
  const gap = 24;
  const size = { width: 96, height: 32 };

  it('外层概要避让路径上的内层概要，内层不受外层影响', () => {
    // 内层：更深的两个纵向堆叠成员，右缘 350；外层：右缘 50 的两个成员
    const inner = {
      id: 'inner',
      memberBoxes: [
        { x: 300, y: 0, width: 100, height: 40 },
        { x: 300, y: 100, width: 100, height: 40 },
      ],
      parentBox: { x: 0, y: 50, width: 80, height: 40 },
    };
    const outer = { id: 'outer', memberBoxes: [boxA, boxBelow], parentBox: { x: -300, y: 50, width: 80, height: 40 } };
    const overlays = computeSummaryOverlays([outer, inner], [], gap, size);
    // 内层无障碍：锚点 = 350 + 16.8 + 8 + 24
    expect(overlays.get('inner')!.anchor.x).toBeCloseTo(398.8);
    // 外层避让内层概要盒（右缘 398.8 + 48）后求解
    expect(overlays.get('outer')!.anchor.x).toBeCloseTo(398.8 + 48 + 16.8 + 8 + 24);
  });

  it('节点盒作为障碍外推锚点与括号', () => {
    const items = [{ id: 's', memberBoxes: [boxA, boxBelow], parentBox: { x: -300, y: 50, width: 80, height: 40 } }];
    const overlays = computeSummaryOverlays(items, [{ x: 220, y: 50, width: 100, height: 40 }], gap, size);
    const { anchor, bracketPoints } = overlays.get('s')!;
    expect(anchor.x).toBeCloseTo(270 + 16.8 + 8 + 24);
    expect(bracketPoints[2]).toBeCloseTo(270); // 括号贴障碍右缘（首点为朝成员的回钩）
    const xs = bracketPoints.filter((_, i) => i % 2 === 0);
    expect(xs[xs.indexOf(Math.max(...xs))]).toBeCloseTo(270 + 16.8 + 8);
  });

  it('summaryInputs 按区间切片成员并过滤失效引用', () => {
    const doc = {
      nodes: {
        p: { id: 'p', parentId: null, children: ['a', 'ghost', 'b'], text: 'p' },
        a: { id: 'a', parentId: 'p', children: [], text: 'a' },
        b: { id: 'b', parentId: 'p', children: [], text: 'b' },
      },
      summaries: [{ id: 's', parentId: 'p', range: [0, 2] as [number, number], text: '概要' }],
    };
    const positions: Record<string, Box> = { p: boxA, a: boxA, b: boxBelow };
    const items = summaryInputs(doc, positions);
    expect(items).toHaveLength(1);
    expect(items[0].memberBoxes).toEqual([boxA, boxBelow]); // ghost 无位置被过滤
  });
});
