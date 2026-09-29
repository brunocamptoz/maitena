"use client";

import { useEffect } from "react";
import { CartEmpty } from "@/components/cart/cart-empty";
import { CartLineItem } from "@/components/cart/cart-line";
import { CartSummary } from "@/components/cart/cart-summary";
import { useCartStore } from "@/lib/cart/store";
import { refreshCart } from "@/lib/cart/sync";

export function CartPageView() {
  const lines = useCartStore((s) => s.lines);
  const hydrated = useCartStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated) void refreshCart();
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div
        role="status"
        aria-label="Cargando carrito"
        className="grid animate-pulse gap-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
      >
        <div className="space-y-6">
          <div className="h-32 bg-line/70" />
          <div className="h-32 bg-line/70" />
        </div>
        <div className="h-64 bg-line/70" />
      </div>
    );
  }

  if (lines.length === 0) return <CartEmpty />;

  return (
    <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-24">
      <ul>
        {lines.map((line) => (
          <CartLineItem key={line.productId} line={line} />
        ))}
      </ul>
      <aside
        aria-label="Resumen del pedido"
        className="border border-line p-6 md:p-8 lg:sticky lg:top-28"
      >
        <h2 className="mb-6 font-serif text-2xl font-light">Resumen</h2>
        <CartSummary />
      </aside>
    </div>
  );
}
