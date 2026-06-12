import { create } from "zustand";
import { persist } from "zustand/middleware";
import { monthKey } from "@/lib/date";

type Theme = "dark" | "light";

interface UIState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;

  /** The month currently being viewed across Expenses/Dashboard (YYYY-MM-DD). */
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;

  /** Quick-add transaction bottom sheet. */
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "dark",
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setTheme: (theme) => set({ theme }),

      selectedMonth: monthKey(),
      setSelectedMonth: (selectedMonth) => set({ selectedMonth }),

      quickAddOpen: false,
      setQuickAddOpen: (quickAddOpen) => set({ quickAddOpen }),
    }),
    {
      name: "lifeos-ui",
      // Don't persist the selected month or transient sheet state.
      partialize: (s) => ({ theme: s.theme }),
    }
  )
);
