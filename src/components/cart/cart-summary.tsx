"use client";

import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { selectHasUnavailable, selectSubtotal, useCartStore } from "@/lib/cart/store";
import { formatPrice } from "@/lib/format";

/** Subtotal y acceso al checkout. El costo de envío se calcula en el checkout (según el departamento). */
export function CartSummary({
  onNavigate,
  showContinue = true,
}: {
  onNavigate?: () => void;
  showContinue?: boolean;
}) {
  const subtotal = useCartStore(selectSubtotal);
  const blocked = useCartStore(selectHasUnavailable);

  return (
    <div>
      <dl className="space-y-3 text-sm">
        <div className="flex items-baseline justify-between">
          <dt className="text-[11px] uppercase tracking-[0.24em]">Subtotal</dt>
          <dd className="text-base tabular-nums">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex items-baseline justify-between text-stone">
          <dt>Envío</dt>
          <dd>Se calcula al finalizar la compra</dd>
        </div>
      </dl>

      {blocked && (
        <p role="status" className="mt-5 text-xs italic leading-snug text-stone">
          Quitá los productos no disponibles para continuar.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {blocked || subtotal <= 0 ? (
          <button type="button" disabled className={buttonStyles({ full: true })}>
            Finalizar compra
          </button>
        ) : (
          <Link
            href="/checkout"
            onClick={onNavigate}
            className={buttonStyles({ full: true })}
          >
            Finalizar compra
          </Link>
        )}
        {showContinue && (
          <Link
            href="/catalogo"
            onClick={onNavigate}
            className={buttonStyles({ variant: "outline", full: true })}
          >
            Continuar comprando
          </Link>
        )}
      </div>

      <p className="mt-5 text-center text-xs text-stone">
        Pago seguro con Mercado Pago.
      </p>
    </div>
  );
}
