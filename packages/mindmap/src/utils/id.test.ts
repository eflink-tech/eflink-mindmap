import { describe, expect, it } from 'vitest';
import { newId } from './id';

describe('newId', () => {
  it('生成不重复的非空字符串', () => {
    const a = newId();
    const b = newId();
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });
});
