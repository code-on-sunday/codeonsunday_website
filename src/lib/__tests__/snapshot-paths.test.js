import { describe, it, expect } from 'vitest';
import { snapshotBasename, snapshotUrl } from '../snapshot-paths.js';

describe('snapshotBasename', () => {
  it('strips pages/ prefix and .html suffix', () => {
    expect(snapshotBasename('pages/01-hello.html')).toBe('01-hello');
  });
  it('strips just .html when no pages/ prefix', () => {
    expect(snapshotBasename('hello.html')).toBe('hello');
  });
  it('handles nested paths', () => {
    expect(snapshotBasename('pages/sub/02.html')).toBe('sub/02');
  });
});

describe('snapshotUrl', () => {
  it('builds portrait URL', () => {
    expect(snapshotUrl('trung', '01-hello', 'portrait'))
      .toBe('/sites/trung/snapshots/01-hello.portrait.png');
  });
  it('builds landscape URL', () => {
    expect(snapshotUrl('demo-other', 'front', 'landscape'))
      .toBe('/sites/demo-other/snapshots/front.landscape.png');
  });
});
