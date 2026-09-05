import { describe, expect, it } from 'vitest';
import { createDocument } from '../editor/nodeOps';
import {
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CANVAS_OPTIONS,
  getCanvasBackground,
  getCanvasOptions,
  updateCanvasOptions,
} from './canvasOptions';

describe('getCanvasOptions', () => {
  it('无 canvasOptions 时返回默认值副本', () => {
    const doc = createDocument();
    const opts = getCanvasOptions(doc);
    expect(opts).toEqual(DEFAULT_CANVAS_OPTIONS);
    expect(opts).not.toBe(DEFAULT_CANVAS_OPTIONS);
  });

  it('部分字段覆盖默认值', () => {
    const doc = { ...createDocument(), canvasOptions: { ...DEFAULT_CANVAS_OPTIONS, compact: true, background: '#111' } };
    const opts = getCanvasOptions(doc);
    expect(opts.compact).toBe(true);
    expect(opts.balanced).toBe(true);
    expect(opts.background).toBe('#111');
  });
});

describe('getCanvasBackground', () => {
  it('未设置时固定白底，不跟随主题', () => {
    const doc = { ...createDocument(), themeId: 'night' };
    expect(getCanvasBackground(doc)).toBe(DEFAULT_CANVAS_BACKGROUND);
  });

  it('尊重用户设置的背景色', () => {
    const doc = {
      ...createDocument(),
      canvasOptions: { ...DEFAULT_CANVAS_OPTIONS, background: '#111111' },
    };
    expect(getCanvasBackground(doc)).toBe('#111111');
  });
});

describe('updateCanvasOptions', () => {
  it('空 patch 返回原文档引用', () => {
    const doc = createDocument();
    expect(updateCanvasOptions(doc, {})).toBe(doc);
  });

  it('与当前有效选项相同的 patch 为 no-op（无 updatedAt / 无新 canvasOptions）', () => {
    const doc = createDocument();
    const before = doc.updatedAt;
    const next = updateCanvasOptions(doc, { balanced: true, compact: false });
    expect(next).toBe(doc);
    expect(next.updatedAt).toBe(before);
    expect(next.canvasOptions).toBeUndefined();
  });

  it('已有 canvasOptions 时重复写入相同值仍为 no-op', () => {
    const doc = {
      ...createDocument(),
      canvasOptions: { ...DEFAULT_CANVAS_OPTIONS, compact: true, background: '#abc' },
    };
    const next = updateCanvasOptions(doc, { compact: true, background: '#abc' });
    expect(next).toBe(doc);
  });

  it('有变化时写入 merged canvasOptions 并更新 updatedAt', () => {
    const doc = createDocument();
    const next = updateCanvasOptions(doc, { compact: true });
    expect(next).not.toBe(doc);
    expect(next.canvasOptions?.compact).toBe(true);
    expect(next.updatedAt).toBeGreaterThanOrEqual(doc.updatedAt);
  });

  it('flowAnimation 默认开启，可关闭并持久化', () => {
    const doc = createDocument();
    expect(getCanvasOptions(doc).flowAnimation).toBe(true);
    const next = updateCanvasOptions(doc, { flowAnimation: false });
    expect(next.canvasOptions?.flowAnimation).toBe(false);
    // 写回相同值为 no-op
    expect(updateCanvasOptions(next, { flowAnimation: false })).toBe(next);
  });
});
