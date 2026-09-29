"use client";

import { ShoppingBag } from "lucide-react";
import { selectCount, useCartStore } from "@/lib/cart/store";

export function CartButton() {
  const count = useCartStore(selectCount);
  const hydrated = useCartStore((s) => s.hydrated);
  const open = useCartStore((s) => s.open);
  const shown = hydrated ? count : 0;

  return (
    <button
      type="button"
      onClick={open}
      aria-label={
        shown > 0
          ? `Abrir carrito, ${shown} ${shown === 1 ? "producto" : "productos"}`
          : "Abrir carrito"
      }
      className="relative -mr-2 flex h-11 w-11 items-center justify-center"
    >
      <ShoppingBag size={22} strokeWidth={1} />
      {shown > 0 && (
        <span className="absolute right-0 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-paper px-1 text-[10px] font-medium leading-none tabular-nums text-ink">
          {shown}
        </span>
      )}
    </button>
  );
}
