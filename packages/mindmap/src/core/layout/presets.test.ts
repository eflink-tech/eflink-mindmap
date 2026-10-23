import { describe, expect, it } from 'vitest';
import {
  LAYOUT_PRESETS,
  getPreset,
  normalizeLayoutId,
  DEFAULT_LAYOUT_PRESET_ID,
  resolveLayoutMode,
} from './presets';
import type { LayoutCategory } from './presets';

describe('normalizeLayoutId', () => {
  it('迁移旧三布局', () => {
    expect(normalizeLayoutId('mindmap')).toBe('map-balanced-curve');
    expect(normalizeLayoutId('logic')).toBe('logic-right');
    expect(normalizeLayoutId('tree')).toBe('org-down');
  });

  it('未知回退默认', () => {
    expect(normalizeLayoutId('nope')).toBe(DEFAULT_LAYOUT_PRESET_ID);
  });

  it('已是预设 id 则原样返回', () => {
    expect(normalizeLayoutId('brace-solid')).toBe('brace-solid');
    expect(normalizeLayoutId('logic-outline')).toBe('logic-outline');
  });

  it('旧的换肤预设合并到新结构', () => {
    expect(normalizeLayoutId('logic-right-curve')).toBe('logic-right');
    expect(normalizeLayoutId('logic-heart-root')).toBe('logic-right');
    expect(normalizeLayoutId('org-down-hex')).toBe('org-down');
    expect(normalizeLayoutId('tree-right-6')).toBe('tree-right');
    expect(normalizeLayoutId('timeline-h-arrow')).toBe('timeline-h');
    expect(normalizeLayoutId('matrix-2x2-3')).toBe('matrix-2x2');
  });
});

describe('LAYOUT_PRESETS', () => {
  it('全部预设 ready', () => {
    expect(LAYOUT_PRESETS.every((p) => p.ready)).toBe(true);
  });

  it('每个 category 至少 1 项且 id 唯一', () => {
    const ids = LAYOUT_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of ['mindmap', 'logic', 'brace', 'org', 'tree', 'timeline', 'fishbone', 'matrix'] as const) {
      expect(LAYOUT_PRESETS.some((p) => p.category === c)).toBe(true);
    }
  });

  it('getPreset 能取到默认项', () => {
    expect(getPreset(DEFAULT_LAYOUT_PRESET_ID)?.structure).toBe('map-balanced');
  });

  const sixCategories: Array<[LayoutCategory, string[]]> = [
    [
      'logic',
      ['logic-right', 'logic-left', 'logic-down', 'logic-up', 'logic-balanced', 'logic-outline'],
    ],
    [
      'org',
      ['org-down', 'org-up', 'org-right', 'org-left', 'org-balanced', 'org-radial'],
    ],
    [
      'tree',
      ['tree-right', 'tree-left', 'tree-down', 'tree-up', 'tree-balanced', 'tree-radial'],
    ],
    [
      'timeline',
      [
        'timeline-h',
        'timeline-h-top',
        'timeline-h-bottom',
        'timeline-v',
        'timeline-v-left',
        'timeline-v-right',
      ],
    ],
    [
      'matrix',
      ['matrix-2x2', 'matrix-2x3', 'matrix-3x2', 'matrix-3x3', 'matrix-1x2', 'matrix-1x3'],
    ],
  ];

  it.each(sixCategories)('%s 恰好六套且结构互不重复', (category, structures) => {
    const items = LAYOUT_PRESETS.filter((p) => p.category === category);
    expect(items).toHaveLength(6);
    expect(items.map((p) => p.structure)).toEqual(structures);
    expect(items.every((p) => p.ready)).toBe(true);
  });

  it('组织结构图的六种结构都归入 org 模式', () => {
    for (const id of ['org-down', 'org-up', 'org-right', 'org-left', 'org-balanced', 'org-radial']) {
      expect(resolveLayoutMode(id)).toBe('org-down');
    }
  });

  it('逻辑/树形/时间轴/矩阵映射为 logic 模式', () => {
    for (const id of ['logic-outline', 'tree-radial', 'timeline-v-right', 'matrix-3x3']) {
      expect(resolveLayoutMode(id)).toBe('logic');
    }
  });

  it('brace-right 预设 ready 且 connectorType 为 brace', () => {
    const braces = LAYOUT_PRESETS.filter(
      (p) => p.structure === 'brace-right' || p.id === 'map-brace-entry',
    );
    expect(braces.length).toBe(7);
    expect(braces.every((p) => p.ready)).toBe(true);
    expect(braces.every((p) => p.defaults.connectorType === 'brace')).toBe(true);
    expect(resolveLayoutMode('brace-solid')).toBe('logic');
  });

  it('六套鱼骨结构齐全且旧预设迁移', () => {
    const fish = LAYOUT_PRESETS.filter((p) => p.category === 'fishbone');
    expect(fish.length).toBe(6);
    expect(new Set(fish.map((p) => p.structure))).toEqual(
      new Set(['fishbone-rl', 'fishbone-lr', 'fishbone-bt', 'fishbone-tb', 'fishbone-6m', 'fishbone-comb']),
    );
    expect(normalizeLayoutId('fishbone-1')).toBe('fishbone-classic');
    expect(normalizeLayoutId('fishbone-2')).toBe('fishbone-6m');
    expect(normalizeLayoutId('fishbone-3')).toBe('fishbone-comb');
    expect(resolveLayoutMode('fishbone-classic')).toBe('logic');
    expect(resolveLayoutMode('fishbone-vertical')).toBe('logic');
  });

  it('大纲逻辑使用无边框，环形布局使用直连', () => {
    expect(getPreset('logic-outline')?.defaults.borderStyle).toBe('none');
    expect(getPreset('org-radial')?.defaults.connectorType).toBe('straight');
    expect(getPreset('tree-radial')?.defaults.connectorType).toBe('curve');
    expect(getPreset('brace-hex')?.defaults.shape).toBe('hexagon');
    expect(getPreset('brace-pill')?.defaults.shape).toBe('pill');
  });
});
