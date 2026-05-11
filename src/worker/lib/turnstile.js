const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verify a Cloudflare Turnstile token against the siteverify endpoint.
 *
 * @param {object} args
 * @param {string|null|undefined} args.token   The cf-turnstile-response from the form.
 * @param {string} args.secret                 The Turnstile secret key (server-side only).
 * @param {string} [args.remoteIp]             Optional client IP for hardened verification.
 * @returns {Promise<{ ok: true } | { ok: false, error: 'turnstile_required' | 'turnstile_failed' }>}
 */
export async function verifyTurnstile({ token, secret, remoteIp }) {
  if (!token) return { ok: false, error: 'turnstile_required' };

  const body = new FormData();
  body.set('secret', secret);
  body.set('response', token);
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const res = await fetch(SITEVERIFY, { method: 'POST', body });
    const data = await res.json();
    if (data && data.success === true) return { ok: true };
    return { ok: false, error: 'turnstile_failed' };
  } catch {
    return { ok: false, error: 'turnstile_failed' };
  }
}
