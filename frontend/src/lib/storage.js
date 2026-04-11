import { supabase } from "./supabase";

const BUCKET = "photos";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Only JPEG, PNG, WebP, and HEIC images are allowed. Got: ${file.type || "unknown"}`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`;
  }
  return null;
}

/**
 * Upload a file to Supabase Storage.
 * @param {File} file - The file to upload
 * @param {string} folder - Folder path (e.g. "profiles" or "playgroups")
 * @param {string} userId - User ID for unique naming
 * @returns {{ url: string|null, error: string|null }}
 */
export async function uploadPhoto(file, folder, userId) {
  const validationError = validateFile(file);
  if (validationError) return { url: null, error: validationError };

  // Create a unique filename
  const ext = file.name.split(".").pop();
  const fileName = `${folder}/${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Upload error:", error);
    return { url: null, error: error.message };
  }

  // Get the public URL
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return { url: data.publicUrl, error: null };
}

/**
 * Upload a profile photo (replaces the old one).
 * @param {File} file
 * @param {string} userId
 * @returns {{ url: string|null, error: string|null }}
 */
export async function uploadProfilePhoto(file, userId) {
  const validationError = validateFile(file);
  if (validationError) return { url: null, error: validationError };

  const ext = file.name.split(".").pop();
  const fileName = `profiles/${userId}/avatar.${ext}`;

  // Upsert to replace existing avatar
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    console.error("Upload error:", error);
    return { url: null, error: error.message };
  }

  // Add timestamp to bust cache
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return { url: `${data.publicUrl}?t=${Date.now()}`, error: null };
}

/**
 * Delete a photo from Supabase Storage given its public URL.
 * Used when a host removes a remote photo in the edit flow so the
 * underlying file doesn't sit in Storage orphaned (#47).
 *
 * Public URLs look like:
 *   https://<project>.supabase.co/storage/v1/object/public/photos/playgroups/<userId>/<timestamp>.<ext>
 * We extract everything after `/public/photos/` as the bucket key.
 *
 * @param {string} publicUrl
 * @returns {{ error: string|null }}
 */
export async function deletePhoto(publicUrl) {
  if (typeof publicUrl !== "string" || !publicUrl) {
    return { error: "Invalid photo URL" };
  }
  const match = publicUrl.match(new RegExp(`/public/${BUCKET}/(.+)$`));
  if (!match) {
    // Not one of ours (external URL, data URL, blob URL, etc). Treat as
    // a no-op so the caller doesn't blow up cleaning up a mixed list.
    return { error: null };
  }
  const fileName = match[1];
  const { error } = await supabase.storage.from(BUCKET).remove([fileName]);
  if (error) {
    console.error("Delete error:", error);
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Upload multiple playgroup photos.
 * @param {File[]} files
 * @param {string} userId
 * @returns {{ urls: string[], errors: string[] }}
 */
export async function uploadPlaygroupPhotos(files, userId) {
  const urls = [];
  const errors = [];

  for (const file of files) {
    const { url, error } = await uploadPhoto(file, "playgroups", userId);
    if (url) urls.push(url);
    if (error) errors.push(error);
  }

  return { urls, errors };
}
