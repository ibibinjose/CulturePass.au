import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { kvStorage } from "@/lib/storage";

interface SavedEventsState {
  ids: string[];
  toggle: (id: string) => void;
}

/**
 * Locally-persisted set of saved/bookmarked event ids. Device-only (no network),
 * so the heart on an event card works instantly without a schema change. Read a
 * boolean with a selector so components only re-render when their event changes:
 *   const saved = useSavedEvents((s) => s.ids.includes(id));
 */
export const useSavedEvents = create<SavedEventsState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) =>
        set((s) => ({
          ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [id, ...s.ids],
        })),
    }),
    {
      name: "culturepass:saved-events",
      storage: createJSONStorage(() => kvStorage),
      partialize: (s) => ({ ids: s.ids }),
    },
  ),
);
