import { useQuery } from "@tanstack/react-query";
import { getUrl } from "aws-amplify/storage";

/**
 * Stored media values → display URLs.
 *
 * Uploaded media is stored as its S3 **path** (`media/<identityId>/…`), never a
 * pre-signed URL: signed URLs expire (15 min by default), so persisting one
 * rots the image shortly after upload. Resolution to a fresh signed URL happens
 * at render time via {@link useMediaUrl} (or {@link resolveMediaUrl} outside
 * React) — external URLs pass through untouched.
 *
 * Legacy rows that stored a full signed S3 URL are healed here too: the S3 key
 * is extracted from the URL and re-signed, so old avatars/covers come back
 * without a data migration.
 */

const MEDIA_PREFIX = "media/";
/** Signed URLs are valid for an hour; consumers refetch well inside that. */
const URL_TTL_SECONDS = 3600;
const STALE_MS = 45 * 60_000;

/** The S3 key for a stored media value, or null when it's not our media. */
export function mediaPathFromStored(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (stored.startsWith(MEDIA_PREFIX)) return stored;
  // Legacy: a (long-expired) pre-signed URL pointing at our media prefix.
  if (/^https:\/\/[^/]+\.s3[.-][^/]+\.amazonaws\.com\//.test(stored)) {
    try {
      const pathname = decodeURIComponent(new URL(stored).pathname.replace(/^\//, ""));
      if (pathname.startsWith(MEDIA_PREFIX)) return pathname;
    } catch {
      return null;
    }
  }
  return null;
}

/** Resolve a stored media value to a displayable URL (fresh signed URL or pass-through). */
export async function resolveMediaUrl(stored: string | null | undefined): Promise<string | null> {
  const path = mediaPathFromStored(stored);
  if (!path) return stored ?? null;
  const { url } = await getUrl({ path, options: { expiresIn: URL_TTL_SECONDS } });
  return url.toString();
}

/**
 * Display URL for a stored media value. Non-media values (external URLs, null)
 * resolve synchronously so those renders never flash empty.
 */
export function useMediaUrl(stored: string | null | undefined): string | null {
  const path = mediaPathFromStored(stored);
  const { data } = useQuery({
    queryKey: ["media-url", path],
    queryFn: async () => {
      const { url } = await getUrl({ path: path!, options: { expiresIn: URL_TTL_SECONDS } });
      return url.toString();
    },
    enabled: !!path,
    staleTime: STALE_MS,
    retry: 1,
  });
  if (!path) return stored ?? null;
  return data ?? null;
}
