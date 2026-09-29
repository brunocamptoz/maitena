"use client";

import { useEffect } from "react";
import { CART_STORAGE_KEY, useCartStore } from "@/lib/cart/store";
import { refreshCart } from "@/lib/cart/sync";

/** Carga el carrito guardado, lo actualiza contra el servidor y lo mantiene sincronizado entre pestañas. */
export function CartSync() {
  useEffect(() => {
    let cancelled = false;

    Promise.resolve(useCartStore.persist.rehydrate()).then(() => {
      if (cancelled) return;
      useCartStore.getState().markHydrated();
      void refreshCart();
    });

    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY) void useCartStore.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
