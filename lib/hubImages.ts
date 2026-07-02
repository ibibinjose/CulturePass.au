import type { HubImage } from "@/lib/types/database.types";

export function getHubImage(images: HubImage[] | null | undefined, type: NonNullable<HubImage["type"]>) {
  return (images ?? []).find((image) => image?.type === type && image.url)?.url ?? null;
}

export function setHubImage(
  images: HubImage[] | null | undefined,
  type: NonNullable<HubImage["type"]>,
  url: string | null,
  alt: string,
): HubImage[] {
  const rest = (images ?? []).filter((image) => image?.type !== type);
  return url ? [...rest, { url, type, alt }] : rest;
}
