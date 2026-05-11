const fileInput = document.getElementById('file-input');
const dropzone = document.getElementById('dropzone');
const strip = document.getElementById('strip');
const weave = document.getElementById('weave');
const errorEl = document.getElementById('error');

const MAX = 6;
const MIN = 3;
let photos = []; // [{ id, file, preview }]

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
  weave.disabled = !(photos.length >= MIN && photos.length <= MAX);
  errorEl.hidden = true;
}

function nextId() {
  return crypto.randomUUID();
}

function addFiles(files) {
  for (const file of files) {
    if (photos.length >= MAX) break;
    if (!file.type.startsWith('image/')) continue;
    const preview = URL.createObjectURL(file);
    photos.push({ id: nextId(), file, preview });
  }
  refresh();
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

weave.addEventListener('click', () => {
  errorEl.hidden = false;
  errorEl.textContent = 'submit not implemented yet';
});

refresh();
