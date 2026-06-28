// =============================================================================
// CulturePass Australia — company / brand identity
// Single source of truth for legal name, brand, domain and contact addresses,
// used by the legal pages, the About screen and the site Footer.
// =============================================================================

export const COMPANY = {
  /** Registered legal entity. */
  legalName: "Culture Passion Company",
  /** Product/brand name. */
  brand: "CulturePass",
  /** Full brand used in prose. */
  brandFull: "CulturePass Australia",
  /** Public domain + canonical URL. */
  domain: "culturepass.au",
  url: "https://culturepass.au",
  /** Contact addresses (update to your real mailboxes). */
  supportEmail: "support@culturepass.au",
  privacyEmail: "privacy@culturepass.au",
  /** Registered details — fill in before publishing. */
  abn: "ABN to be confirmed",
  /** Governing-law jurisdiction for the Terms. */
  jurisdiction: "New South Wales, Australia",
  /** Date the current legal documents took effect. */
  legalUpdated: "27 June 2026",
} as const;
