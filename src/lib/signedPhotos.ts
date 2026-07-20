import { supabase } from "@/integrations/supabase/client";

// Buckets are private: stored "public" URLs are used only as bucket+path
// encodings and must be exchanged for signed URLs at display time.
const BUCKETS = ["profile-photos", "avatars", "dog-photos"];
const SIGN_TTL_SECONDS = 3600;
const CACHE_TTL_MS = 50 * 60 * 1000;

const cache = new Map<string, { url: string; expires: number }>();

export function parseStorageUrl(
  url: string
): { bucket: string; path: string } | null {
  for (const bucket of BUCKETS) {
    const marker = `/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      let path = url.slice(idx + marker.length);
      const q = path.indexOf("?");
      if (q !== -1) path = path.slice(0, q);
      return { bucket, path: decodeURIComponent(path) };
    }
  }
  return null;
}

export async function getSignedPhotoUrl(
  url: string | null | undefined
): Promise<string | undefined> {
  if (!url) return undefined;
  const parsed = parseStorageUrl(url);
  if (!parsed) return url; // blob:, data:, local assets, external URLs
  const key = `${parsed.bucket}/${parsed.path}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.url;
  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, SIGN_TTL_SECONDS);
  if (error || !data?.signedUrl) return url;
  cache.set(key, { url: data.signedUrl, expires: now + CACHE_TTL_MS });
  return data.signedUrl;
}
