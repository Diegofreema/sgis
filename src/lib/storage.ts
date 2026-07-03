/**
 * Supabase Storage helpers.
 *
 * All uploads go through the server-side Supabase client (service role)
 * so RLS policies don't block admin uploads.
 *
 * Usage (client component):
 *   import { uploadAvatar } from "@/lib/storage";
 *   const { path, url } = await uploadAvatar(userId, file);
 */

import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const BUCKET_AVATARS =
  process.env.NEXT_PUBLIC_STORAGE_BUCKET_AVATARS ?? "avatars";
const BUCKET_GALLERY =
  process.env.NEXT_PUBLIC_STORAGE_BUCKET_GALLERY ?? "gallery";
const BUCKET_DOCUMENTS =
  process.env.NEXT_PUBLIC_STORAGE_BUCKET_DOCUMENTS ?? "documents";

/** Browser Supabase client (used for client-side uploads) */
function getClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

type UploadResult = {
  path: string;
  url: string;
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<UploadResult> {
  const supabase = getClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET_AVATARS)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET_AVATARS).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

// ─── Gallery ─────────────────────────────────────────────────────────────────

export async function uploadGalleryImage(file: File): Promise<UploadResult> {
  const supabase = getClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeName = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();
  const path = `gallery/${Date.now()}-${crypto.randomUUID()}-${safeName}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET_GALLERY)
    .upload(path, file, { contentType: file.type });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET_GALLERY).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

// ─── Application Documents ───────────────────────────────────────────────────

export async function uploadDocument(
  userId: string,
  applicationId: string,
  file: File
): Promise<UploadResult> {
  const supabase = getClient();
  const ext = file.name.split(".").pop() ?? "pdf";
  const safeFilename = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9-_]/gi, "-")
    .toLowerCase();
  const path = `${userId}/${applicationId}/${Date.now()}-${safeFilename}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET_DOCUMENTS)
    .upload(path, file, { contentType: file.type });

  if (error) throw new Error(error.message);

  // Documents are private — generate a signed URL (1 hour expiry)
  const { data, error: signedErr } = await supabase.storage
    .from(BUCKET_DOCUMENTS)
    .createSignedUrl(path, 3600);

  if (signedErr || !data) throw new Error(signedErr?.message ?? "Failed to sign URL");

  return { path, url: data.signedUrl };
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteStorageFile(
  bucket: "avatars" | "gallery" | "documents",
  path: string
): Promise<void> {
  const supabase = getClient();
  const bucketName =
    bucket === "avatars"
      ? BUCKET_AVATARS
      : bucket === "gallery"
      ? BUCKET_GALLERY
      : BUCKET_DOCUMENTS;

  const { error } = await supabase.storage.from(bucketName).remove([path]);
  if (error) throw new Error(error.message);
}

// ─── Get Public URL ───────────────────────────────────────────────────────────

export function getPublicUrl(
  bucket: "avatars" | "gallery",
  path: string
): string {
  const supabase = getClient();
  const bucketName = bucket === "avatars" ? BUCKET_AVATARS : BUCKET_GALLERY;
  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  return data.publicUrl;
}
