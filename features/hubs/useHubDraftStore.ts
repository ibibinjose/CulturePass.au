import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { kvStorage } from "@/lib/storage";
import type { HubType } from "@/lib/constants";

interface HubImage {
  url: string;
  alt?: string;
  type?: "logo" | "cover" | "gallery";
}

export interface HubDraft {
  type?: HubType;
  name: string;
  short_description: string;
  full_description: string;

  welcome_to_country: string;
  traditional_custodians: string[];
  indigenous_led: boolean;
  indigenous_partners: string[];

  location_state?: string;
  location_council_id?: string;
  location_city: string;
  location_postcode: string;
  address: string;

  website: string;
  contact_email: string;
  phone: string;
  tags: string[];
  
  images?: HubImage[];
}

export const EMPTY_DRAFT: HubDraft = {
  type: undefined,
  name: "",
  short_description: "",
  full_description: "",
  welcome_to_country: "",
  traditional_custodians: [],
  indigenous_led: false,
  indigenous_partners: [],
  location_state: undefined,
  location_council_id: undefined,
  location_city: "",
  location_postcode: "",
  address: "",
  website: "",
  contact_email: "",
  phone: "",
  tags: [],
  images: [],
};

export const HUB_WIZARD_STEPS = ["Type", "Identity", "Place", "Culture", "Review"] as const;

interface HubDraftState {
  step: number;
  draft: HubDraft;
  setStep: (step: number) => void;
  next: () => void;
  back: () => void;
  update: (patch: Partial<HubDraft>) => void;
  reset: () => void;
}

/**
 * Persisted hub-creation draft. The `persist` middleware writes to local
 * storage on every change, so a half-finished hub survives an app reload or a
 * navigation away — the "auto-save drafts" behaviour, without needing a network
 * round-trip until the user actually publishes.
 */
export const useHubDraftStore = create<HubDraftState>()(
  persist(
    (set) => ({
      step: 0,
      draft: EMPTY_DRAFT,
      setStep: (step) => set({ step }),
      next: () => set((s) => ({ step: Math.min(s.step + 1, HUB_WIZARD_STEPS.length - 1) })),
      back: () => set((s) => ({ step: Math.max(s.step - 1, 0) })),
      update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      reset: () => set({ step: 0, draft: EMPTY_DRAFT }),
    }),
    {
      name: "culturepass:hub-draft",
      storage: createJSONStorage(() => kvStorage),
      partialize: (s) => ({ draft: s.draft, step: s.step }),
    },
  ),
);