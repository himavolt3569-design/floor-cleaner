"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Language = "en" | "ne";

interface LanguageState {
  lang: Language;
  hydrated: boolean;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  setHydrated: () => void;
}

const STORAGE_KEY = "tmg.lang.v1";

const safeStorage = createJSONStorage<{ lang: Language }>(() => {
  try {
    const probe = "__tmg_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    const memory = new Map<string, string>();
    return {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => void memory.set(k, v),
      removeItem: (k) => void memory.delete(k),
    };
  }
});

export const useLanguage = create<LanguageState>()(
  persist(
    (set, get) => ({
      lang: "en",
      hydrated: false,
      setLang: (lang) => set({ lang }),
      toggleLang: () => set({ lang: get().lang === "en" ? "ne" : "en" }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: STORAGE_KEY,
      storage: safeStorage,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
