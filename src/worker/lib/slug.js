import wordlist from './wordlist.json';

function pick(arr) {
  const i = Math.floor(Math.random() * arr.length);
  return arr[i];
}

function randomHex3() {
  const n = Math.floor(Math.random() * 0x1000);
  return n.toString(16).padStart(3, '0');
}

async function isTaken(env, slug) {
  return (await env.KV_MANIFESTS.get(slug)) !== null;
}

export async function generateSlug(env) {
  for (let i = 0; i < 3; i++) {
    const candidate = `${pick(wordlist.adjectives)}-${pick(wordlist.nouns)}`;
    if (!(await isTaken(env, candidate))) return candidate;
  }
  // Three collisions in a row — append hex for guaranteed uniqueness
  for (let i = 0; i < 5; i++) {
    const candidate = `${pick(wordlist.adjectives)}-${pick(wordlist.nouns)}-${randomHex3()}`;
    if (!(await isTaken(env, candidate))) return candidate;
  }
  throw new Error('slug generation exhausted retries');
}
