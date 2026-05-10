import { resolveSiteName, validateManifest } from './lib/route.js';
import { snapshotBasename, snapshotUrl } from './lib/snapshot-paths.js';

(async () => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const isCoarse = matchMedia('(pointer: coarse)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, isCoarse ? 1.5 : 2);

  const PAGE_SCALE = 2;
  const pageCanvas = document.createElement('canvas');
  const pageCtx = pageCanvas.getContext('2d');
  const bgCanvas = document.createElement('canvas');
  const bgCtx = bgCanvas.getContext('2d');
  let bgReady = false;

  const SITE_NAME = resolveSiteName(location.pathname, 'trung');

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`image failed: ${url}`));
      img.src = url;
    });
  }

  function show404() {
    document.body.innerHTML = `
      <div style="position:fixed;inset:0;display:grid;place-items:center;
                  font:600 16px -apple-system,sans-serif;color:#e6ecff;
                  background:radial-gradient(circle at 50% 30%,#1a1f2e 0%,#060810 70%);
                  text-align:center;padding:24px;">
        <div>
          <div style="font-size:32px;margin-bottom:12px;">site not found</div>
          <div style="opacity:.7;">no <code>sites/${SITE_NAME}/manifest.json</code></div>
        </div>
      </div>`;
  }

  let manifest, pages;
  try {
    const res = await fetch(`/sites/${SITE_NAME}/manifest.json`);
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    manifest = await res.json();
    validateManifest(manifest);
  } catch (err) {
    console.error(err);
    show404();
    return;
  }
  if (manifest.title) document.title = manifest.title;

  function currentOrientation() {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  async function loadPagesForOrientation(orientation) {
    return Promise.all(manifest.pages.map(async (p) => {
      if (p.final) return { kind: 'final', html: `/sites/${SITE_NAME}/${p.html}` };
      const base = snapshotBasename(p.html);
      const img = await loadImage(snapshotUrl(SITE_NAME, base, orientation));
      return { kind: 'snapshot', img };
    }));
  }

  pages = await loadPagesForOrientation(currentOrientation());
  let pagesOrientation = currentOrientation();

  // ---------- WebGL renderer for the cloth mesh ----------
  const glCanvas = document.getElementById('gl');
  const gl = glCanvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) {
    document.body.innerHTML = '<p style="padding:24px">WebGL is required for this page.</p>';
    return;
  }

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  }
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, `
    attribute vec2 a_pos;
    attribute vec2 a_uv;
    uniform vec2 u_size;
    varying vec2 v_uv;
    void main() {
      vec2 ndc = (a_pos / u_size) * 2.0 - 1.0;
      ndc.y = -ndc.y;
      gl_Position = vec4(ndc, 0.0, 1.0);
      v_uv = a_uv;
    }
  `));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform sampler2D u_tex;
    varying vec2 v_uv;
    void main() {
      gl_FragColor = texture2D(u_tex, v_uv);
    }
  `));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(program));
  const aPos  = gl.getAttribLocation(program, 'a_pos');
  const aUv   = gl.getAttribLocation(program, 'a_uv');
  const uSize = gl.getUniformLocation(program, 'u_size');
  const uTex  = gl.getUniformLocation(program, 'u_tex');

  const posBuf = gl.createBuffer();
  const uvBuf  = gl.createBuffer();
  const idxBuf = gl.createBuffer();
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let posArr = null;
  let uvArr  = null;
  let idxArr = null;
  let idxCount = 0;
  let idxDirty = true;

  function uploadPageTexture() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pageCanvas);
  }

  function buildClothBuffers() {
    const n = points.length;
    uvArr  = new Float32Array(n * 2);
    posArr = new Float32Array(n * 2);
    const invCx = 1 / (cols - 1);
    const invCy = 1 / (rows - 1);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        uvArr[i * 2]     = x * invCx;
        uvArr[i * 2 + 1] = y * invCy;
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, uvArr, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, posArr, gl.DYNAMIC_DRAW);
    idxArr = new Uint16Array((cols - 1) * (rows - 1) * 6);
    rebuildIndices();
  }
  function rebuildIndices() {
    let n = 0;
    for (let y = rows - 2; y >= 0; y--) {
      const rowOff = y * cols;
      for (let x = 0; x < cols - 1; x++) {
        const top    = hAlive[rowOff + x];
        const left   = vAlive[rowOff + x];
        const right  = vAlive[rowOff + x + 1];
        const bottom = hAlive[rowOff + cols + x];
        const i00 = rowOff + x;
        const i10 = rowOff + x + 1;
        const i01 = rowOff + cols + x;
        const i11 = rowOff + cols + x + 1;
        if (top && right) {
          idxArr[n++] = i00; idxArr[n++] = i10; idxArr[n++] = i11;
        }
        if (left && bottom) {
          idxArr[n++] = i00; idxArr[n++] = i11; idxArr[n++] = i01;
        }
      }
    }
    idxCount = n;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idxArr.subarray(0, n), gl.DYNAMIC_DRAW);
    idxDirty = false;
  }
  function renderGL() {
    if (!posArr) return;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      posArr[i * 2]     = p.x;
      posArr[i * 2 + 1] = p.y;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, posArr);
    if (idxDirty) rebuildIndices();
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform2f(uSize, W, H);

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uTex, 0);
    gl.drawElements(gl.TRIANGLES, idxCount, gl.UNSIGNED_SHORT, 0);
  }

  // ---------- pages ----------
  // Pages are loaded from the manifest as pre-rendered snapshots (PNG) for
  // every non-final page; the final page is rendered live in an iframe once
  // the user reaches the static-mode transition.

  // ---------- layer state ----------
  let currentLayer = 0;
  let originalLinks = 0;
  // Three-stage advance:
  //   1. Once enough free cells have fallen below the cloth's original
  //      bottom edge — i.e. visible chunks have ripped off and dropped —
  //      the cloth becomes "armed". armedAliveAt records the alive link
  //      count at that moment.
  //   2. The next tear after arming releases every pin on the current cloth
  //      and switches to FALLING: physics keeps running, input is locked,
  //      the entire cloth tumbles off-screen under gravity.
  //   3. Once every point of the old cloth is below screen, the next layer
  //      is built and becomes interactive.
  // Fallen-cell ratio is used (not torn-link ratio) because the pinned top +
  // sides keep most links structurally alive even when most of the visible
  // cloth has dropped away.
  let armedAliveAt = -1;
  const FALLEN_ARM_RATIO = 0.12;

  // FALLING-state: pins released, input locked, waiting for cloth to clear
  // the bottom of the screen. Bounded by FALL_TIMEOUT as a safety cap so a
  // single stuck point can't strand us in the transition forever.
  let falling = false;
  let fallingElapsed = 0;
  const FALL_TIMEOUT = 4.0;

  // STATIC-mode: the final layer is rendered as a plain 2D page, not a cloth.
  // Cloth simulation, GL rendering, and tear interactions are all disabled
  // once the user reaches the last page.
  let staticMode = false;

  function enterStaticMode() {
    staticMode = true;
    glCanvas.style.display = 'none';
    canvas.style.display = 'none';
    const final = pages[pages.length - 1];
    const iframe = document.createElement('iframe');
    iframe.src = final.html;
    iframe.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;background:#000;';
    document.body.appendChild(iframe);
  }

  function paintPage(page, p, target, w, h) {
    target.width = Math.max(1, Math.round(w * PAGE_SCALE));
    target.height = Math.max(1, Math.round(h * PAGE_SCALE));
    p.setTransform(PAGE_SCALE, 0, 0, PAGE_SCALE, 0, 0);
    p.clearRect(0, 0, w, h);
    if (page.kind === 'snapshot') {
      p.drawImage(page.img, 0, 0, w, h);
    } else {
      // final-page slot — draw a solid backdrop; the iframe handles real content
      p.fillStyle = '#000';
      p.fillRect(0, 0, w, h);
    }
  }

  function repaintLayers() {
    if (!cols) return;
    const cw = (cols - 1) * restX;
    const ch = (rows - 1) * restY;
    paintPage(pages[currentLayer], pageCtx, pageCanvas, cw, ch);
    uploadPageTexture();
    if (currentLayer + 1 < pages.length) {
      paintPage(pages[currentLayer + 1], bgCtx, bgCanvas, cw, ch);
      bgReady = true;
    } else {
      bgReady = false;
    }
  }

  // Release every pin on the current cloth and lock input. Physics keeps
  // running normally, so the still-connected cloth (or its surviving chunks)
  // tumbles off-screen as a coherent piece. step() polls each frame for
  // "every point below the screen"; once true, advanceLayer fires.
  function startFalling() {
    if (falling) return;
    if (currentLayer >= pages.length - 1) return;
    for (let i = 0; i < points.length; i++) points[i].pinned = false;
    // drop any in-progress drags so the falling cloth can't be held in place
    for (const data of pointers.values()) data.grabs = [];
    for (let i = 0; i < points.length; i++) points[i].grabbed = false;
    falling = true;
    fallingElapsed = 0;
  }

  function advanceLayer() {
    if (currentLayer >= pages.length - 1) return;
    currentLayer++;
    falling = false;
    fallingElapsed = 0;
    armedAliveAt = -1;
    if (currentLayer === pages.length - 1) {
      enterStaticMode();
      return;
    }
    buildCloth();
    buildLinkCounts();
    originalLinks = links.length;
  }

  function resetAll() {
    currentLayer = 0;
    falling = false;
    fallingElapsed = 0;
    armedAliveAt = -1;
    buildCloth();
    buildLinkCounts();
    originalLinks = links.length;
  }

  // ---------- world / cloth ----------
  let W = 0, H = 0;
  let cols = 0, rows = 0;
  let restX = 0, restY = 0;
  let originX = 0, originY = 0;

  const GRAVITY = 5000;
  const DAMPING = 0.99;
  const ITER = isCoarse ? 8 : 14;
  const SUBSTEPS = isCoarse ? 2 : 3;
  const SLOW_TEAR_MULT = 5;
  const FAST_TEAR_MULT = 1.8;
  const TEAR_VEL_REF = 700;
  const HARD_TEAR_MULT = 10;
  const WEAKNESS_FACTOR = 1.6;
  const WEAKNESS_FLOOR = 0.2;
  const CASCADE_PASSES = 2;
  const FIXED_DT = 1 / 60;
  const GRAB_RADIUS_MIN = 30;
  const GRAB_AREA_CELLS = 10;

  let points = [];
  let links  = [];
  let pinIds = [];
  let originalLinkCount = null;
  let aliveLinkCount = null;
  let hAlive = null;
  let vAlive = null;

  function buildLinkCounts() {
    originalLinkCount = new Int8Array(points.length);
    aliveLinkCount = new Int8Array(points.length);
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      originalLinkCount[l.a]++;
      originalLinkCount[l.b]++;
      if (l.alive) {
        aliveLinkCount[l.a]++;
        aliveLinkCount[l.b]++;
      }
    }
  }
  function killLink(l) {
    if (!l.alive) return;
    l.alive = false;
    aliveLinkCount[l.a]--;
    aliveLinkCount[l.b]--;
    if (l.h) hAlive[l.gy * cols + l.gx] = 0;
    else     vAlive[l.gy * cols + l.gx] = 0;
    idxDirty = true;
  }

  function buildCloth() {
    points = []; links = []; pinIds = [];

    const usableW = W;
    const usableH = H;

    cols = isCoarse
      ? Math.min(48, Math.max(30, Math.round(W / 12)))
      : Math.round(Math.min(170, Math.max(90, W / 5.6)));
    const minRows = isCoarse ? 28 : 70;
    restX = usableW / (cols - 1);
    rows = Math.max(minRows, Math.round(usableH / restX) + 1);
    restY = usableH / (rows - 1);

    originX = 0;
    originY = 0;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = originX + x * restX;
        const py = originY + y * restY;
        points.push({
          x: px, y: py, px: px, py: py,
          initX: px, initY: py,
          pinned: false,
          corner: null,
        });
      }
    }
    const idx = (x, y) => y * cols + x;

    hAlive = new Uint8Array(cols * rows);
    vAlive = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (x < cols - 1) {
          links.push({ a: idx(x, y), b: idx(x + 1, y), rest: restX, alive: true, prevDist: restX, h: true,  gx: x, gy: y });
          hAlive[y * cols + x] = 1;
        }
        if (y < rows - 1) {
          links.push({ a: idx(x, y), b: idx(x, y + 1), rest: restY, alive: true, prevDist: restY, h: false, gx: x, gy: y });
          vAlive[y * cols + x] = 1;
        }
      }
    }
    for (let x = 0; x < cols; x++) points[idx(x, 0)].pinned = true;
    for (let y = 0; y < rows; y++) {
      points[idx(0, y)].pinned = true;
      points[idx(cols - 1, y)].pinned = true;
    }
    const corners = [
      { id: idx(0, 0),               name: 'tl' },
      { id: idx(cols - 1, 0),        name: 'tr' },
      { id: idx(0, rows - 1),        name: 'bl' },
      { id: idx(cols - 1, rows - 1), name: 'br' },
    ];
    for (const c of corners) {
      points[c.id].corner = c.name;
      pinIds.push(c.id);
    }

    repaintLayers();
    buildClothBuffers();
  }

  // ---------- simulation ----------
  function step(dt) {
    if (staticMode) return;
    syncGrabs();
    const sub = dt / SUBSTEPS;
    for (let s = 0; s < SUBSTEPS; s++) substep(sub);

    if (falling) {
      fallingElapsed += dt;
      // Wait for every point to clear the bottom of the screen before
      // building the next layer. The timeout is a safety net only.
      const limit = H + 100;
      let allGone = true;
      for (let i = 0; i < points.length; i++) {
        if (points[i].y < limit) { allGone = false; break; }
      }
      if (allGone || fallingElapsed > FALL_TIMEOUT) advanceLayer();
      return;
    }

    if (currentLayer < pages.length - 1 && originalLinks > 0) {
      let alive = 0;
      for (let i = 0; i < links.length; i++) if (links[i].alive) alive++;
      if (armedAliveAt < 0) {
        const fallenY = originY + (rows - 1) * restY + 60;
        let fallen = 0, free = 0;
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          if (p.pinned) continue;
          free++;
          if (p.y > fallenY) fallen++;
        }
        if (free > 0 && fallen / free > FALLEN_ARM_RATIO) armedAliveAt = alive;
      } else if (alive < armedAliveAt) {
        startFalling();
      }
    }
  }

  function syncGrabs() {
    for (let i = 0; i < points.length; i++) points[i].grabbed = false;
    for (const data of pointers.values()) {
      if (!data.grabs) continue;
      for (let j = 0; j < data.grabs.length; j++) {
        const g = data.grabs[j];
        const p = points[g.id];
        p.grabbed = true;
        p.grabX = data.x + g.ox;
        p.grabY = data.y + g.oy;
      }
    }
  }

  function substep(dt) {
    const dt2 = dt * dt;
    const gravY = GRAVITY * dt2;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.pinned) {
        p.x = p.initX; p.y = p.initY;
        p.px = p.x;    p.py = p.y;
        continue;
      }
      if (p.grabbed) {
        p.x = p.grabX; p.y = p.grabY;
        p.px = p.x;    p.py = p.y;
        continue;
      }
      const vx = (p.x - p.px) * DAMPING;
      const vy = (p.y - p.py) * DAMPING;
      p.px = p.x; p.py = p.y;
      p.x += vx;
      p.y += vy + gravY;
    }

    for (let k = 0; k < ITER; k++) {
      for (let i = 0; i < links.length; i++) {
        const l = links[i];
        if (!l.alive) continue;
        const a = points[l.a], b = points[l.b];
        let dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        const dist = d2 > 1e-8 ? Math.sqrt(d2) : 0.0001;
        if (dist > l.rest * HARD_TEAR_MULT) {
          killLink(l);
          continue;
        }
        const diff = (dist - l.rest) / dist;
        const offX = dx * 0.5 * diff;
        const offY = dy * 0.5 * diff;
        const aLocked = a.pinned || a.grabbed;
        const bLocked = b.pinned || b.grabbed;
        if (!aLocked) { a.x += offX; a.y += offY; }
        if (!bLocked) { b.x -= offX; b.y -= offY; }
      }
    }

    const velRefInv = 1 / TEAR_VEL_REF;
    const tearSpan = SLOW_TEAR_MULT - FAST_TEAR_MULT;
    for (let pass = 0; pass < CASCADE_PASSES; pass++) {
      let didTear = false;
      for (let i = 0; i < links.length; i++) {
        const l = links[i];
        if (!l.alive) continue;
        const a = points[l.a], b = points[l.b];
        const ddx = b.x - a.x, ddy = b.y - a.y;
        const dd2 = ddx * ddx + ddy * ddy;
        const dist = dd2 > 1e-8 ? Math.sqrt(dd2) : 0.0001;
        if (pass === 0) {
          const sv = (dist - l.prevDist) / dt;
          l.velCache = sv > 0 ? sv : 0;
          l.prevDist = dist;
        }
        if (dist <= l.rest) continue;
        const vf = l.velCache * velRefInv;
        const velFactor = vf > 1 ? 1 : vf;
        const baseMult = SLOW_TEAR_MULT - tearSpan * velFactor;
        const ocA = originalLinkCount[l.a];
        const ocB = originalLinkCount[l.b];
        const wA = ocA ? 1 - aliveLinkCount[l.a] / ocA : 0;
        const wB = ocB ? 1 - aliveLinkCount[l.b] / ocB : 0;
        const weakness = (wA + wB) * 0.5;
        let weakenScale = 1 - WEAKNESS_FACTOR * weakness;
        if (weakenScale < WEAKNESS_FLOOR) weakenScale = WEAKNESS_FLOOR;
        const effMult = baseMult * weakenScale;
        if (dist > l.rest * effMult) {
          killLink(l);
          didTear = true;
        }
      }
      if (!didTear) break;
    }

    const floor = H + 200;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.y > floor) { p.y = floor; p.py = floor; }
    }
  }

  // ---------- grabbing via pointer ----------
  const pointers = new Map();
  function findGrabPoints(x, y) {
    const r = Math.max(restX * GRAB_AREA_CELLS, GRAB_RADIUS_MIN);
    const r2 = r * r;
    const grabs = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.pinned) continue;
      const dx = p.x - x, dy = p.y - y;
      if (dx * dx + dy * dy < r2) {
        grabs.push({ id: i, ox: p.x - x, oy: p.y - y });
      }
    }
    return grabs;
  }
  function tryReleaseCorner(x, y) {
    const r = Math.max(18, Math.min(W, H) * 0.04);
    const r2 = r * r;
    for (const id of pinIds) {
      const p = points[id];
      if (!p.pinned) continue;
      const dx = p.x - x, dy = p.y - y;
      if (dx * dx + dy * dy <= r2) {
        p.pinned = false;
        return true;
      }
    }
    return false;
  }

  // ---------- rendering ----------
  // 2D layer paints the *next* page (as a backdrop the size of the cloth) plus
  // pin halos, then GL paints the current cloth on top. Holes in the cloth
  // reveal the next page beneath.
  function render() {
    if (staticMode) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    if (bgReady && currentLayer + 1 < pages.length) {
      const cw = (cols - 1) * restX;
      const ch = (rows - 1) * restY;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bgCanvas, originX, originY, cw, ch);
    }

    for (const id of pinIds) {
      const p = points[id];
      if (p.pinned) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(122,176,255,0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.pinned ? 9 : 6, 0, Math.PI * 2);
      ctx.fillStyle = p.pinned ? '#7ab0ff' : 'rgba(255,255,255,0.25)';
      ctx.fill();
    }
    renderGL();
  }

  // ---------- pointer events ----------
  function pointerPos(e) {
    const rect = glCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  glCanvas.addEventListener('pointerdown', (e) => {
    if (falling) return; // input is locked while the previous cloth tumbles off
    glCanvas.setPointerCapture(e.pointerId);
    const p = pointerPos(e);
    if (tryReleaseCorner(p.x, p.y)) {
      pointers.set(e.pointerId, { x: p.x, y: p.y, grabs: [] });
      return;
    }
    const grabs = findGrabPoints(p.x, p.y);
    pointers.set(e.pointerId, { x: p.x, y: p.y, grabs });
  });
  glCanvas.addEventListener('pointermove', (e) => {
    const data = pointers.get(e.pointerId);
    if (!data) return;
    const p = pointerPos(e);
    data.x = p.x; data.y = p.y;
  });
  function endPointer(e) {
    const data = pointers.get(e.pointerId);
    if (data && data.grabs) {
      for (let j = 0; j < data.grabs.length; j++) {
        points[data.grabs[j].id].grabbed = false;
      }
    }
    pointers.delete(e.pointerId);
  }
  glCanvas.addEventListener('pointerup', endPointer);
  glCanvas.addEventListener('pointercancel', endPointer);
  glCanvas.addEventListener('pointerleave', endPointer);
  glCanvas.addEventListener('contextmenu', e => e.preventDefault());

  // ---------- resize ----------
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    const pw = Math.floor(W * DPR);
    const ph = Math.floor(H * DPR);
    canvas.width  = pw; canvas.height = ph;
    canvas.style.width  = W + 'px'; canvas.style.height = H + 'px';
    glCanvas.width  = pw; glCanvas.height = ph;
    glCanvas.style.width  = W + 'px'; glCanvas.style.height = H + 'px';
    if (staticMode) {
      // iframe scales itself via inset:0;width:100%;height:100%
      return;
    }
    buildCloth();
    buildLinkCounts();
    originalLinks = links.length;
    armedAliveAt = -1;
    falling = false;
    fallingElapsed = 0;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  // ---------- main loop ----------
  let acc = 0, last = performance.now();
  function frame(now) {
    const raw = (now - last) / 1000;
    last = now;
    acc += Math.min(raw, 0.05);
    while (acc >= FIXED_DT) {
      step(FIXED_DT);
      acc -= FIXED_DT;
    }
    render();
    requestAnimationFrame(frame);
  }

  resize();
  requestAnimationFrame(frame);
})();
