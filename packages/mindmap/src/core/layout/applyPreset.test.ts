import { describe, expect, it } from 'vitest';
import { createDocument } from '../editor/nodeOps';
import { applyLayoutPreset } from './applyPreset';
import { getTheme } from '../style/themes';
import { resolveNodeStyle } from '../style/apply';

describe('applyLayoutPreset', () => {
  it('写入 layout 与 layoutDefaults，不改已有 node.style.shape', () => {
    let doc = createDocument();
    const root = doc.rootId;
    doc = {
      ...doc,
      nodes: {
        ...doc.nodes,
        [root]: { ...doc.nodes[root], style: { shape: 'rectangle' } },
      },
    };
    const next = applyLayoutPreset(doc, 'map-balanced-bubble');
    expect(next.layout).toBe('map-balanced-bubble');
    expect(next.layoutDefaults?.shape).toBe('ellipse');
    expect(next.nodes[root].style?.shape).toBe('rectangle');
  });

  it('相同预设不改变文档引用', () => {
    const doc = applyLayoutPreset(createDocument(), 'map-balanced-curve');
    const again = applyLayoutPreset(doc, 'map-balanced-curve');
    expect(again).toBe(doc);
  });
});

describe('resolveNodeStyle + layoutDefaults', () => {
  it('无节点 shape 时使用 layoutDefaults.shape', () => {
    const doc = applyLayoutPreset(createDocument(), 'map-balanced-bubble');
    const theme = getTheme(doc);
    const s = resolveNodeStyle(doc, theme, doc.rootId);
    expect(s.shape).toBe('ellipse');
  });

  it('新布局预设透出各自 defaults', () => {
    const outline = applyLayoutPreset(createDocument(), 'logic-outline');
    expect(resolveNodeStyle(outline, getTheme(outline), outline.rootId).borderStyle).toBe('none');
    const radial = applyLayoutPreset(createDocument(), 'org-radial');
    expect(radial.layoutDefaults?.connectorType).toBe('straight');
    const hex = applyLayoutPreset(createDocument(), 'brace-hex');
    expect(resolveNodeStyle(hex, getTheme(hex), hex.rootId).shape).toBe('hexagon');
    const pill = applyLayoutPreset(createDocument(), 'brace-pill');
    expect(resolveNodeStyle(pill, getTheme(pill), pill.rootId).shape).toBe('pill');
  });
});
