import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTurnstile } from '../lib/turnstile.js';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

describe('verifyTurnstile', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns { ok: false, error: "turnstile_required" } when token is empty', async () => {
    const res = await verifyTurnstile({ token: '', secret: 'sek', remoteIp: '1.2.3.4' });
    expect(res).toEqual({ ok: false, error: 'turnstile_required' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns { ok: false, error: "turnstile_required" } when token is missing/null', async () => {
    const res = await verifyTurnstile({ token: null, secret: 'sek' });
    expect(res).toEqual({ ok: false, error: 'turnstile_required' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns { ok: true } when siteverify says success', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true })));
    const res = await verifyTurnstile({ token: 'tok', secret: 'sek', remoteIp: '9.9.9.9' });
    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(SITEVERIFY);
    expect(init.method).toBe('POST');
    // body is FormData with the expected fields
    const body = init.body;
    expect(body.get('secret')).toBe('sek');
    expect(body.get('response')).toBe('tok');
    expect(body.get('remoteip')).toBe('9.9.9.9');
  });

  it('returns { ok: false, error: "turnstile_failed" } when siteverify says success=false', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }))
    );
    const res = await verifyTurnstile({ token: 'bad', secret: 'sek' });
    expect(res).toEqual({ ok: false, error: 'turnstile_failed' });
  });

  it('returns { ok: false, error: "turnstile_failed" } when siteverify throws', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const res = await verifyTurnstile({ token: 'tok', secret: 'sek' });
    expect(res).toEqual({ ok: false, error: 'turnstile_failed' });
  });

  it('omits remoteip when not provided', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true })));
    await verifyTurnstile({ token: 'tok', secret: 'sek' });
    const body = fetchMock.mock.calls[0][1].body;
    expect(body.get('remoteip')).toBeNull();
  });
});
