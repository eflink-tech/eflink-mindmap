// 撤销/重做历史：快照式纯函数，不修改入参
import { describe, expect, it } from 'vitest';
import { addChild, createDocument } from './nodeOps';
import { canRedo, canUndo, emptyHistory, record, redo, undo } from './history';

describe('history', () => {
  it('record 后 canUndo，且 redo 栈清空', () => {
    const d0 = createDocument();
    const d1 = addChild(d0, d0.rootId, 'A');
    let h = record(emptyHistory, d0);
    expect(canUndo(h)).toBe(true);
    expect(canRedo(h)).toBe(false);
    h = record(h, d1);
    const u = undo(h, addChild(d1, d1.rootId, 'B'));
    expect(u).not.toBeNull();
    expect(canRedo(u!.state)).toBe(true);
  });

  it('undo 返回上一个快照，redo 恢复', () => {
    const d0 = createDocument();
    const d1 = addChild(d0, d0.rootId, 'A');
    const h = record(emptyHistory, d0);
    const u = undo(h, d1)!;
    expect(u.doc).toBe(d0);
    const r = redo(u.state, u.doc)!;
    expect(r.doc).toBe(d1);
    expect(canUndo(r.state)).toBe(true);
  });

  it('空历史 undo 返回 null', () => {
    expect(undo(emptyHistory, createDocument())).toBeNull();
  });

  it('历史上限 100', () => {
    const d0 = createDocument();
    let h = emptyHistory;
    for (let i = 0; i < 150; i++) h = record(h, d0);
    expect(h.past).toHaveLength(100);
  });
});
