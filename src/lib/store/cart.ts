"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartLine } from "@/types";

const MAX_QTY_PER_LINE = 99;
const STORAGE_KEY = "tmg.cart.v1";

interface CartState {
  lines: CartLine[];
  /** Set once the persisted cart has been read, to avoid an SSR mismatch. */
  hydrated: boolean;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  subtotalMinor: () => number;
  count: () => number;
}

const keyOf = (l: { productId: string; variantId: string }) =>
  `${l.productId}::${l.variantId}`;

/**
 * Guest cart. Prices held here are for display only: every total that matters
 * is recalculated server side from Firestore before an order is written.
 *
 * localStorage can throw (private mode, blocked storage), so the whole storage
 * layer degrades to an in-memory cart rather than breaking the page.
 */
const safeStorage = createJSONStorage<{ lines: CartLine[] }>(() => {
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

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      hydrated: false,

      add: (line, quantity = 1) =>
        set((state) => {
          const qty = clampQty(quantity);
          const existing = state.lines.find((l) => keyOf(l) === keyOf(line));

          if (existing) {
            return {
              lines: state.lines.map((l) =>
                keyOf(l) === keyOf(line)
                  ? { ...l, ...line, quantity: clampQty(l.quantity + qty) }
                  : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, quantity: qty }] };
        }),

      setQuantity: (variantId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { lines: state.lines.filter((l) => l.variantId !== variantId) };
          }
          return {
            lines: state.lines.map((l) =>
              l.variantId === variantId ? { ...l, quantity: clampQty(quantity) } : l,
            ),
          };
        }),

      remove: (variantId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.variantId !== variantId) })),

      clear: () => set({ lines: [] }),

      subtotalMinor: () =>
        get().lines.reduce((sum, l) => sum + l.unitPriceMinor * l.quantity, 0),

      count: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
    }),
    {
      name: STORAGE_KEY,
      storage: safeStorage,
      partialize: (state) => ({ lines: state.lines }),
      version: 1,
      onRehydrateStorage: () => (state) => {
        // Drop anything that does not look like a cart line before trusting it.
        if (state) {
          state.lines = state.lines.filter(isCartLine);
          state.hydrated = true;
        }
      },
    },
  ),
);

function clampQty(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_QTY_PER_LINE, Math.max(1, Math.floor(n)));
}

function isCartLine(value: unknown): value is CartLine {
  const l = value as CartLine | null;
  return (
    !!l &&
    typeof l.productId === "string" &&
    typeof l.variantId === "string" &&
    typeof l.unitPriceMinor === "number" &&
    Number.isInteger(l.unitPriceMinor) &&
    l.unitPriceMinor >= 0 &&
    typeof l.quantity === "number" &&
    l.quantity > 0
  );
}
