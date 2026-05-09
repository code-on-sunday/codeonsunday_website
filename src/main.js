(() => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const isCoarse = matchMedia('(pointer: coarse)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, isCoarse ? 1.5 : 2);

  // The "page" is painted once into an offscreen canvas and uploaded as a
  // single texture for the cloth mesh. The "bgPage" is painted to a second
  // offscreen canvas and drawn behind the cloth on the 2D layer — when cloth
  // tears, the next page peeks through the holes.
  const PAGE_SCALE = 2;
  const pageCanvas = document.createElement('canvas');
  const pageCtx = pageCanvas.getContext('2d');
  const bgCanvas = document.createElement('canvas');
  const bgCtx = bgCanvas.getContext('2d');
  let bgReady = false;

  // ---------- image registry ----------
  // Pages reference photos by key. Until an image loads, a labeled placeholder
  // is drawn so the layout always renders. Wire real URLs into IMG_SOURCES
  // below — uncomment a line and point it at the photo path/URL.
  const IMAGES = {};
  const IMG_SOURCES = {
    'trung':       'photos/trung.webp',
    'river':       'photos/river.webp',
    'hanoi':       'photos/hanoi.webp',
    'vietnam':     'photos/vietnam.webp',
    'badminton':   'photos/badminton.webp',
    'bad':         'photos/bad.webp',
    'good':        'photos/good.jpg',
    'not-help':    'photos/not-help.webp',
    'this-help':   'photos/this-help.webp',
    'friends':     'photos/say-hi.webp',
    'snes':           'photos/logos/snes.svg',
    'gameboy':        'photos/logos/gameboy.svg',
    'little-fighter': 'photos/logos/little-fighter.png',
    'worms':          'photos/logos/worms.png',
    'internet':       'photos/logos/internet.svg',
    'yahoo':          'photos/logos/yahoo.svg',
    'facebook':       'photos/logos/facebook.svg',
    'gunbound':       'photos/logos/gunbound.jpg',
    'diablo2':        'photos/logos/diablo2.png',
    'powerpoint':     'photos/logos/powerpoint.svg',
    'pascal':         'photos/logos/pascal.jpg',
    'cpp':            'photos/logos/cpp.svg',
    'warcraft-ft':    'photos/logos/warcraft-ft.jpg',
  };
  function loadImage(key, url) {
    const img = new Image();
    img.onload  = () => { IMAGES[key] = img; repaintLayers(); };
    img.onerror = () => console.warn('image load failed:', key, url);
    img.src = url;
  }
  for (const k in IMG_SOURCES) loadImage(k, IMG_SOURCES[k]);

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

  // ---------- playful paint helpers ----------
  const PLAYFUL = `"Marker Felt", "Comic Sans MS", "Bradley Hand", "Chalkboard SE", cursive`;

  function paintBackground(p, w, h, top, mid, bot) {
    const bg = p.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, top);
    bg.addColorStop(0.5, mid);
    bg.addColorStop(1, bot);
    p.fillStyle = bg;
    p.fillRect(0, 0, w, h);
  }
  function paintSparkles(p, w, h, count = 36, alpha = 0.55) {
    p.fillStyle = `rgba(255,255,255,${alpha})`;
    for (let i = 0; i < count; i++) {
      const u = ((i * 73 + 19) % 100) / 100;
      const v = ((i * 41 + 7)  % 100) / 100;
      const r = 2 + (i % 4) * 1.5;
      p.beginPath();
      p.arc(u * w, v * h, r, 0, Math.PI * 2);
      p.fill();
    }
  }
  function paintWavy(p, x1, x2, y, color, lw, amp, cycles = 4) {
    p.strokeStyle = color;
    p.lineWidth = lw;
    p.lineCap = 'round';
    p.beginPath();
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const ux = x1 + (x2 - x1) * t;
      const wob = Math.sin(t * Math.PI * cycles) * amp;
      if (i === 0) p.moveTo(ux, y + wob);
      else p.lineTo(ux, y + wob);
    }
    p.stroke();
  }
  function paintGradText(p, text, x, y, size, fromColor, toColor, rotate = 0) {
    p.save();
    p.translate(x, y);
    p.rotate(rotate);
    p.font = `bold italic ${Math.round(size)}px ${PLAYFUL}`;
    p.textAlign = 'center';
    p.textBaseline = 'middle';
    p.fillStyle = 'rgba(40,20,60,0.28)';
    p.fillText(text, size * 0.05, size * 0.05);
    const tg = p.createLinearGradient(-size * 1.5, 0, size * 1.5, 0);
    tg.addColorStop(0, fromColor);
    tg.addColorStop(1, toColor);
    p.fillStyle = tg;
    p.fillText(text, 0, 0);
    p.restore();
  }
  function paintText(p, text, x, y, size, color, opts = {}) {
    p.save();
    p.translate(x, y);
    p.rotate(opts.rotate || 0);
    p.fillStyle = color;
    const style = `${opts.style || ''} ${opts.weight || ''} ${Math.round(size)}px ${PLAYFUL}`.trim();
    p.font = style.replace(/  +/g, ' ');
    p.textAlign = opts.align || 'center';
    p.textBaseline = opts.baseline || 'middle';
    p.fillText(text, 0, 0);
    p.restore();
  }
  // Polaroid-style photo card: shadow, off-white frame, photo (or labeled
  // placeholder if image not yet loaded), caption strip below.
  function paintPolaroid(p, x, y, w, h, label, key, rotate = 0) {
    p.save();
    p.translate(x, y);
    p.rotate(rotate);
    p.fillStyle = 'rgba(40,20,60,0.30)';
    p.fillRect(-w / 2 + w * 0.03, -h / 2 + h * 0.04, w, h);
    p.fillStyle = '#fff8ef';
    p.fillRect(-w / 2, -h / 2, w, h);
    const pad = w * 0.05;
    const px = -w / 2 + pad;
    const py = -h / 2 + pad;
    const pw = w - pad * 2;
    const ph = h - pad - w * 0.18;
    const img = IMAGES[key];
    if (img) {
      p.save();
      p.beginPath();
      p.rect(px, py, pw, ph);
      p.clip();
      const imgAR = img.width / img.height;
      const boxAR = pw / ph;
      let dw, dh, dx, dy;
      if (imgAR > boxAR) {
        dh = ph; dw = ph * imgAR;
        dx = px - (dw - pw) / 2; dy = py;
      } else {
        dw = pw; dh = pw / imgAR;
        dx = px; dy = py - (dh - ph) / 2;
      }
      p.drawImage(img, dx, dy, dw, dh);
      p.restore();
    } else {
      const grad = p.createLinearGradient(px, py, px + pw, py + ph);
      grad.addColorStop(0, '#ffe8d6');
      grad.addColorStop(1, '#cdb4db');
      p.fillStyle = grad;
      p.fillRect(px, py, pw, ph);
      p.strokeStyle = 'rgba(60,30,80,0.45)';
      p.setLineDash([6, 4]);
      p.lineWidth = 1.5;
      p.strokeRect(px, py, pw, ph);
      p.setLineDash([]);
      p.fillStyle = 'rgba(60,30,80,0.55)';
      p.font = `${Math.round(w * 0.075)}px ${PLAYFUL}`;
      p.textAlign = 'center';
      p.textBaseline = 'middle';
      p.fillText('photo:', px + pw / 2, py + ph / 2 - w * 0.04);
      p.fillText(label, px + pw / 2, py + ph / 2 + w * 0.05);
    }
    p.fillStyle = '#3d2c4f';
    p.font = `italic ${Math.round(w * 0.072)}px ${PLAYFUL}`;
    p.textAlign = 'center';
    p.textBaseline = 'middle';
    p.fillText(label, 0, h / 2 - w * 0.085);
    p.restore();
  }
  // Dark social-card frame with the image rendered "contain" (no crop), then
  // an optional X or check mark drawn on top.
  function paintTweet(p, x, y, w, h, key, rotate, mark) {
    p.save();
    p.translate(x, y);
    p.rotate(rotate || 0);
    p.fillStyle = 'rgba(0,0,0,0.40)';
    p.fillRect(-w / 2 + w * 0.02, -h / 2 + h * 0.05, w, h);
    p.fillStyle = '#000';
    p.fillRect(-w / 2, -h / 2, w, h);
    const pad = w * 0.012;
    const px = -w / 2 + pad;
    const py = -h / 2 + pad;
    const pw = w - pad * 2;
    const ph = h - pad * 2;
    const img = IMAGES[key];
    if (img) {
      const imgAR = img.width / img.height;
      const boxAR = pw / ph;
      let dw, dh, dx, dy;
      if (imgAR > boxAR) {
        dw = pw; dh = pw / imgAR;
        dx = px; dy = py + (ph - dh) / 2;
      } else {
        dh = ph; dw = ph * imgAR;
        dx = px + (pw - dw) / 2; dy = py;
      }
      p.drawImage(img, dx, dy, dw, dh);
    } else {
      p.fillStyle = '#1a1a1a';
      p.fillRect(px, py, pw, ph);
      p.fillStyle = 'rgba(255,255,255,0.4)';
      p.font = `${Math.round(Math.min(w, h) * 0.18)}px ${PLAYFUL}`;
      p.textAlign = 'center';
      p.textBaseline = 'middle';
      p.fillText(key, 0, 0);
    }
    if (mark === 'x') {
      const ms = Math.min(w, h) * 0.65;
      p.strokeStyle = 'rgba(220,38,38,0.95)';
      p.lineWidth = ms * 0.20;
      p.lineCap = 'round';
      p.beginPath();
      p.moveTo(-ms / 2, -ms / 2); p.lineTo(ms / 2, ms / 2);
      p.moveTo(ms / 2, -ms / 2); p.lineTo(-ms / 2, ms / 2);
      p.stroke();
    } else if (mark === 'check') {
      const ms = Math.min(w, h) * 0.55;
      p.strokeStyle = 'rgba(34,197,94,0.95)';
      p.lineWidth = ms * 0.18;
      p.lineCap = 'round';
      p.lineJoin = 'round';
      p.beginPath();
      p.moveTo(-ms * 0.45, 0);
      p.lineTo(-ms * 0.10, ms * 0.36);
      p.lineTo(ms * 0.50, -ms * 0.40);
      p.stroke();
    }
    p.restore();
  }
  // White card with a logo image inside — used on the nostalgia layer.
  // Image is rendered "contain" so wordmarks and box arts both fit.
  function paintLogoChip(p, x, y, size, key, rotate = 0) {
    p.save();
    p.translate(x, y);
    p.rotate(rotate);
    p.fillStyle = 'rgba(20,10,40,0.30)';
    p.fillRect(-size / 2 + size * 0.04, -size / 2 + size * 0.05, size, size);
    p.fillStyle = '#fff';
    p.fillRect(-size / 2, -size / 2, size, size);
    const pad = size * 0.10;
    const ix = -size / 2 + pad;
    const iy = -size / 2 + pad;
    const iw = size - pad * 2;
    const ih = size - pad * 2;
    const img = IMAGES[key];
    if (img) {
      const imgAR = img.width / img.height;
      const boxAR = iw / ih;
      let dw, dh, dx, dy;
      if (imgAR > boxAR) {
        dw = iw; dh = iw / imgAR;
        dx = ix; dy = iy + (ih - dh) / 2;
      } else {
        dh = ih; dw = ih * imgAR;
        dx = ix + (iw - dw) / 2; dy = iy;
      }
      p.drawImage(img, dx, dy, dw, dh);
    } else {
      p.fillStyle = '#eee';
      p.fillRect(ix, iy, iw, ih);
    }
    p.restore();
  }
  // Sticky-note chip with shadow — used on the nostalgia layer.
  function paintChip(p, text, x, y, size, fill, color, rotate = 0) {
    p.save();
    p.translate(x, y);
    p.rotate(rotate);
    p.font = `bold ${Math.round(size)}px ${PLAYFUL}`;
    p.textAlign = 'center';
    p.textBaseline = 'middle';
    const tw = p.measureText(text).width;
    const padx = size * 0.6, pady = size * 0.45;
    const bw = tw + padx * 2;
    const bh = size + pady * 2;
    p.fillStyle = 'rgba(20,10,40,0.35)';
    p.fillRect(-bw / 2 + size * 0.07, -bh / 2 + size * 0.07, bw, bh);
    p.fillStyle = fill;
    p.fillRect(-bw / 2, -bh / 2, bw, bh);
    p.fillStyle = color;
    p.fillText(text, 0, 0);
    p.restore();
  }

  // ---------- pages ----------
  // Each page is a paint(ctx, w, h) function rendered into pageCanvas (and into
  // bgCanvas for the layer one ahead, so it shows through the holes).
  const PAGES = [
    // 0 — name + photo
    {
      paint(p, w, h) {
        paintBackground(p, w, h, '#ffd6a5', '#ffadad', '#bdb2ff');
        paintSparkles(p, w, h);

        // Portrait (mobile): photo is the hero — big and centered. Landscape
        // (desktop): photo sits to the right of the name.
        if (h > w) {
          p.save();
          p.fillStyle = '#3d2c4f';
          p.font = `italic ${Math.round(w * 0.10)}px ${PLAYFUL}`;
          p.textAlign = 'left';
          p.textBaseline = 'middle';
          p.translate(w * 0.10, h * 0.07);
          p.rotate(-0.07);
          p.fillText('hello,', 0, 0);
          p.restore();

          const cardW = w * 0.66;
          const cardH = w * 0.78;
          paintPolaroid(p, w * 0.50, h * 0.36, cardW, cardH, 'me', 'trung', -0.04);

          paintText(p, 'my name is', w * 0.50, h * 0.66, w * 0.075, '#5b3a8a');
          paintGradText(p, 'Trung', w * 0.50, h * 0.78, w * 0.30, '#ff5e8a', '#ff9a3c', -0.04);
          paintWavy(p, w * 0.20, w * 0.80, h * 0.86, '#ff5e8a', w * 0.012, w * 0.016);
        } else {
          paintPolaroid(p, w * 0.78, h * 0.30, w * 0.22, w * 0.26, 'me', 'trung', 0.08);

          p.save();
          p.fillStyle = '#3d2c4f';
          p.font = `italic ${Math.round(w * 0.06)}px ${PLAYFUL}`;
          p.textAlign = 'left';
          p.textBaseline = 'middle';
          p.translate(w * 0.10, h * 0.18);
          p.rotate(-0.07);
          p.fillText('hello,', 0, 0);
          p.restore();

          paintText(p, 'my name is', w * 0.40, h * 0.40, w * 0.055, '#5b3a8a',
            { align: 'center' });

          paintGradText(p, 'Trung', w * 0.40, h * 0.58, w * 0.20, '#ff5e8a', '#ff9a3c', -0.04);

          paintWavy(p, w * 0.16, w * 0.64, h * 0.70, '#ff5e8a', w * 0.01, w * 0.012);
        }
      }
    },
    // 1 — Hà Nội, Việt Nam
    {
      paint(p, w, h) {
        paintBackground(p, w, h, '#caf0f8', '#90e0ef', '#a4c3b2');
        paintSparkles(p, w, h, 28, 0.45);

        if (h > w) {
          paintText(p, "I'm from", w / 2, h * 0.07, w * 0.055, '#1f3b3b', { style: 'italic' });
          paintGradText(p, 'Hà Nội', w / 2, h * 0.16, w * 0.22, '#ff5e8a', '#e63946', -0.03);
          paintText(p, 'Việt Nam', w / 2, h * 0.24, w * 0.085, '#1f3b3b',
            { style: 'italic', weight: 'bold' });

          paintWavy(p, w * 0.20, w * 0.80, h * 0.30, '#1f7a8c', w * 0.010, w * 0.012, 6);

          // Scattered stack of polaroids — each ~50% page width, overlapping.
          const pw = w * 0.50, ph = w * 0.58;
          paintPolaroid(p, w * 0.30, h * 0.50, pw, ph, 'red river', 'river',  -0.12);
          paintPolaroid(p, w * 0.66, h * 0.62, pw, ph, 'Hanoi',     'hanoi',   0.07);
          paintPolaroid(p, w * 0.42, h * 0.78, pw, ph, 'việt nam',  'vietnam',-0.05);
        } else {
          paintText(p, "I'm from", w / 2, h * 0.10, w * 0.04, '#1f3b3b', { style: 'italic' });
          paintGradText(p, 'Hà Nội', w / 2, h * 0.22, w * 0.16, '#ff5e8a', '#e63946', -0.03);
          paintText(p, 'Việt Nam', w / 2, h * 0.32, w * 0.06, '#1f3b3b',
            { style: 'italic', weight: 'bold' });

          paintWavy(p, w * 0.20, w * 0.80, h * 0.40, '#1f7a8c', w * 0.008, w * 0.009, 6);

          const py = h * 0.62;
          const pw = w * 0.21, ph = w * 0.25;
          paintPolaroid(p, w * 0.20, py,            pw, ph, 'red river', 'river',  -0.10);
          paintPolaroid(p, w * 0.50, py + h * 0.02, pw, ph, 'Hanoi',     'hanoi',   0.04);
          paintPolaroid(p, w * 0.80, py - h * 0.01, pw, ph, 'việt nam',  'vietnam',-0.06);
        }
      }
    },
    // 2 — badminton
    {
      paint(p, w, h) {
        paintBackground(p, w, h, '#fdf6c8', '#bef264', '#7cd6a8');
        paintSparkles(p, w, h, 32, 0.5);

        if (h > w) {
          p.save();
          p.fillStyle = '#2a4d2c';
          p.font = `italic ${Math.round(w * 0.055)}px ${PLAYFUL}`;
          p.textAlign = 'left';
          p.textBaseline = 'middle';
          p.translate(w * 0.12, h * 0.06);
          p.rotate(-0.05);
          p.fillText('right now', 0, 0);
          p.restore();

          paintText(p, "I'm learning to swing a", w / 2, h * 0.16, w * 0.062, '#2a4d2c');
          paintGradText(p, 'badminton racket', w / 2, h * 0.26, w * 0.110, '#16a34a', '#0ea5e9', 0.02);

          paintPolaroid(p, w * 0.50, h * 0.62, w * 0.78, w * 0.92, 'smash', 'badminton', -0.03);
        } else {
          p.save();
          p.fillStyle = '#2a4d2c';
          p.font = `italic ${Math.round(w * 0.04)}px ${PLAYFUL}`;
          p.textAlign = 'left';
          p.textBaseline = 'middle';
          p.translate(w * 0.16, h * 0.13);
          p.rotate(-0.05);
          p.fillText('right now', 0, 0);
          p.restore();

          paintText(p, "I'm learning to swing a", w / 2, h * 0.23, w * 0.05, '#2a4d2c');
          paintGradText(p, 'badminton racket', w / 2, h * 0.36, w * 0.105, '#16a34a', '#0ea5e9', 0.02);

          paintPolaroid(p, w * 0.50, h * 0.70, w * 0.30, w * 0.36, 'smash', 'badminton', -0.03);
        }
      }
    },
    // 3 — i'm 32, i grew up with...
    {
      paint(p, w, h) {
        paintBackground(p, w, h, '#ffd1ef', '#c084fc', '#7c3aed');
        paintSparkles(p, w, h, 50, 0.5);

        const logos = [
          'snes', 'gameboy', 'little-fighter', 'worms',
          'internet', 'yahoo', 'facebook', 'gunbound',
          'diablo2', 'powerpoint', 'pascal', 'cpp',
          'warcraft-ft',
        ];
        // pseudo-random rotation per index for that scattered-sticker feel
        const rot = (i) => (((i * 31 + 17) % 21) - 10) * 0.012;

        if (h > w) {
          paintGradText(p, "I'm 32", w / 2, h * 0.06, w * 0.13,
            '#fffae3', '#fde68a', -0.02);
          paintText(p, 'and I grew up with —', w / 2, h * 0.13, w * 0.040,
            'rgba(255,255,255,0.85)', { style: 'italic' });

          // 3 cols × 4 rows + 1 centered = 13
          const xs = [0.20, 0.50, 0.80];
          const ys = [0.27, 0.42, 0.57, 0.72];
          const size = w * 0.24;
          for (let i = 0; i < 12; i++) {
            paintLogoChip(p, w * xs[i % 3], h * ys[Math.floor(i / 3)], size,
              logos[i], rot(i));
          }
          paintLogoChip(p, w * 0.50, h * 0.87, size, logos[12], rot(12));
        } else {
          paintGradText(p, "I'm 32", w / 2, h * 0.13, w * 0.13,
            '#fffae3', '#fde68a', -0.02);
          paintText(p, 'and I grew up with —', w / 2, h * 0.24, w * 0.040,
            'rgba(255,255,255,0.85)', { style: 'italic' });

          // 4 cols × 3 rows + 1 centered = 13
          const xs = [0.16, 0.39, 0.62, 0.85];
          const ys = [0.42, 0.58, 0.74];
          const size = w * 0.13;
          for (let i = 0; i < 12; i++) {
            paintLogoChip(p, w * xs[i % 4], h * ys[Math.floor(i / 4)], size,
              logos[i], rot(i));
          }
          paintLogoChip(p, w * 0.50, h * 0.91, size, logos[12], rot(12));
        }
      }
    },
    // 4 — side projects (depressive tone)
    {
      paint(p, w, h) {
        paintBackground(p, w, h, '#3d3a4d', '#26233a', '#0f0d1a');
        paintSparkles(p, w, h, 14, 0.18);

        if (h > w) {
          paintText(p, '+ 4 side projects that made money', w / 2, h * 0.10, w * 0.050, '#cdc4d6');
          paintText(p, "I never figured out how to keep them going.", w / 2, h * 0.17,
            w * 0.040, '#9a92a6', { style: 'italic' });
          paintText(p, 'or how to live on social media.', w / 2, h * 0.22, w * 0.040,
            '#9a92a6', { style: 'italic' });

          paintPolaroid(p, w * 0.50, h * 0.62, w * 0.78, w * 0.92,
            'side projects', 'bad', -0.04);
        } else {
          const tx = w * 0.28;
          paintText(p, '+ 4 side projects that made money', tx, h * 0.40, w * 0.038, '#cdc4d6');
          paintText(p, "I never figured out how to keep them going.", tx, h * 0.50,
            w * 0.032, '#9a92a6', { style: 'italic' });
          paintText(p, 'or how to live on social media.', tx, h * 0.56, w * 0.032,
            '#9a92a6', { style: 'italic' });

          paintPolaroid(p, w * 0.74, h * 0.50, w * 0.32, w * 0.38,
            'side projects', 'bad', -0.04);
        }
      }
    },
    // 5 — writing 3 lines (god-light tone)
    {
      paint(p, w, h) {
        paintBackground(p, w, h, '#ffffff', '#fff5cc', '#ffd47a');
        paintSparkles(p, w, h, 60, 0.75);

        if (h > w) {
          paintText(p, "so I'm trying something else —", w / 2, h * 0.08, w * 0.048, '#3d2410');
          paintText(p, 'for every thing I do — 3 lines:', w / 2, h * 0.15, w * 0.042,
            'rgba(60,40,20,0.85)', { style: 'italic' });

          const bullets = ['· what it is', '· how I feel', '· what I learned'];
          for (let i = 0; i < bullets.length; i++) {
            paintText(p, bullets[i], w / 2, h * (0.23 + i * 0.05), w * 0.040, '#5b3a1f');
          }

          paintPolaroid(p, w * 0.50, h * 0.70, w * 0.74, w * 0.86, 'writing', 'good', -0.03);
        } else {
          const tx = w * 0.28;
          paintText(p, "so I'm trying something else —", tx, h * 0.30, w * 0.038, '#3d2410');
          paintText(p, 'for every thing I do — 3 lines:', tx, h * 0.40, w * 0.032,
            'rgba(60,40,20,0.85)', { style: 'italic' });

          const bullets = ['· what it is', '· how I feel', '· what I learned'];
          for (let i = 0; i < bullets.length; i++) {
            paintText(p, bullets[i], tx, h * (0.50 + i * 0.05), w * 0.032, '#5b3a1f');
          }

          paintPolaroid(p, w * 0.74, h * 0.50, w * 0.32, w * 0.38, 'writing', 'good', -0.03);
        }
      }
    },
    // 6 — real people, less noise (two contrasting tweets)
    {
      paint(p, w, h) {
        paintBackground(p, w, h, '#d8f3dc', '#b7e4c7', '#95d5b2');
        paintSparkles(p, w, h, 22, 0.4);

        if (h > w) {
          paintText(p, 'I stopped reading opinions on social.', w / 2, h * 0.05,
            w * 0.038, '#1f3b3b');
          paintText(p, 'I read real people instead —', w / 2, h * 0.10, w * 0.032,
            '#2a4d2c', { style: 'italic' });
          paintText(p, 'they move slower than the noise.', w / 2, h * 0.145, w * 0.032,
            '#2a4d2c', { style: 'italic' });
          paintText(p, 'calmer. more creative.', w / 2, h * 0.22, w * 0.040,
            '#1f3b3b', { weight: 'bold' });

          paintTweet(p, w * 0.50, h * 0.36, w * 0.88, w * 0.17, 'not-help',  -0.02, 'x');
          paintTweet(p, w * 0.50, h * 0.74, w * 0.80, w * 0.49, 'this-help',  0.02, 'check');
        } else {
          const tx = w * 0.27;
          paintText(p, 'I stopped reading opinions on social.', tx, h * 0.32,
            w * 0.034, '#1f3b3b');
          paintText(p, 'I read real people instead —', tx, h * 0.42, w * 0.030,
            '#2a4d2c', { style: 'italic' });
          paintText(p, 'they move slower than the noise.', tx, h * 0.48, w * 0.030,
            '#2a4d2c', { style: 'italic' });
          paintText(p, 'calmer. more creative.', tx, h * 0.62, w * 0.034,
            '#1f3b3b', { weight: 'bold' });

          paintTweet(p, w * 0.72, h * 0.30, w * 0.42, w * 0.082, 'not-help',  -0.03, 'x');
          paintTweet(p, w * 0.72, h * 0.68, w * 0.42, w * 0.262, 'this-help',  0.02, 'check');
        }
      }
    },
    // 7 — connect / be friends
    {
      paint(p, w, h) {
        paintBackground(p, w, h, '#ffd6a5', '#ffadad', '#bdb2ff');
        paintSparkles(p, w, h, 36, 0.55);

        if (h > w) {
          paintText(p, 'connect with me', w / 2, h * 0.10, w * 0.060, '#3d2c4f',
            { style: 'italic' });
          paintGradText(p, '& be friends', w / 2, h * 0.22, w * 0.16,
            '#ff5e8a', '#ff9a3c', -0.03);
          paintWavy(p, w * 0.20, w * 0.80, h * 0.30, '#ff5e8a', w * 0.012, w * 0.014, 5);

          paintPolaroid(p, w * 0.50, h * 0.66, w * 0.74, w * 0.86, 'say hi', 'friends', -0.04);
        } else {
          const tx = w * 0.28;
          paintText(p, 'connect with me', tx, h * 0.34, w * 0.044, '#3d2c4f',
            { style: 'italic' });
          paintGradText(p, '& be friends', tx, h * 0.50, w * 0.090,
            '#ff5e8a', '#ff9a3c', -0.03);
          paintWavy(p, tx - w * 0.14, tx + w * 0.14, h * 0.62, '#ff5e8a', w * 0.006, w * 0.008, 5);

          paintPolaroid(p, w * 0.74, h * 0.50, w * 0.32, w * 0.38, 'say hi', 'friends', -0.04);
        }
      }
    },
  ];

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

  function paintStaticPage() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    PAGES[currentLayer].paint(ctx, W, H);
  }
  function enterStaticMode() {
    staticMode = true;
    glCanvas.style.display = 'none';
    paintStaticPage();
  }

  function paintPage(config, p, target, w, h) {
    target.width  = Math.max(1, Math.round(w * PAGE_SCALE));
    target.height = Math.max(1, Math.round(h * PAGE_SCALE));
    p.setTransform(PAGE_SCALE, 0, 0, PAGE_SCALE, 0, 0);
    config.paint(p, w, h);
  }

  function repaintLayers() {
    if (!cols) return;
    const cw = (cols - 1) * restX;
    const ch = (rows - 1) * restY;
    paintPage(PAGES[currentLayer], pageCtx, pageCanvas, cw, ch);
    uploadPageTexture();
    if (currentLayer + 1 < PAGES.length) {
      paintPage(PAGES[currentLayer + 1], bgCtx, bgCanvas, cw, ch);
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
    if (currentLayer >= PAGES.length - 1) return;
    for (let i = 0; i < points.length; i++) points[i].pinned = false;
    // drop any in-progress drags so the falling cloth can't be held in place
    for (const data of pointers.values()) data.grabs = [];
    for (let i = 0; i < points.length; i++) points[i].grabbed = false;
    falling = true;
    fallingElapsed = 0;
  }

  function advanceLayer() {
    if (currentLayer >= PAGES.length - 1) return;
    currentLayer++;
    falling = false;
    fallingElapsed = 0;
    armedAliveAt = -1;
    if (currentLayer === PAGES.length - 1) {
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

    if (currentLayer < PAGES.length - 1 && originalLinks > 0) {
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

    if (bgReady && currentLayer + 1 < PAGES.length) {
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
      paintStaticPage();
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
