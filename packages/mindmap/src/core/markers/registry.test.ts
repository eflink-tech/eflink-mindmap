// 标记注册表测试
import { describe, expect, it } from 'vitest';
import type { Marker } from '../../types/mindmap';
import {
  MARKER_COLOR_HEX, MARKER_COLORS, MARKER_GROUPS, SYMBOL_PRESETS,
  groupOf, iconSizeOf, markerEq, markerGlyph, markerId, markerLabel,
  markersRowHeight, markersRowWidth, priorityColor, stickerMarker,
} from './registry';

describe('groupOf', () => {
  it('旧版 progress 并入任务组', () => {
    expect(groupOf({ type: 'progress', percent: 50 })).toBe('task');
    expect(groupOf({ type: 'task', state: 'p50' })).toBe('task');
  });

  it('emoji 并入符号组，其余按类型', () => {
    expect(groupOf({ type: 'emoji', value: '🔥' })).toBe('symbol');
    expect(groupOf({ type: 'label', color: 'red' })).toBe('label');
    expect(groupOf({ type: 'priority', level: 1 })).toBe('priority');
    expect(groupOf({ type: 'sticker', value: '💼' })).toBe('sticker');
  });
});

describe('markerId / markerEq', () => {
  it('同图标 id 相同，不同颜色/档位 id 不同', () => {
    expect(markerId({ type: 'flag', color: 'red' })).toBe('flag-red');
    expect(markerId({ type: 'priority', level: 3 })).toBe('priority-3');
    expect(markerEq({ type: 'star', color: 'blue' }, { type: 'star', color: 'blue' })).toBe(true);
    expect(markerEq({ type: 'star', color: 'blue' }, { type: 'star', color: 'red' })).toBe(false);
    expect(markerEq({ type: 'priority', level: 2 }, { type: 'label', color: 'orange' })).toBe(false);
  });

  it('贴纸 id 区分大小尺寸', () => {
    expect(markerId(stickerMarker('💼'))).toBe('sticker-💼');
    expect(markerId({ type: 'sticker', value: '💼', large: true })).toBe('sticker-💼-lg');
  });
});

describe('尺寸排布', () => {
  it('无标记时行宽/行高为 0', () => {
    expect(markersRowWidth(undefined)).toBe(0);
    expect(markersRowWidth([])).toBe(0);
    expect(markersRowHeight([])).toBe(0);
  });

  it('行宽 = 各图标 + 间距，行高取最大图标', () => {
    const markers: Marker[] = [
      { type: 'priority', level: 1 },
      { type: 'star', color: 'red' },
      stickerMarker('💼'),
    ];
    // 16 + 4 + 16 + 4 + 24 + 4（尾部留白）
    expect(markersRowWidth(markers)).toBe(68);
    expect(markersRowHeight(markers)).toBe(24);
    expect(iconSizeOf({ type: 'sticker', value: '💼', large: true })).toBe(30);
  });
});

describe('优先级配色与面板分组', () => {
  it('优先级 1-7 依次取色板色', () => {
    expect(priorityColor(1)).toBe(markerColorHexOf('red'));
    expect(priorityColor(7)).toBe(markerColorHexOf('gray'));
  });

  it('面板含 7 个分组，优先级 7 档、符号与预设一致', () => {
    expect(MARKER_GROUPS.map((g) => g.id)).toEqual([
      'label', 'priority', 'task', 'flag', 'star', 'people', 'symbol',
    ]);
    const byId = Object.fromEntries(MARKER_GROUPS.map((g) => [g.id, g]));
    expect(byId.priority.items).toHaveLength(7);
    expect(byId.label.items).toHaveLength(MARKER_COLORS.length);
    expect(byId.symbol.items.map((m) => (m as { value: string }).value)).toEqual(SYMBOL_PRESETS);
  });
});

describe('markerGlyph', () => {
  it('颜色类标记携带填充路径', () => {
    const star = markerGlyph({ type: 'star', color: 'red' });
    expect(star.shapes).toHaveLength(1);
    expect(star.shapes[0].fill).toBeTruthy();
  });

  it('优先级渲染数字文本', () => {
    const glyph = markerGlyph({ type: 'priority', level: 5 });
    expect(glyph.text).toBe('5');
    expect(glyph.textColor).toBe('#FFFFFF');
  });

  it('任务状态映射到饼形/对勾路径', () => {
    expect(markerGlyph({ type: 'task', state: 'done' }).shapes).toHaveLength(2);
    expect(markerGlyph({ type: 'task', state: 'p25' }).shapes[1].d).toContain('A8 8');
    // 旧版 progress 100 渲染为完成态
    expect(markerGlyph({ type: 'progress', percent: 100 }).shapes[1].strokeLinecap).toBe('round');
  });
});

describe('markerLabel', () => {
  it('生成中文提示', () => {
    expect(markerLabel({ type: 'priority', level: 2 })).toBe('优先级 2');
    expect(markerLabel({ type: 'flag', color: 'red' })).toBe('旗帜·红');
    expect(markerLabel({ type: 'task', state: 'done' })).toBe('任务·完成');
  });
});

function markerColorHexOf(color: (typeof MARKER_COLORS)[number]): string {
  return MARKER_COLOR_HEX[color];
}
