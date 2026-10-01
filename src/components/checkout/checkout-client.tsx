"use client";

import { CartEmpty } from "@/components/cart/cart-empty";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { useCartStore } from "@/lib/cart/store";

/** Espera a leer el carrito guardado en el navegador antes de mostrar el formulario. */
export function CheckoutClient() {
  const hydrated = useCartStore((s) => s.hydrated);
  const count = useCartStore((s) => s.lines.length);

  if (!hydrated) {
    return (
      <div role="status" aria-label="Cargando" className="mx-auto max-w-7xl animate-pulse px-5 py-16 md:px-10">
        <h1 className="sr-only">Finalizar compra</h1>
        <div className="h-3 w-56 bg-line/70" />
        <div className="mt-14 h-16 w-2/3 max-w-lg bg-line/70" />
        <div className="mt-12 grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:gap-24">
          <div className="space-y-5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-12 bg-line/70" />
            ))}
          </div>
          <div className="h-72 bg-line/70" />
        </div>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 md:py-28">
        <h1 className="sr-only">Finalizar compra</h1>
        <CartEmpty />
      </div>
    );
  }

  return <CheckoutForm />;
}
