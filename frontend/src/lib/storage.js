import { supabase } from "./supabase";

const BUCKET = "photos";

/**
 * Upload a file to Supabase Storage.
 * @param {File} file - The file to upload
 * @param {string} folder - Folder path (e.g. "profiles" or "playgroups")
 * @param {string} userId - User ID for unique naming
 * @returns {{ url: string|null, error: string|null }}
 */
export async function uploadPhoto(file, folder, userId) {
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
