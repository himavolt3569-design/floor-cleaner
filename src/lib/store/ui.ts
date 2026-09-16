"use client";

import { create } from "zustand";

type Surface = "cart" | "checkout" | "menu" | null;

interface UiState {
  surface: Surface;
  openCart: () => void;
  openCheckout: () => void;
  openMenu: () => void;
  close: () => void;
}

/** Only one overlay is ever open, which keeps focus management unambiguous. */
export const useUi = create<UiState>()((set) => ({
  surface: null,
  openCart: () => set({ surface: "cart" }),
  openCheckout: () => set({ surface: "checkout" }),
  openMenu: () => set({ surface: "menu" }),
  close: () => set({ surface: null }),
}));
