import { resizeToJpeg } from './resize.js';

const fileInput = document.getElementById('file-input');
const dropzone = document.getElementById('dropzone');
const strip = document.getElementById('strip');
const weave = document.getElementById('weave');
const errorEl = document.getElementById('error');

const MAX = 6;
const MIN = 3;
let photos = []; // [{ id, file, preview }]
let turnstileToken = null;
let turnstileWidgetId = null;
const turnstileEl = document.getElementById('turnstile');

window.onTurnstileLoad = () => {
  turnstileWidgetId = window.turnstile.render(turnstileEl, {
    sitekey: turnstileEl.dataset.sitekey,
    callback: (token) => { turnstileToken = token; refresh(); },
    'error-callback': () => { turnstileToken = null; refresh(); },
    'expired-callback': () => { turnstileToken = null; refresh(); },
  });
};

function refresh() {
  strip.innerHTML = '';
  photos.forEach((p) => {
    const li = document.createElement('li');
    li.dataset.id = p.id;
    li.innerHTML = `<img src="${p.preview}" alt="" />
      <button type="button" aria-label="remove">×</button>`;
    li.querySelector('button').addEventListener('click', () => removePhoto(p.id));
    strip.appendChild(li);
  });
  const photoCountOk = photos.length >= MIN && photos.length <= MAX;
  weave.disabled = !(photoCountOk && turnstileToken);
  errorEl.hidden = true;
}

function nextId() {
  return crypto.randomUUID();
}

async function addFiles(files) {
  for (const file of files) {
    if (photos.length >= MAX) break;
    if (!file.type.startsWith('image/')) continue;
    try {
      const blob = await resizeToJpeg(file);
      const preview = URL.createObjectURL(blob);
      photos.push({
        id: nextId(),
        file: new File([blob], 'photo.jpg', { type: 'image/jpeg' }),
        preview,
      });
      refresh();
    } catch (e) {
      errorEl.hidden = false;
      errorEl.textContent = `couldn't read ${file.name} — try a JPG or PNG`;
    }
  }
}

function removePhoto(id) {
  const p = photos.find((x) => x.id === id);
  if (p) URL.revokeObjectURL(p.preview);
  photos = photos.filter((x) => x.id !== id);
  refresh();
}

fileInput.addEventListener('change', (e) => {
  addFiles(e.target.files);
  fileInput.value = '';
});

['dragenter', 'dragover'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
});
['dragleave', 'drop'].forEach((evt) => {
  dropzone.addEventListener(evt, () => dropzone.classList.remove('dragover'));
});
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  addFiles(e.dataTransfer.files);
});

const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const LOADING_LINES = [
  'uploading photos…',
  'weaving the cloth…',
  'almost there…',
];

let loadingTimer = null;

function startLoading() {
  overlay.hidden = false;
  let i = 0;
  overlayText.textContent = LOADING_LINES[0];
  loadingTimer = setInterval(() => {
    i = (i + 1) % LOADING_LINES.length;
    overlayText.textContent = LOADING_LINES[i];
  }, 3000);
}
function stopLoading() {
  clearInterval(loadingTimer);
  loadingTimer = null;
  overlay.hidden = true;
}

const ERROR_TEXT = {
  photo_count: 'pick 3 to 6 photos',
  photo_too_large: 'one of your photos is too big — try smaller ones',
  bad_format: "we couldn't read one of your photos — try JPG or PNG",
  snapshot_failed: 'something went wrong weaving your page — try again',
  upload_failed: "we couldn't upload one of your photos — try again",
  manifest_write_failed: "we couldn't save your page — try again",
  turnstile_required: 'please complete the challenge above',
  turnstile_failed: "challenge didn't pass — try again",
};

weave.addEventListener('click', async () => {
  if (weave.disabled) return;
  errorEl.hidden = true;
  startLoading();
  try {
    const fd = new FormData();
    for (const p of photos) fd.append('photos[]', p.file);
    fd.append('cf-turnstile-response', turnstileToken);
    const res = await fetch('/api/create', { method: 'POST', body: fd });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'unknown' }));
      throw new Error(body.error || 'unknown');
    }
    const { url } = await res.json();
    window.location.href = url;
  } catch (err) {
    stopLoading();
    turnstileToken = null;
    if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
    refresh();
    errorEl.hidden = false;
    errorEl.textContent = ERROR_TEXT[err.message] || 'something went wrong — try again';
  }
});

refresh();
