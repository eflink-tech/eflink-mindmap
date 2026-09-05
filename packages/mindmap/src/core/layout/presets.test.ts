import { describe, expect, it } from 'vitest';
import {
  LAYOUT_PRESETS,
  getPreset,
  normalizeLayoutId,
  DEFAULT_LAYOUT_PRESET_ID,
  resolveLayoutMode,
} from './presets';

describe('normalizeLayoutId', () => {
  it('迁移旧三布局', () => {
    expect(normalizeLayoutId('mindmap')).toBe('map-balanced-curve');
    expect(normalizeLayoutId('logic')).toBe('logic-right-curve');
    expect(normalizeLayoutId('tree')).toBe('org-down-rounded');
  });

  it('未知回退默认', () => {
    expect(normalizeLayoutId('nope')).toBe(DEFAULT_LAYOUT_PRESET_ID);
  });

  it('已是预设 id 则原样返回', () => {
    expect(normalizeLayoutId('brace-solid')).toBe('brace-solid');
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

  it('tree-right 映射为向右树而非 org-down，且预设 ready', () => {
    expect(resolveLayoutMode('tree-right-1')).toBe('logic');
    expect(resolveLayoutMode('tree-right-1')).not.toBe('org-down');
    const trees = LAYOUT_PRESETS.filter((p) => p.structure === 'tree-right');
    expect(trees.length).toBe(6);
    expect(trees.every((p) => p.ready)).toBe(true);
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

  it('外观增强预设 ready（heart / quote / handDrawn / hexagon / pill）', () => {
    const ids = [
      'logic-heart-root',
      'logic-quote',
      'logic-hand-1',
      'logic-hand-2',
      'logic-hand-3',
      'brace-hex',
      'brace-pill',
      'org-down-hex',
      'tree-right-6',
      'timeline-v-capsule',
      'fishbone-3',
    ];
    for (const id of ids) {
      expect(getPreset(id)?.ready, id).toBe(true);
    }
  });
});
