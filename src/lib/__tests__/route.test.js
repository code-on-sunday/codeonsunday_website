import { describe, it, expect } from 'vitest';
import { resolveSiteName } from '../route.js';

describe('resolveSiteName', () => {
  it('returns the default site for "/"', () => {
    expect(resolveSiteName('/', 'trung')).toBe('trung');
  });
  it('returns the default site for empty path', () => {
    expect(resolveSiteName('', 'trung')).toBe('trung');
  });
  it('extracts a single-segment site name', () => {
    expect(resolveSiteName('/demo-other', 'trung')).toBe('demo-other');
  });
  it('strips trailing slash', () => {
    expect(resolveSiteName('/demo-other/', 'trung')).toBe('demo-other');
  });
  it('returns the first segment when path has multiple', () => {
    expect(resolveSiteName('/demo-other/sub', 'trung')).toBe('demo-other');
  });
});
