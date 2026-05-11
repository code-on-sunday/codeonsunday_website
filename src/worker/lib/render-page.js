import { paletteFor } from './palettes.js';

const COMMON_STYLE = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0; width: 100vw; height: 100vh;
  overflow: hidden;
  font-family: "Marker Felt", "Comic Sans MS", "Bradley Hand", "Chalkboard SE", cursive;
  -webkit-font-smoothing: antialiased;
  color: #3d2c4f;
}
.page { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
.sparkles::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background-image:
    radial-gradient(circle at 7% 9%, rgba(255,255,255,.55) 2px, transparent 3px),
    radial-gradient(circle at 19% 41%, rgba(255,255,255,.55) 3px, transparent 4px),
    radial-gradient(circle at 32% 13%, rgba(255,255,255,.55) 2px, transparent 3px),
    radial-gradient(circle at 51% 67%, rgba(255,255,255,.55) 4px, transparent 5px),
    radial-gradient(circle at 68% 22%, rgba(255,255,255,.55) 3px, transparent 4px),
    radial-gradient(circle at 79% 78%, rgba(255,255,255,.55) 2px, transparent 3px),
    radial-gradient(circle at 88% 35%, rgba(255,255,255,.55) 3px, transparent 4px),
    radial-gradient(circle at 12% 86%, rgba(255,255,255,.55) 2px, transparent 3px),
    radial-gradient(circle at 44% 92%, rgba(255,255,255,.55) 3px, transparent 4px);
  background-size: 100% 100%;
}
.polaroid {
  background: #fff8ef; padding: 5%; padding-bottom: 18%;
  box-shadow: 0.6vmin 0.8vmin 0 rgba(40,20,60,0.30);
  display: flex; flex-direction: column;
}
.polaroid img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; display: block; }
.grad {
  font-style: italic; font-weight: 700;
  background: linear-gradient(90deg, var(--from, #ff5e8a), var(--to, #ff9a3c));
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  filter: drop-shadow(0.06em 0.06em 0 rgba(40,20,60,0.28));
}
`;

function gradientBackground({ from, mid, to }) {
  return `linear-gradient(180deg, ${from} 0%, ${mid} 50%, ${to} 100%)`;
}

const ROTATIONS = [-3, 3, -2, 4, -3, 2];

function rotationFor(index) {
  return ROTATIONS[index % ROTATIONS.length];
}

function renderIntro({ paletteIndex }) {
  const p = paletteFor(paletteIndex);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>this is me</title>
<style>${COMMON_STYLE}
body { background: ${gradientBackground(p)}; }
.title { position: absolute; left: 50%; top: 38vh; transform: translate(-50%, -50%) rotate(-2deg);
         font-size: 18vw; --from: #ff5e8a; --to: #ff9a3c; }
.hint  { position: absolute; left: 50%; bottom: 6vh; transform: translateX(-50%);
         font-style: italic; font-size: 4vw; color: #3d2c4f; opacity: 0.7; }
@media (orientation: landscape) {
  .title { font-size: 12vw; top: 50vh; }
  .hint  { bottom: 8vh; font-size: 2.4vw; }
}
</style>
</head>
<body>
<div class="page sparkles">
  <div class="grad title">this is me</div>
  <div class="hint">tear →</div>
</div>
</body>
</html>`;
}

function renderPhoto({ paletteIndex, rotationIndex, photoUrl }) {
  const p = paletteFor(paletteIndex);
  const rot = rotationFor(rotationIndex);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>photo</title>
<style>${COMMON_STYLE}
body { background: ${gradientBackground(p)}; }
.pic { position: absolute; left: 50%; top: 50%;
       transform: translate(-50%, -50%) rotate(${rot}deg);
       width: 70vw; }
@media (orientation: landscape) {
  .pic { width: 32vw; }
}
</style>
</head>
<body>
<div class="page sparkles">
  <div class="pic">
    <figure class="polaroid">
      <img src="${photoUrl}" alt="" />
    </figure>
  </div>
</div>
</body>
</html>`;
}

function renderFinal({ paletteIndex, photoUrl }) {
  const p = paletteFor(paletteIndex);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>tear your own</title>
<style>${COMMON_STYLE}
body { background: ${gradientBackground(p)}; }
.pic { position: absolute; left: 50%; top: 32vh;
       transform: translate(-50%, -50%) rotate(-2deg); width: 56vw; }
.cta { position: absolute; left: 50%; top: 66vh; transform: translate(-50%, -50%) rotate(-2deg);
       font-size: 12vw; --from: #ff5e8a; --to: #ff9a3c; text-decoration: none; }
.cta:visited { color: inherit; }
.btn { position: absolute; left: 50%; bottom: 8vh; transform: translateX(-50%);
       font-family: inherit; font-size: 5vw; padding: 1em 1.4em;
       border: 0; border-radius: 999px; background: #3d2c4f; color: #fff8ef;
       text-decoration: none; box-shadow: 0.4vmin 0.6vmin 0 rgba(40,20,60,0.30); }
@media (orientation: landscape) {
  .pic { width: 24vw; top: 50vh; left: 28vw; }
  .cta { left: 64vw; top: 44vh; font-size: 7vw; }
  .btn { left: 64vw; bottom: auto; top: 64vh; font-size: 2.4vw; transform: translate(-50%, -50%); }
}
</style>
</head>
<body>
<div class="page sparkles">
  <div class="pic">
    <figure class="polaroid"><img src="${photoUrl}" alt="" /></figure>
  </div>
  <a class="grad cta" href="https://thiiss.me/create">tear your own →</a>
  <a class="btn" href="https://thiiss.me/create">make yours</a>
</div>
</body>
</html>`;
}

export function renderPage(kind, opts) {
  switch (kind) {
    case 'intro': return renderIntro(opts);
    case 'photo': return renderPhoto(opts);
    case 'final': return renderFinal(opts);
    default: throw new Error(`renderPage: unknown kind ${kind}`);
  }
}
