import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";

const MAX_SIZE = 1024;
const QUALITY = 0.85;
const MIME = "image/jpeg";

// Render the user's selected crop region from the source image into a
// square canvas at MAX_SIZE, then re-encode as JPEG. Mirrors what
// imageProcessing.js does for auto-center-crop, just driven by the
// modal's drag/zoom state instead of the geometric center.
async function renderCrop(imageSrc, pixelCrop, baseName) {
  const bitmap = await createImageBitmap(await (await fetch(imageSrc)).blob());
  try {
    const target = Math.min(pixelCrop.width, MAX_SIZE);
    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      bitmap,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      target,
      target
    );
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, MIME, QUALITY)
    );
    if (!blob) return null;
    const safeBase = (baseName || "photo").replace(/\.[^.]+$/, "");
    return new File([blob], `${safeBase}.jpg`, { type: MIME });
  } finally {
    bitmap.close?.();
  }
}

export default function PhotoCropModal({ file, onCancel, onConfirm }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_area, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    setBusy(true);
    setError("");
    try {
      const cropped = await renderCrop(imageSrc, croppedAreaPixels, file?.name);
      if (!cropped) {
        setError("Couldn't process the image. Please pick a different photo.");
        setBusy(false);
        return;
      }
      onConfirm(cropped);
    } catch (e) {
      console.error("PhotoCropModal render failed:", e);
      setError("Couldn't process the image. Please pick a different photo.");
      setBusy(false);
    }
  };

  if (!file || !imageSrc) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-charcoal/60 z-40"
        onClick={() => !busy && onCancel()}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-cream rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-cream-dark">
            <h3 className="font-heading font-bold text-charcoal text-base">
              Adjust your photo
            </h3>
            <p className="text-xs text-taupe mt-0.5">
              Drag to reframe. Pinch or use the slider to zoom.
            </p>
          </div>

          <div className="relative w-full bg-charcoal" style={{ height: 320 }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <div className="px-5 py-4 flex flex-col gap-3">
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-sage"
              aria-label="Zoom"
            />

            {error && (
              <p className="text-sm text-terracotta font-medium">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={busy}
                className="flex-1 bg-white border border-cream-dark text-charcoal font-medium rounded-xl py-3 text-sm cursor-pointer transition-colors hover:bg-cream-dark/50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={busy || !croppedAreaPixels}
                className="flex-1 bg-sage hover:bg-sage-dark text-white font-medium rounded-xl py-3 text-sm cursor-pointer border-none transition-colors disabled:opacity-50"
              >
                {busy ? "Processing..." : "Use photo"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
