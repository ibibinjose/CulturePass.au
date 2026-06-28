import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { kvStorage } from "@/lib/storage";
import type { EventType } from "@/lib/constants";

export interface EventDraft {
  hub_id: string;
  type: EventType;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_free: boolean;
  price?: number;
  ticket_url: string;
  location_city: string;
  location_state: string;
  location_council_id?: string;
  capacity?: number;
  images: { url: string; alt?: string }[];
  tags: string[];
  cultural_focus: string[];
}

export const EMPTY_EVENT_DRAFT = (hubId = ""): EventDraft => ({
  hub_id: hubId,
  type: "event",
  title: "",
  description: "",
  start_time: "",
  end_time: "",
  is_free: true,
  price: undefined,
  ticket_url: "",
  location_city: "",
  location_state: "",
  location_council_id: undefined,
  capacity: undefined,
  images: [],
  tags: [],
  cultural_focus: [],
});

export const EVENT_WIZARD_STEPS = ["Details", "Date & Time", "Location", "Tickets", "Classification", "Review"] as const;

interface EventDraftState {
  step: number;
  draft: EventDraft;
  setStep: (step: number) => void;
  next: () => void;
  back: () => void;
  update: (patch: Partial<EventDraft>) => void;
  reset: (hubId?: string) => void;
}

export const useEventDraftStore = create<EventDraftState>()(
  persist(
    (set) => ({
      step: 0,
      draft: EMPTY_EVENT_DRAFT(),
      setStep: (step) => set({ step }),
      next: () => set((s) => ({ step: Math.min(s.step + 1, EVENT_WIZARD_STEPS.length - 1) })),
      back: () => set((s) => ({ step: Math.max(s.step - 1, 0) })),
      update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      reset: (hubId) => set({ step: 0, draft: EMPTY_EVENT_DRAFT(hubId) }),
    }),
    {
      name: "culturepass:event-draft",
      storage: createJSONStorage(() => kvStorage),
      partialize: (s) => ({ draft: s.draft, step: s.step }),
    },
  ),
);
