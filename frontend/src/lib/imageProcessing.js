// Client-side profile photo processing.
//
// Phones routinely produce 3–10 MB JPEGs. Uploading those raw stalls
// the Save button for seconds on slow connections and bloats Storage.
// We center-crop to square, downscale to MAX_SIZE, and re-encode as
// JPEG at QUALITY before handing the file to uploadProfilePhoto.
//
// HEIC: Safari can decode HEIC via createImageBitmap but other
// browsers can't. If decoding throws we fall through to the original
// file — uploadProfilePhoto's validation accepts HEIC and the server
// stores it; only the in-browser preview suffers, which is a far
// smaller problem than refusing the upload.

const MAX_SIZE = 1024;
const QUALITY = 0.85;
const PROCESSED_MIME = "image/jpeg";

export async function processProfilePhoto(file) {
  if (!(file instanceof Blob)) return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = Math.floor((bitmap.width - side) / 2);
    const sy = Math.floor((bitmap.height - side) / 2);
    const target = Math.min(side, MAX_SIZE);

    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, PROCESSED_MIME, QUALITY)
    );

    if (!blob) return file;

    // Re-wrap as File so callers that read .name (e.g. extension parsing
    // in storage.js) keep working. Always force .jpg since we re-encoded.
    const baseName = (file.name || "photo").replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.jpg`, { type: PROCESSED_MIME });
  } finally {
    bitmap.close?.();
  }
}
