import { Image, type ImageProps } from "expo-image";

import { useMediaUrl } from "@/lib/aws/media";

interface MediaImageProps extends Omit<ImageProps, "source"> {
  /** Stored media value: an S3 `media/…` path, a legacy signed URL, or an external URL. */
  uri: string | null | undefined;
}

/**
 * Drop-in for expo-image `Image` that accepts a stored media value and
 * resolves it to a fresh signed URL at render (see lib/aws/media.ts).
 * Renders nothing until the URL resolves — pair with a Skeleton where needed.
 */
export function MediaImage({ uri, ...rest }: MediaImageProps) {
  const url = useMediaUrl(uri);
  if (!url) return null;
  return <Image source={{ uri: url }} {...rest} />;
}
