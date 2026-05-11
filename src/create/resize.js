export function fitWithin({ width, height }, max) {
  const long = Math.max(width, height);
  if (long <= max) return { width, height };
  const scale = max / long;
  return {
    width: Math.floor(width * scale),
    height: Math.floor(height * scale),
  };
}

/**
 * Resize an image File to ≤ maxEdge on its long side and re-encode as JPEG.
 * Returns a Blob. iOS Safari decodes HEIC natively when drawn to canvas.
 */
export async function resizeToJpeg(file, maxEdge = 1600, quality = 0.85) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(
    { width: bitmap.width, height: bitmap.height },
    maxEdge
  );
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob failed'))),
      'image/jpeg',
      quality
    );
  });
}
