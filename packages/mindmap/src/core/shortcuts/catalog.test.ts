import { describe, expect, it } from 'vitest';
import { formatShortcut, menuShortcutLabel } from './catalog';

describe('formatShortcut', () => {
  it('Mac 用符号连接', () => {
    expect(formatShortcut(['Mod', 'Z'], true)).toBe('⌘Z');
    expect(formatShortcut(['Mod', 'Shift', 'Z'], true)).toBe('⌘⇧Z');
  });

  it('非 Mac 用 Ctrl+ 连接', () => {
    expect(formatShortcut(['Mod', 'Z'], false)).toBe('Ctrl+Z');
    expect(formatShortcut(['Mod', 'Shift', 'Z'], false)).toBe('Ctrl+Shift+Z');
  });
});

describe('menuShortcutLabel', () => {
  it('返回菜单项主快捷键', () => {
    expect(menuShortcutLabel('undo', true)).toBe('⌘Z');
    expect(menuShortcutLabel('fitToScreen', false)).toBe('Ctrl+0');
    expect(menuShortcutLabel('zoomIn', false)).toBe('Ctrl++');
    expect(menuShortcutLabel('zoomOut', false)).toBe('Ctrl+-');
    expect(menuShortcutLabel('save', false)).toBe('Ctrl+S');
    expect(menuShortcutLabel('save', true)).toBe('⌘S');
  });

  it('未知 id 返回 undefined', () => {
    expect(menuShortcutLabel('nope')).toBeUndefined();
  });
});
