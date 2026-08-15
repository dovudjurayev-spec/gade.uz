"use client";

import { create } from "zustand";

type FavoritesState = {
  ids: Set<number>;
  authed: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  toggle: (productId: number) => Promise<boolean>;
};

export const useFavorites = create<FavoritesState>((set, get) => ({
  ids: new Set<number>(),
  authed: false,
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const res = await fetch("/api/favorites", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { ids: number[]; authed: boolean };
      set({ ids: new Set(data.ids), authed: data.authed, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  toggle: async (productId) => {
    const current = get().ids;
    const wasFavorite = current.has(productId);
    // Optimistic
    const next = new Set(current);
    if (wasFavorite) next.delete(productId);
    else next.add(productId);
    set({ ids: next });

    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.status === 401) {
        // revert & redirect to login
        set({ ids: current });
        if (typeof window !== "undefined") {
          window.location.href = "/account/login?redirect=" + encodeURIComponent(window.location.pathname);
        }
        return wasFavorite;
      }
      if (!res.ok) {
        set({ ids: current });
        return wasFavorite;
      }
      const data = (await res.json()) as { favorite: boolean };
      return data.favorite;
    } catch {
      set({ ids: current });
      return wasFavorite;
    }
  },
}));
