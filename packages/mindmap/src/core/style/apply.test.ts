import { describe, expect, it } from 'vitest';
import { addChild, createDocument, updateStyle } from '../editor/nodeOps';
import { DEFAULT_CANVAS_OPTIONS } from './canvasOptions';
import { getTheme, THEMES } from './themes';
import {
  branchColorOf,
  contrastTextColor,
  fillableBranchColors,
  resolveNodeStyle,
} from './apply';

describe('themes', () => {
  it('内置主题数量 >= 1 且字段完整', () => {
    expect(Object.keys(THEMES).length).toBeGreaterThanOrEqual(1);
    const t = THEMES.classic;
    expect(t.colors.branches.length).toBeGreaterThanOrEqual(6);
  });

  it('未知 themeId 回退 classic', () => {
    const doc = { ...createDocument(), themeId: 'nope' };
    expect(getTheme(doc).name).toBe(THEMES.classic.name);
  });
});

describe('fillableBranchColors', () => {
  it('活力色板排除近白与近黑，保留红黄蓝', () => {
    expect(fillableBranchColors(THEMES.vitality.colors.branches)).toEqual([
      '#F22816',
      '#F2B807',
      '#233ED9',
    ]);
  });
});

describe('branchColorOf / resolveNodeStyle', () => {
  it('根节点用 primary，一级分支按可填充色索引取色，后代继承', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    doc = addChild(doc, doc.rootId, 'B');
    doc = addChild(doc, Object.values(doc.nodes).find((n) => n.text === 'A')!.id, 'A1');
    const theme = getTheme(doc);
    const fillable = fillableBranchColors(theme.colors.branches);
    const a = Object.values(doc.nodes).find((n) => n.text === 'A')!.id;
    const b = Object.values(doc.nodes).find((n) => n.text === 'B')!.id;
    const a1 = Object.values(doc.nodes).find((n) => n.text === 'A1')!.id;
    expect(branchColorOf(doc, theme, doc.rootId)).toBe(theme.colors.primary);
    expect(branchColorOf(doc, theme, a)).toBe(fillable[0]);
    expect(branchColorOf(doc, theme, b)).toBe(fillable[1]);
    expect(branchColorOf(doc, theme, a1)).toBe(fillable[0]);
  });

  it('活力：中心白底黑边，一级在红黄蓝间循环且不含白灰', () => {
    let doc = { ...createDocument(), themeId: 'vitality' };
    doc = addChild(doc, doc.rootId, 'A');
    doc = addChild(doc, doc.rootId, 'B');
    doc = addChild(doc, doc.rootId, 'C');
    doc = addChild(doc, doc.rootId, 'D');
    const theme = getTheme(doc);
    const ids = doc.nodes[doc.rootId].children;
    const root = resolveNodeStyle(doc, theme, doc.rootId);
    expect(root.fillColor).toBe('#FFFFFF');
    expect(root.borderColor).toBe('#0D0D0D');
    expect(branchColorOf(doc, theme, ids[0])).toBe('#F22816');
    expect(branchColorOf(doc, theme, ids[1])).toBe('#F2B807');
    expect(branchColorOf(doc, theme, ids[2])).toBe('#233ED9');
    expect(branchColorOf(doc, theme, ids[3])).toBe('#F22816');
    expect(resolveNodeStyle(doc, theme, ids[0]).fillColor).toBe('#F22816');
  });

  it('节点自定义样式覆盖主题默认', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    const a = Object.values(doc.nodes).find((n) => n.text === 'A')!.id;
    doc = {
      ...doc,
      nodes: { ...doc.nodes, [a]: { ...doc.nodes[a], style: { fillColor: '#123456', fontSize: 20 } } },
    };
    const s = resolveNodeStyle(doc, getTheme(doc), a);
    expect(s.fillColor).toBe('#123456');
    expect(s.fontSize).toBe(20);
    expect(s.shape).toBe(getTheme(doc).node.shape);
  });

  it('深度越大字体越小', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    const a = Object.values(doc.nodes).find((n) => n.text === 'A')!.id;
    doc = addChild(doc, a, 'B');
    const b = Object.values(doc.nodes).find((n) => n.text === 'B')!.id;
    const theme = getTheme(doc);
    const rootStyle = resolveNodeStyle(doc, theme, doc.rootId);
    const aStyle = resolveNodeStyle(doc, theme, a, 1);
    const bStyle = resolveNodeStyle(doc, theme, b, 2);
    expect(rootStyle.fontSize).toBe(theme.node.fontSize + 4);
    expect(aStyle.fontSize).toBe(theme.node.fontSize + 2);
    expect(bStyle.fontSize).toBe(theme.node.fontSize);
  });

  it('二级浅色背景+分支色描边，三级起无背景纯文字', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId, 'A');
    const a = Object.values(doc.nodes).find((n) => n.text === 'A')!.id;
    doc = addChild(doc, a, 'B');
    const b = Object.values(doc.nodes).find((n) => n.text === 'B')!.id;
    doc = addChild(doc, b, 'C');
    const c = Object.values(doc.nodes).find((n) => n.text === 'C')!.id;
    const theme = getTheme(doc);
    const fillable = fillableBranchColors(theme.colors.branches);
    const aStyle = resolveNodeStyle(doc, theme, a, 1);
    const bStyle = resolveNodeStyle(doc, theme, b, 2);
    const cStyle = resolveNodeStyle(doc, theme, c, 3);
    expect(aStyle.fillColor).toBe(fillable[0]);
    expect(bStyle.fillColor).not.toBe(fillable[0]);
    expect(bStyle.fillColor.startsWith('#')).toBe(true);
    expect(bStyle.borderColor).toBe(fillable[0]);
    expect(cStyle.fillColor).toBe('transparent');
    expect(cStyle.textColor).toBe('#1E293B');
  });

  it('resolveNodeStyle 合并节点新字段', () => {
    let doc = createDocument();
    doc = updateStyle(doc, doc.rootId, {
      borderStyle: 'dashed',
      italic: true,
      textAlign: 'center',
      underline: true,
      fixedWidth: 200,
    });
    const s = resolveNodeStyle(doc, getTheme(doc), doc.rootId);
    expect(s.borderStyle).toBe('dashed');
    expect(s.italic).toBe(true);
    expect(s.textAlign).toBe('center');
    expect(s.underline).toBe(true);
    expect(s.fixedWidth).toBe(200);
  });

  it('rainbowBranches=false 时非根使用 primary', () => {
    let doc = createDocument();
    doc = addChild(doc, doc.rootId);
    const childId = doc.nodes[doc.rootId].children[0];
    doc = {
      ...doc,
      canvasOptions: { ...DEFAULT_CANVAS_OPTIONS, rainbowBranches: false },
    };
    const theme = getTheme(doc);
    expect(branchColorOf(doc, theme, childId)).toBe(theme.colors.primary);
  });
});

describe('contrastTextColor', () => {
  it('浅色返回深字', () => {
    expect(contrastTextColor('#FFFFFF')).toBe('#1E293B');
    expect(contrastTextColor('#FF6B6B')).toBe('#1E293B');
  });
  it('深色返回白字', () => {
    expect(contrastTextColor('#0D0D0D')).toBe('#FFFFFF');
    expect(contrastTextColor('#2E0F6B')).toBe('#FFFFFF');
  });
});

describe('resolveNodeStyle textColor by fill luminance', () => {
  it('根与一级按填充对比度取文字色；二级深字', () => {
    let doc = createDocument();
    doc = { ...doc, themeId: 'chenxi' };
    doc = addChild(doc, doc.rootId, 'A');
    const theme = getTheme(doc);
    const a = Object.values(doc.nodes).find((n) => n.text === 'A')!.id;
    const rootStyle = resolveNodeStyle(doc, theme, doc.rootId);
    const aStyle = resolveNodeStyle(doc, theme, a);
    expect(rootStyle.textColor).toBe(contrastTextColor(rootStyle.fillColor));
    expect(aStyle.textColor).toBe(contrastTextColor(aStyle.fillColor));
    doc = addChild(doc, a, 'A1');
    const a1 = Object.values(doc.nodes).find((n) => n.text === 'A1')!.id;
    expect(resolveNodeStyle(doc, theme, a1).textColor).toBe('#1E293B');
  });
});
