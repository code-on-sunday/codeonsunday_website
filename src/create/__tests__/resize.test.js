import { describe, it, expect } from 'vitest';
import { fitWithin } from '../resize.js';

describe('fitWithin', () => {
  const MAX = 1600;
  it('returns input dimensions if already within max', () => {
    expect(fitWithin({ width: 800, height: 600 }, MAX))
      .toEqual({ width: 800, height: 600 });
  });
  it('scales a wide image down so width = max', () => {
    expect(fitWithin({ width: 3200, height: 2400 }, MAX))
      .toEqual({ width: 1600, height: 1200 });
  });
  it('scales a tall image down so height = max', () => {
    expect(fitWithin({ width: 2400, height: 3200 }, MAX))
      .toEqual({ width: 1200, height: 1600 });
  });
  it('preserves aspect ratio precisely', () => {
    const r = fitWithin({ width: 4000, height: 3000 }, MAX);
    expect(r.width).toBe(1600);
    expect(r.height).toBe(1200);
  });
  it('rounds non-integer results down', () => {
    const r = fitWithin({ width: 4001, height: 3000 }, MAX);
    expect(Number.isInteger(r.width)).toBe(true);
    expect(Number.isInteger(r.height)).toBe(true);
  });
});
