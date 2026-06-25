// =============================================================================
// CulturePass Australia — Database types
// Hand-authored to mirror supabase/migrations. Once a project is linked, run
// `npm run db:types` to regenerate this file from the live schema.
//
// PostGIS geography columns are returned by PostgREST as EWKB hex strings;
// they are typed as `string | null` here.
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface HubImage {
  url: string;
  alt?: string;
  type?: "logo" | "cover" | "gallery";
}

export interface Database {
  public: {
    Tables: {
      australian_states: {
        Row: {
          code: string;
          name: string;
          capital_city: string;
          timezone: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          code: string;
          name: string;
          capital_city: string;
          timezone?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["australian_states"]["Insert"]>;
        Relationships: [];
      };
      australian_councils: {
        Row: {
          id: string;
          abs_code: string | null;
          name: string;
          slug: string;
          state_code: string;
          traditional_custodians: string[] | null;
          region: string | null;
          population: number | null;
          area_sqkm: number | null;
          website: string | null;
          is_metro: boolean;
          coordinates: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          abs_code?: string | null;
          name: string;
          slug: string;
          state_code: string;
          traditional_custodians?: string[] | null;
          region?: string | null;
          population?: number | null;
          area_sqkm?: number | null;
          website?: string | null;
          is_metro?: boolean;
          coordinates?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["australian_councils"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "australian_councils_state_code_fkey";
            columns: ["state_code"];
            referencedRelation: "australian_states";
            referencedColumns: ["code"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          avatar_url: string | null;
          bio: string | null;
          location: string | null;
          coordinates: string | null;
          interests: string[];
          cultural_background: string | null;
          indigenous_connection: string | null;
          preferred_languages: string[];
          is_public_professional: boolean;
          professional_category: Database["public"]["Enums"]["professional_category"] | null;
          professional_title: string | null;
          public_bio: string | null;
          public_links: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          location?: string | null;
          coordinates?: string | null;
          interests?: string[];
          cultural_background?: string | null;
          indigenous_connection?: string | null;
          preferred_languages?: string[];
          is_public_professional?: boolean;
          professional_category?: Database["public"]["Enums"]["professional_category"] | null;
          professional_title?: string | null;
          public_bio?: string | null;
          public_links?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      hubs: {
        Row: {
          id: string;
          owner_id: string;
          type: Database["public"]["Enums"]["hub_type"];
          name: string;
          slug: string;
          short_description: string;
          full_description: string | null;
          welcome_to_country: string | null;
          traditional_custodians: string[];
          indigenous_led: boolean;
          indigenous_partners: string[];
          location_state: string | null;
          location_council_id: string | null;
          location_postcode: string | null;
          location_city: string | null;
          coordinates: string | null;
          address: string | null;
          website: string | null;
          contact_email: string | null;
          phone: string | null;
          images: Json;
          categories: string[];
          tags: string[];
          verification_status: Database["public"]["Enums"]["verification_status"];
          status: Database["public"]["Enums"]["hub_status"];
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          type: Database["public"]["Enums"]["hub_type"];
          name: string;
          slug?: string;
          short_description?: string;
          full_description?: string | null;
          welcome_to_country?: string | null;
          traditional_custodians?: string[];
          indigenous_led?: boolean;
          indigenous_partners?: string[];
          location_state?: string | null;
          location_council_id?: string | null;
          location_postcode?: string | null;
          location_city?: string | null;
          coordinates?: string | null;
          address?: string | null;
          website?: string | null;
          contact_email?: string | null;
          phone?: string | null;
          images?: Json;
          categories?: string[];
          tags?: string[];
          verification_status?: Database["public"]["Enums"]["verification_status"];
          status?: Database["public"]["Enums"]["hub_status"];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["hubs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "hubs_owner_id_fkey";
            columns: ["owner_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hubs_location_council_id_fkey";
            columns: ["location_council_id"];
            referencedRelation: "australian_councils";
            referencedColumns: ["id"];
          },
        ];
      };
      hub_members: {
        Row: {
          id: string;
          hub_id: string;
          profile_id: string;
          role: Database["public"]["Enums"]["hub_member_role"];
          created_at: string;
        };
        Insert: {
          id?: string;
          hub_id: string;
          profile_id: string;
          role?: Database["public"]["Enums"]["hub_member_role"];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["hub_members"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "hub_members_hub_id_fkey";
            columns: ["hub_id"];
            referencedRelation: "hubs";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          id: string;
          hub_id: string;
          type: Database["public"]["Enums"]["event_type"];
          title: string;
          description: string | null;
          start_time: string | null;
          end_time: string | null;
          is_free: boolean;
          price: number | null;
          ticket_url: string | null;
          location_city: string | null;
          location_state: string | null;
          location_council_id: string | null;
          coordinates: string | null;
          capacity: number | null;
          rsvp_count: number;
          images: Json;
          tags: string[];
          cultural_focus: string[];
          status: Database["public"]["Enums"]["event_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          hub_id: string;
          type?: Database["public"]["Enums"]["event_type"];
          title?: string;
          description?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          is_free?: boolean;
          price?: number | null;
          ticket_url?: string | null;
          location_city?: string | null;
          location_state?: string | null;
          location_council_id?: string | null;
          coordinates?: string | null;
          capacity?: number | null;
          rsvp_count?: number;
          images?: Json;
          tags?: string[];
          cultural_focus?: string[];
          status?: Database["public"]["Enums"]["event_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "events_hub_id_fkey";
            columns: ["hub_id"];
            referencedRelation: "hubs";
            referencedColumns: ["id"];
          },
        ];
      };
      event_rsvps: {
        Row: {
          id: string;
          event_id: string;
          profile_id: string;
          status: Database["public"]["Enums"]["rsvp_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          profile_id: string;
          status?: Database["public"]["Enums"]["rsvp_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_rsvps"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey";
            columns: ["event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      professional_category:
        | "artist"
        | "politician"
        | "founder"
        | "creative"
        | "community_leader"
        | "cultural_leader"
        | "wellness_practitioner"
        | "educator"
        | "other";
      hub_type:
        | "community_cultural_group"
        | "council_government"
        | "organisation_association_ngo_charity"
        | "club_society"
        | "venue_space"
        | "business_shop_workshop"
        | "wellness";
      verification_status: "pending" | "verified" | "rejected";
      hub_status: "draft" | "published" | "archived";
      hub_member_role: "owner" | "admin" | "editor" | "member";
      event_type:
        | "event"
        | "activity"
        | "workshop"
        | "art"
        | "movie"
        | "dining"
        | "shopping"
        | "offer"
        | "classes_gym"
        | "travel"
        | "other";
      event_status: "draft" | "published" | "cancelled";
      rsvp_status: "going" | "interested" | "waitlist" | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
}

// Convenience row aliases.
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type HubRow = Database["public"]["Tables"]["hubs"]["Row"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type CouncilRow = Database["public"]["Tables"]["australian_councils"]["Row"];
export type StateRow = Database["public"]["Tables"]["australian_states"]["Row"];
export type HubMemberRow = Database["public"]["Tables"]["hub_members"]["Row"];
export type EventRsvpRow = Database["public"]["Tables"]["event_rsvps"]["Row"];
