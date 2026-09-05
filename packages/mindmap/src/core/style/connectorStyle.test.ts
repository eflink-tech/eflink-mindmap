import { describe, expect, it } from 'vitest';
import { addChild, createDocument, updateStyle } from '../editor/nodeOps';
import { applyLayoutPreset } from '../layout/applyPreset';
import { layoutDocument } from '../layout/engine';
import { DEFAULT_CANVAS_OPTIONS } from './canvasOptions';
import { getTheme } from './themes';
import {
  DEEP_CONNECTOR_COLOR,
  DEEP_CONNECTOR_WIDTH,
  bracePath,
  elbowPath,
  resolveConnectorAppearance,
  resolveConnectorStyle,
  roundedElbowPath,
  straightPath,
  diagonalPath,
  fishboneRibPath,
  connectorPathD,
  curvePath,
  inferConnectorDir,
  pathApproachPoint,
  pathEndpoint,
  preservesLayoutConnectorD,
  resolveRenderedConnectorD,
  handDrawnPath,
} from './connectorStyle';

describe('resolveConnectorStyle', () => {
  it('默认取 theme.connector 与 end=none', () => {
    const doc = createDocument();
    const theme = getTheme(doc);
    const s = resolveConnectorStyle(doc, doc.rootId, theme);
    expect(s.type).toBe(theme.connector.type);
    expect(s.width).toBe(theme.connector.width);
    expect(s.end).toBe('none');
    expect(s.color).toBeUndefined();
  });

  it('节点 connector* 覆盖主题与 canvas 线宽', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    const a = Object.values(doc.nodes).find((n) => n.text === 'A')!.id;
    doc = updateStyle(doc, a, {
      connectorType: 'elbow',
      connectorWidth: 3,
      connectorColor: '#112233',
      connectorEnd: 'arrow',
    });
    doc = { ...doc, canvasOptions: { ...DEFAULT_CANVAS_OPTIONS, ...doc.canvasOptions, branchLineWidth: 1 } };
    const s = resolveConnectorStyle(doc, a, getTheme(doc));
    expect(s.type).toBe('elbow');
    expect(s.width).toBe(3);
    expect(s.color).toBe('#112233');
    expect(s.end).toBe('arrow');
  });

  it('无节点线宽时用 canvasOptions.branchLineWidth，否则 theme', () => {
    let doc = createDocument();
    doc = { ...doc, canvasOptions: { balanced: true, compact: false, unifySiblingWidth: false, rainbowBranches: true, branchLineWidth: 2.5 } };
    expect(resolveConnectorStyle(doc, doc.rootId, getTheme(doc)).width).toBe(2.5);

    doc = { ...doc, canvasOptions: { balanced: true, compact: false, unifySiblingWidth: false, rainbowBranches: true } };
    expect(resolveConnectorStyle(doc, doc.rootId, getTheme(doc)).width).toBe(getTheme(doc).connector.width);
  });

  it('无节点 connectorType 时使用 layoutDefaults.connectorType', () => {
    const doc = applyLayoutPreset(createDocument(), 'brace-solid');
    const theme = getTheme(doc);
    expect(theme.connector.type).not.toBe('brace');
    expect(resolveConnectorStyle(doc, doc.rootId, theme).type).toBe('brace');
  });

  it('节点显式 connectorType 覆盖 layoutDefaults', () => {
    let doc = applyLayoutPreset(createDocument(), 'brace-solid');
    doc = updateStyle(doc, doc.rootId, { connectorType: 'curve' });
    expect(resolveConnectorStyle(doc, doc.rootId, getTheme(doc)).type).toBe('curve');
  });
});

describe('elbowPath / straightPath', () => {
  it('elbowPath 水平布局生成正交折线', () => {
    const d = elbowPath(
      { x: 0, y: 0, width: 40, height: 20 },
      { x: 100, y: 40, width: 40, height: 20 },
      'right',
    );
    expect(d.startsWith('M ')).toBe(true);
    expect(d.includes('L ')).toBe(true);
    // 右向：先水平到中点 x，再垂直，再水平到终点
    expect(d.split('L ').length).toBeGreaterThanOrEqual(2);
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    // 起点在 from 右缘
    expect(nums[0]).toBe(20);
    expect(nums[1]).toBe(0);
    // 终点在 to 左缘
    expect(nums[nums.length - 2]).toBe(80);
    expect(nums[nums.length - 1]).toBe(40);
  });

  it('elbowPath 向下为正交折线', () => {
    const d = elbowPath(
      { x: 0, y: 0, width: 40, height: 20 },
      { x: 30, y: 80, width: 40, height: 20 },
      'down',
    );
    expect(d.startsWith('M ')).toBe(true);
    expect(d.includes('L ')).toBe(true);
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(nums[0]).toBe(0);
    expect(nums[1]).toBe(10);
    expect(nums[nums.length - 2]).toBe(30);
    expect(nums[nums.length - 1]).toBe(70);
  });

  it('elbowPath 向上为正交折线（父顶缘 → 子底缘）', () => {
    const d = elbowPath(
      { x: 0, y: 0, width: 40, height: 20 },
      { x: 30, y: -80, width: 40, height: 20 },
      'up',
    );
    expect(d.startsWith('M ')).toBe(true);
    expect(d.includes('L ')).toBe(true);
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(nums[0]).toBe(0);
    expect(nums[1]).toBe(-10);
    expect(nums[nums.length - 2]).toBe(30);
    expect(nums[nums.length - 1]).toBe(-70);
    expect(nums[nums.length - 1]).toBeLessThan(nums[1]);
  });

  it('straightPath 为两点直线', () => {
    const d = straightPath(
      { x: 0, y: 0, width: 40, height: 20 },
      { x: 100, y: 40, width: 40, height: 20 },
      'right',
    );
    expect(d).toBe('M 20 0 L 80 40');
  });

  it('diagonalPath 为盒缘斜线', () => {
    const d = diagonalPath(
      { x: 0, y: 0, width: 40, height: 20 },
      { x: 100, y: 40, width: 40, height: 20 },
      'right',
    );
    expect(d).toBe('M 20 0 L 80 40');
    expect(d.includes('C ')).toBe(false);
  });

  it('fishboneRibPath 先沿脊再斜向子节点', () => {
    const d = fishboneRibPath(
      { x: 0, y: 0, width: 40, height: 20 },
      { x: 120, y: -50, width: 40, height: 20 },
    );
    expect(d.includes('L ')).toBe(true);
    expect(d.includes('C ')).toBe(false);
    const nums = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    expect(nums[0]).toBe(20);
    expect(nums[1]).toBe(0);
    expect(nums[nums.length - 2]).toBe(100);
    expect(nums[nums.length - 1]).toBe(-50);
    // 脊上转折点 y 与起点相同，x 介于起终点之间
    expect(nums[3]).toBe(0);
    expect(nums[2]).toBeGreaterThanOrEqual(20);
    expect(nums[2]).toBeLessThan(100);
  });

  it('connectorPathD 按 type 分发', () => {
    const from = { x: 0, y: 0, width: 40, height: 20 };
    const to = { x: 100, y: 40, width: 40, height: 20 };
    expect(connectorPathD(from, to, 'right', 'straight')).toBe(straightPath(from, to, 'right'));
    expect(connectorPathD(from, to, 'right', 'elbow')).toBe(elbowPath(from, to, 'right'));
    expect(connectorPathD(from, to, 'right', 'curve')).toContain('C ');
    expect(connectorPathD(from, to, 'right', 'brace')).toBe(bracePath(from, to, 'right'));
  });

  it('bracePath 为竖脊 + 水平臂，脊靠近子节点且异于 elbow 中点', () => {
    const from = { x: 0, y: 0, width: 40, height: 20 };
    const to = { x: 100, y: 40, width: 40, height: 20 };
    const d = bracePath(from, to, 'right');
    expect(d.includes('L ')).toBe(true);
    expect(d.includes('C ')).toBe(false);
    const nums = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    expect(nums[0]).toBe(20);
    expect(nums[1]).toBe(0);
    expect(nums[nums.length - 2]).toBe(80);
    expect(nums[nums.length - 1]).toBe(40);
    expect(nums[2]).toBe(nums[4]);
    const mid = (20 + 80) / 2;
    expect(nums[2]).toBeGreaterThan(mid);
    expect(d).not.toBe(elbowPath(from, to, 'right'));
  });

  it('inferConnectorDir 根据相对位置推断', () => {
    expect(inferConnectorDir({ x: 0, y: 0, width: 10, height: 10 }, { x: 50, y: 0, width: 10, height: 10 })).toBe('right');
    expect(inferConnectorDir({ x: 50, y: 0, width: 10, height: 10 }, { x: 0, y: 0, width: 10, height: 10 })).toBe('left');
    expect(inferConnectorDir({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 60, width: 10, height: 10 })).toBe('down');
    expect(inferConnectorDir({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: -60, width: 10, height: 10 })).toBe('up');
  });

  it('左侧分支 + 大纵向偏移时 infer 会误判 down，布局 dir=left 仍走水平 elbow', () => {
    // |dy| > |dx| 且 dy>0 → infer 返回 down（错误）；布局已知 left 应接左/右缘
    const from = { x: 0, y: 0, width: 40, height: 20 };
    const to = { x: -30, y: 80, width: 40, height: 20 };
    expect(inferConnectorDir(from, to)).toBe('down');
    const withLayoutDir = connectorPathD(from, to, 'left', 'elbow');
    const withInfer = connectorPathD(from, to, inferConnectorDir(from, to), 'elbow');
    expect(withLayoutDir).not.toBe(withInfer);
    // left：起点在 from 左缘，终点在 to 右缘
    const nums = withLayoutDir.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(nums[0]).toBe(-20);
    expect(nums[1]).toBe(0);
    expect(nums[nums.length - 2]).toBe(-10);
    expect(nums[nums.length - 1]).toBe(80);
  });
});

describe('resolveConnectorAppearance / roundedElbowPath', () => {
  // root → A → B → C 链；B→C 连到三级节点 C
  function chainDoc() {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    const a = Object.values(doc.nodes).find((n) => n.text === 'A')!.id;
    doc = addChild(doc, a, 'B');
    const b = Object.values(doc.nodes).find((n) => n.text === 'B')!.id;
    doc = addChild(doc, b, 'C');
    const c = Object.values(doc.nodes).find((n) => n.text === 'C')!.id;
    return { doc, a, b, c };
  }

  it('brace 类型不套用深层细灰折线', () => {
    const { doc, b, c } = chainDoc();
    const braced = applyLayoutPreset(doc, 'brace-solid');
    const s = resolveConnectorAppearance(braced, b, c, getTheme(braced));
    expect(s.type).toBe('brace');
    expect(s.deep).toBe(false);
  });

  it('fishbone 不套用深层细灰折线（保持斜骨）', () => {
    const { doc, b, c } = chainDoc();
    const bone = applyLayoutPreset(doc, 'fishbone-1');
    const s = resolveConnectorAppearance(bone, b, c, getTheme(bone));
    expect(s.deep).toBe(false);
    expect(s.type).not.toBe('elbow');
  });

  it('连接到三级及以下节点的连线走细灰圆角折线（对齐 XMind）', () => {
    const { doc, b, c, a } = chainDoc();
    const theme = getTheme(doc);
    const deep = resolveConnectorAppearance(doc, b, c, theme);
    expect(deep.deep).toBe(true);
    expect(deep.color).toBe(DEEP_CONNECTOR_COLOR);
    expect(deep.width).toBe(DEEP_CONNECTOR_WIDTH);
    expect(deep.end).toBe('none');
    // 二级连线不受影响
    expect(resolveConnectorAppearance(doc, a, b, theme).deep).toBe(false);
  });

  it('节点显式设置 connector* 时不套用深层默认样式', () => {
    const { doc, b, c } = chainDoc();
    const styled = updateStyle(doc, b, { connectorColor: '#112233' });
    const s = resolveConnectorAppearance(styled, b, c, getTheme(styled));
    expect(s.deep).toBe(false);
    expect(s.color).toBe('#112233');
  });

  it('roundedElbowPath 右向：两端在盒缘、拐角倒圆', () => {
    const d = roundedElbowPath(
      { x: 0, y: 0, width: 40, height: 20 },
      { x: 100, y: 40, width: 40, height: 20 },
      'right',
    );
    expect(d).toContain('Q ');
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(nums[0]).toBe(20); // from 右缘
    expect(nums[1]).toBe(0);
    expect(nums[nums.length - 2]).toBe(80); // to 左缘
    expect(nums[nums.length - 1]).toBe(40);
    // 竖直段落在两盒中点 x=50
    expect(d).toContain('50');
  });

  it('roundedElbowPath 左向镜像与向下变体同样倒圆', () => {
    const left = roundedElbowPath(
      { x: 0, y: 0, width: 40, height: 20 },
      { x: -100, y: 40, width: 40, height: 20 },
      'left',
    );
    const nums = left.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(nums[0]).toBe(-20);
    expect(nums[nums.length - 2]).toBe(-80);
    expect(left).toContain('Q ');

    const down = roundedElbowPath(
      { x: 0, y: 0, width: 40, height: 20 },
      { x: 30, y: 80, width: 40, height: 20 },
      'down',
    );
    expect(down).toContain('Q ');
    const dnums = down.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(dnums[0]).toBe(0);
    expect(dnums[1]).toBe(10);
    expect(dnums[dnums.length - 1]).toBe(70);

    const up = roundedElbowPath(
      { x: 0, y: 0, width: 40, height: 20 },
      { x: 30, y: -80, width: 40, height: 20 },
      'up',
    );
    expect(up).toContain('Q ');
    const unums = up.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(unums[0]).toBe(0);
    expect(unums[1]).toBe(-10);
    expect(unums[unums.length - 1]).toBe(-70);
    expect(unums[unums.length - 1]).toBeLessThan(unums[1]);
  });

  it('同一水平线（无纵向位移）退化为普通折线', () => {
    const d = roundedElbowPath(
      { x: 0, y: 0, width: 40, height: 20 },
      { x: 100, y: 0, width: 40, height: 20 },
      'right',
    );
    expect(d).not.toContain('Q ');
  });
});

describe('preservesLayoutConnectorD / resolveRenderedConnectorD', () => {
  const from = { x: 0, y: 0, width: 40, height: 20 };
  const to = { x: 120, y: -50, width: 40, height: 20 };
  const layoutD = fishboneRibPath(from, to);

  it('fishbone-right 保留布局预计算 d，非 curve 主题也不重建', () => {
    const doc = applyLayoutPreset(createDocument(), 'fishbone-1');
    expect(preservesLayoutConnectorD(doc)).toBe(true);
    const theme = getTheme(doc);
    const style = { ...resolveConnectorAppearance(doc, doc.rootId, 'x', theme), type: 'elbow' as const };
    const rebuilt = resolveRenderedConnectorD(doc, layoutD, from, to, 'right', style);
    expect(rebuilt).toBe(layoutD);
    expect(rebuilt).not.toBe(elbowPath(from, to, 'right'));
  });

  it('map-balanced 非 curve 时仍按主题重建', () => {
    const doc = createDocument();
    expect(preservesLayoutConnectorD(doc)).toBe(false);
    const theme = getTheme(doc);
    const style = { ...resolveConnectorAppearance(doc, doc.rootId, 'x', theme), type: 'elbow' as const, deep: false };
    const rebuilt = resolveRenderedConnectorD(doc, layoutD, from, to, 'right', style);
    expect(rebuilt).toBe(elbowPath(from, to, 'right'));
  });

  it('timeline-h 深度≥3 向上子节点 elbow/deep 仍向上', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    const a = Object.values(doc.nodes).find((n) => n.text === 'A')!.id;
    doc = addChild(doc, a, 'A1');
    const a1 = Object.values(doc.nodes).find((n) => n.text === 'A1')!.id;
    doc = addChild(doc, a1, 'A1a');
    const a1a = Object.values(doc.nodes).find((n) => n.text === 'A1a')!.id;
    doc = applyLayoutPreset(doc, 'timeline-h-rect');
    const theme = getTheme(doc);
    const { positions, connectors } = layoutDocument(doc, theme, (t) => t.length * 10);
    const fromBox = positions[a1];
    const toBox = positions[a1a];
    const conn = connectors.find((c) => c.from === a1 && c.to === a1a)!;
    expect(toBox.y).toBeLessThan(fromBox.y);
    expect(conn.dir).toBe('up');
    const style = resolveConnectorAppearance(doc, a1, a1a, theme);
    expect(style.deep).toBe(true);
    expect(style.type).toBe('elbow');
    const rebuilt = resolveRenderedConnectorD(doc, conn.d, fromBox, toBox, conn.dir, style);
    const nums = rebuilt.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    expect(nums[0]).toBeCloseTo(fromBox.x);
    expect(nums[1]).toBeCloseTo(fromBox.y - fromBox.height / 2);
    expect(nums[nums.length - 2]).toBeCloseTo(toBox.x);
    expect(nums[nums.length - 1]).toBeCloseTo(toBox.y + toBox.height / 2);
    expect(nums[nums.length - 1]).toBeLessThan(nums[1]);
    expect(rebuilt).toBe(roundedElbowPath(fromBox, toBox, 'up'));
    expect(rebuilt).not.toBe(roundedElbowPath(fromBox, toBox, 'right'));
  });

  it('brace-right 非 fishbone：connectorType=brace 时重建与布局 bracePath 一致', () => {
    const doc = applyLayoutPreset(createDocument(), 'brace-solid');
    expect(preservesLayoutConnectorD(doc)).toBe(false);
    const theme = getTheme(doc);
    const style = resolveConnectorAppearance(doc, doc.rootId, 'x', theme);
    expect(style.type).toBe('brace');
    const layoutBrace = bracePath(from, to, 'right');
    const rebuilt = resolveRenderedConnectorD(doc, layoutBrace, from, to, 'right', style);
    expect(rebuilt).toBe(layoutBrace);
  });
});
describe('pathApproachPoint / pathEndpoint', () => {
  it('straight path approach point is near end, not segment start', () => {
    const d = 'M 20 0 L 80 40';
    const end = pathEndpoint(d);
    const approach = pathApproachPoint(d);
    expect(end).toEqual({ x: 80, y: 40 });
    expect(approach).not.toBeNull();
    // 87.5% along (20,0)→(80,40)
    expect(approach!.x).toBeCloseTo(72.5);
    expect(approach!.y).toBeCloseTo(35);
    expect(approach!.x).not.toBe(20);
    expect(approach!.y).not.toBe(0);
    const distToEnd = Math.hypot(approach!.x - end!.x, approach!.y - end!.y);
    const distToStart = Math.hypot(approach!.x - 20, approach!.y - 0);
    expect(distToEnd).toBeLessThan(distToStart);
  });
});

function pathPointCount(d: string): number {
  return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).length / 2;
}

function pathSegmentCount(d: string): number {
  return (d.match(/[LCQ]/g) ?? []).length;
}

describe('handDrawnPath', () => {
  const from = { x: 0, y: 0, width: 40, height: 20 };
  const to = { x: 100, y: 40, width: 40, height: 20 };

  it('相对平滑曲线有更多点数和段数，且起终点不变', () => {
    const smooth = curvePath(from, to, 'right');
    const drawn = handDrawnPath(smooth);
    expect(pathPointCount(drawn)).toBeGreaterThan(pathPointCount(smooth));
    expect(pathSegmentCount(drawn)).toBeGreaterThan(pathSegmentCount(smooth));
    expect(pathEndpoint(drawn)).toEqual(pathEndpoint(smooth));
    const startSmooth = smooth.match(/-?\d+(?:\.\d+)?/g)!.slice(0, 2).map(Number);
    const startDrawn = drawn.match(/-?\d+(?:\.\d+)?/g)!.slice(0, 2).map(Number);
    expect(startDrawn[0]).toBe(startSmooth[0]);
    expect(startDrawn[1]).toBe(startSmooth[1]);
  });

  it('相对 elbow 折线同样加密采样', () => {
    const smooth = elbowPath(from, to, 'right');
    const drawn = handDrawnPath(smooth);
    expect(pathPointCount(drawn)).toBeGreaterThan(pathPointCount(smooth));
    expect(pathSegmentCount(drawn)).toBeGreaterThan(pathSegmentCount(smooth));
  });

  it('相同输入结果稳定（确定性抖动）', () => {
    const smooth = curvePath(from, to, 'right');
    expect(handDrawnPath(smooth)).toBe(handDrawnPath(smooth));
  });
});

describe('resolveRenderedConnectorD + handDrawn', () => {
  const from = { x: 0, y: 0, width: 40, height: 20 };
  const to = { x: 100, y: 40, width: 40, height: 20 };

  it('layoutDefaults.handDrawn 时外观标记 handDrawn，渲染路径比平滑路径更碎', () => {
    const doc = applyLayoutPreset(createDocument(), 'logic-hand-1');
    const theme = getTheme(doc);
    const style = resolveConnectorAppearance(doc, doc.rootId, 'x', theme);
    expect(style.handDrawn).toBe(true);
    const smooth = resolveRenderedConnectorD(
      { ...doc, layoutDefaults: { ...doc.layoutDefaults, handDrawn: false } },
      curvePath(from, to, 'right'),
      from,
      to,
      'right',
      { ...style, handDrawn: false, type: 'curve', deep: false },
    );
    const drawn = resolveRenderedConnectorD(doc, curvePath(from, to, 'right'), from, to, 'right', style);
    expect(pathPointCount(drawn)).toBeGreaterThan(pathPointCount(smooth));
    expect(pathSegmentCount(drawn)).toBeGreaterThan(pathSegmentCount(smooth));
  });

  it('未开启 handDrawn 时不抖动', () => {
    const doc = createDocument();
    const theme = getTheme(doc);
    const style = resolveConnectorAppearance(doc, doc.rootId, 'x', theme);
    expect(style.handDrawn).toBeFalsy();
    const layoutD = curvePath(from, to, 'right');
    expect(resolveRenderedConnectorD(doc, layoutD, from, to, 'right', style)).toBe(layoutD);
  });
});
