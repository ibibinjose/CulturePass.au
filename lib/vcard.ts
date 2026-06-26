// =============================================================================
// CulturePass Australia — vCard ("Save contact")
// Builds a vCard 3.0 string and saves/shares it. On web we trigger a .vcf
// download; on native we hand the text to the OS share sheet (no extra native
// modules required).
// =============================================================================

import { Platform, Share } from "react-native";

export interface VCardFields {
  /** Full name (FN). */
  name: string;
  /** Job / professional title (TITLE). */
  title?: string | null;
  /** Organisation (ORG) — used for hubs. */
  org?: string | null;
  email?: string | null;
  phone?: string | null;
  /** Single-line address (ADR). */
  address?: string | null;
  /** URLs (website + socials). */
  urls?: string[];
  note?: string | null;
}

const esc = (v: string) =>
  v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

export function buildVCard(f: VCardFields): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${esc(f.name)}`];

  // N (structured name): split on the last space into given / family.
  const parts = f.name.trim().split(/\s+/);
  const family = parts.length > 1 ? parts.slice(1).join(" ") : "";
  const given = parts[0] ?? "";
  lines.push(`N:${esc(family)};${esc(given)};;;`);

  if (f.org) lines.push(`ORG:${esc(f.org)}`);
  if (f.title) lines.push(`TITLE:${esc(f.title)}`);
  if (f.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(f.email)}`);
  if (f.phone) lines.push(`TEL;TYPE=CELL:${esc(f.phone)}`);
  if (f.address) lines.push(`ADR;TYPE=WORK:;;${esc(f.address)};;;;`);
  for (const url of f.urls ?? []) {
    if (url) lines.push(`URL:${esc(url)}`);
  }
  if (f.note) lines.push(`NOTE:${esc(f.note)}`);

  lines.push("END:VCARD");
  return lines.join("\r\n");
}

const slugify = (v: string) =>
  v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "contact";

/** Save the contact: download a .vcf (web) or open the share sheet (native). */
export async function saveContact(fields: VCardFields): Promise<"saved" | "shared" | "failed"> {
  const vcard = buildVCard(fields);

  if (Platform.OS === "web" && typeof document !== "undefined") {
    try {
      const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${slugify(fields.name)}.vcf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      return "saved";
    } catch {
      return "failed";
    }
  }

  try {
    await Share.share({ message: vcard, title: `${fields.name} — contact card` });
    return "shared";
  } catch {
    return "failed";
  }
}
