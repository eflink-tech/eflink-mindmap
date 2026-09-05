import { describe, expect, it } from 'vitest';
import type { Box } from '../../types/mindmap';
import { findDropTarget, hitZone, isInSubtree } from './dragOps';

const box = (x: number, y: number): Box => ({ x, y, width: 100, height: 40 });

describe('hitZone', () => {
  it('上 25% = before，下 25% = after，中间 = child', () => {
    const b = box(0, 0); // y ∈ [-20, 20]
    expect(hitZone(b, { x: 0, y: -15 })).toBe('before');
    expect(hitZone(b, { x: 0, y: 15 })).toBe('after');
    expect(hitZone(b, { x: 0, y: 0 })).toBe('child');
  });
});

describe('isInSubtree', () => {
  it('后代判定', () => {
    const doc = {
      rootId: 'r',
      nodes: {
        r: { id: 'r', parentId: null, children: ['a'], text: '' },
        a: { id: 'a', parentId: 'r', children: ['b'], text: '' },
        b: { id: 'b', parentId: 'a', children: [], text: '' },
      },
    } as any;
    expect(isInSubtree(doc, 'a', 'b')).toBe(true);
    expect(isInSubtree(doc, 'b', 'a')).toBe(false);
  });
});

describe('findDropTarget', () => {
  const positions: Record<string, Box> = {
    r: box(0, 0),
    a: box(200, -50),
    b: box(200, 50),
  };
  const doc = {
    rootId: 'r',
    nodes: {
      r: { id: 'r', parentId: null, children: ['a', 'b'], text: '' },
      a: { id: 'a', parentId: 'r', children: [], text: '' },
      b: { id: 'b', parentId: 'r', children: [], text: '' },
    },
  } as any;

  it('命中兄弟中部 → child', () => {
    expect(findDropTarget(doc, positions, 'a', { x: 200, y: 50 })).toEqual({ targetId: 'b', zone: 'child' });
  });

  it('命中兄弟上沿 → before', () => {
    expect(findDropTarget(doc, positions, 'a', { x: 200, y: 32 })).toEqual({ targetId: 'b', zone: 'before' });
  });

  it('根节点只接受 child', () => {
    expect(findDropTarget(doc, positions, 'a', { x: 0, y: -18 })).toEqual({ targetId: 'r', zone: 'child' });
  });

  it('拖拽者自身与未命中返回 null', () => {
    expect(findDropTarget(doc, positions, 'a', { x: 200, y: -50 })).toBeNull();
    expect(findDropTarget(doc, positions, 'a', { x: 900, y: 900 })).toBeNull();
  });
});
