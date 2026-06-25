// =============================================================================
// CulturePass Australia — shared vocabularies
// Single source of truth for the controlled values used across the DB enums,
// Zod schemas and UI. Keep in sync with the SQL enums in supabase/migrations.
// =============================================================================

export const HUB_TYPES = [
  "community_cultural_group",
  "council_government",
  "organisation_association_ngo_charity",
  "club_society",
  "venue_space",
  "business_shop_workshop",
  "wellness",
] as const;
export type HubType = (typeof HUB_TYPES)[number];

export const HUB_TYPE_LABELS: Record<HubType, string> = {
  community_cultural_group: "Community / Cultural Group",
  council_government: "Council / Government",
  organisation_association_ngo_charity: "Organisation, NGO or Charity",
  club_society: "Club or Society",
  venue_space: "Venue or Space",
  business_shop_workshop: "Business, Shop or Workshop",
  wellness: "Wellness",
};

export const HUB_TYPE_DESCRIPTIONS: Record<HubType, string> = {
  community_cultural_group: "Cultural and community groups bringing people together",
  council_government: "Local councils and government bodies",
  organisation_association_ngo_charity: "Associations, NGOs and charities",
  club_society: "Clubs, societies and member groups",
  venue_space: "Spaces that host gatherings and events",
  business_shop_workshop: "Shops, studios and small businesses",
  wellness: "Wellbeing, healing and wellness practices",
};

export const PROFESSIONAL_CATEGORIES = [
  "artist",
  "politician",
  "founder",
  "creative",
  "community_leader",
  "cultural_leader",
  "wellness_practitioner",
  "educator",
  "other",
] as const;
export type ProfessionalCategory = (typeof PROFESSIONAL_CATEGORIES)[number];

export const PROFESSIONAL_CATEGORY_LABELS: Record<ProfessionalCategory, string> = {
  artist: "Artist",
  politician: "Politician",
  founder: "Founder",
  creative: "Creative",
  community_leader: "Community Leader",
  cultural_leader: "Cultural Leader",
  wellness_practitioner: "Wellness Practitioner",
  educator: "Educator",
  other: "Other",
};

export const EVENT_TYPES = [
  "event",
  "activity",
  "workshop",
  "art",
  "movie",
  "dining",
  "shopping",
  "offer",
  "classes_gym",
  "travel",
  "other",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  event: "Event",
  activity: "Activity",
  workshop: "Workshop",
  art: "Art",
  movie: "Movie",
  dining: "Dining",
  shopping: "Shopping",
  offer: "Offer",
  classes_gym: "Classes & Gym",
  travel: "Travel",
  other: "Other",
};

export const EVENT_TYPE_DESCRIPTIONS: Record<EventType, string> = {
  event: "General events and gatherings",
  activity: "Interactive activities and experiences",
  workshop: "Learning and skill-building sessions",
  art: "Art exhibitions and creative showcases",
  movie: "Film screenings and cinema events",
  dining: "Food and dining experiences",
  shopping: "Markets and shopping opportunities",
  offer: "Special offers and deals",
  classes_gym: "Fitness classes and gym activities",
  travel: "Travel and exploration experiences",
  other: "Other types of events",
};

export const VERIFICATION_STATUSES = ["pending", "verified", "rejected"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const HUB_STATUSES = ["draft", "published", "archived"] as const;
export type HubStatus = (typeof HUB_STATUSES)[number];

export const EVENT_STATUSES = ["draft", "published", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const HUB_MEMBER_ROLES = ["owner", "admin", "editor", "member"] as const;
export type HubMemberRole = (typeof HUB_MEMBER_ROLES)[number];

export const RSVP_STATUSES = ["going", "interested", "waitlist", "cancelled"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

// Suggested cultural-focus tags for events (free-form, but these guide the UI).
export const CULTURAL_FOCUS_OPTIONS = [
  "Indigenous",
  "Multicultural",
  "Reconciliation",
  "Language",
  "Art & Craft",
  "Music & Dance",
  "Food",
  "Storytelling",
  "Country & Land",
  "Youth",
  "Elders",
] as const;

// Australian states & territories (mirrors the seed; used for offline UI).
export const AUSTRALIAN_STATES = [
  { code: "NSW", name: "New South Wales" },
  { code: "VIC", name: "Victoria" },
  { code: "QLD", name: "Queensland" },
  { code: "WA", name: "Western Australia" },
  { code: "SA", name: "South Australia" },
  { code: "TAS", name: "Tasmania" },
  { code: "ACT", name: "Australian Capital Territory" },
  { code: "NT", name: "Northern Territory" },
] as const;
export type StateCode = (typeof AUSTRALIAN_STATES)[number]["code"];