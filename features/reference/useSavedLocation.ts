import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { kvStorage } from "@/lib/storage";
import type { LocationValue } from "@/components/ui/LocationPicker";

interface SavedLocationState {
  location: LocationValue;
  setLocation: (loc: LocationValue) => void;
}

export const useSavedLocation = create<SavedLocationState>()(
  persist(
    (set) => ({
      location: { label: "Anywhere" },
      setLocation: (location) => set({ location }),
    }),
    {
      name: "culturepass:saved-location",
      storage: createJSONStorage(() => kvStorage),
    }
  )
);
