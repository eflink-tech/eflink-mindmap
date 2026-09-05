// 预设主题测试
import { describe, expect, it } from 'vitest';
import { getTheme, THEMES, themesInGroup } from './themes';
import { createDocument } from '../editor/nodeOps';
import { DEFAULT_CANVAS_BACKGROUND, getCanvasBackground } from './canvasOptions';

describe('themes', () => {
  it('提供缤纷 + 经典预设主题', () => {
    expect(Object.keys(THEMES).length).toBeGreaterThanOrEqual(40);
    expect(themesInGroup('colorful').map(([, t]) => t.name)).toEqual([
      '晨曦',
      '彩虹',
      '活力',
      '舞动',
      '代码',
      '和风',
      '岛屿',
      '玫瑰',
      '薄荷',
      '绿茶',
      '宇宙',
      '精致',
      '纯真',
      '马卡龙',
      '林地',
      '奶油',
      '夏威夷',
      '松果',
      '反乌托邦',
      '水粉',
      '华丽',
      '雅致',
      '多彩',
      '炫彩',
      '复古',
      '甜点',
      '香草',
      '糖果',
      '霓虹',
      '樱花',
      '壁炉',
      '假日',
      '海洋',
      '紫藤',
    ]);
    expect(themesInGroup('classic').length).toBe(6);
  });

  it('每个主题结构完整且画布背景字段为白', () => {
    for (const t of Object.values(THEMES)) {
      expect(t.name).toBeTruthy();
      expect(t.group === 'colorful' || t.group === 'classic').toBe(true);
      expect(t.colors.primary).toMatch(/^#/);
      expect(t.colors.background).toBe('#FFFFFF');
      expect(t.colors.branches).toHaveLength(6);
      expect(['rounded', 'ellipse', 'rectangle']).toContain(t.node.shape);
      expect(t.node.fontSize).toBeGreaterThan(0);
      expect(['curve', 'straight']).toContain(t.connector.type);
    }
  });

  it('缤纷主题色值对齐 XMind 色板', () => {
    expect(THEMES.chenxi.colors.branches).toEqual([
      '#FF6B6B',
      '#FF9F69',
      '#97D3B6',
      '#88E2D7',
      '#6FD0F9',
      '#E18BEE',
    ]);
    expect(THEMES.vitality.colors.primary).toBe('#0D0D0D');
    expect(THEMES.rainbow.colors.primary).toBe('#2E0F6B');
  });

  it('getTheme 未知 themeId 回退 classic', () => {
    const doc = { ...createDocument(), themeId: 'not-exist' };
    expect(getTheme(doc).name).toBe(THEMES.classic.name);
  });

  it('getTheme 兼容旧 themeId', () => {
    const doc = { ...createDocument(), themeId: 'candy' };
    expect(getTheme(doc).name).toBe(THEMES.dancing.name);
  });

  it('getTheme 合并 styleOverrides', () => {
    const doc = { ...createDocument(), styleOverrides: { node: { ...THEMES.classic.node, fontSize: 20 } } };
    expect(getTheme(doc).node.fontSize).toBe(20);
  });

  it('切换主题不影响默认画布白底', () => {
    const doc = { ...createDocument(), themeId: 'dancing' };
    expect(getCanvasBackground(doc)).toBe(DEFAULT_CANVAS_BACKGROUND);
    expect(getCanvasBackground(doc)).toBe('#FFFFFF');
  });
});
