import { ProductMedia } from "@/components/ui/product-media";
import type { CartLine } from "@/lib/cart/store";
import type { ShippingQuote } from "@/lib/checkout/types";
import { formatPrice } from "@/lib/format";

/** Productos, cantidades, subtotal, envío y total: todo lo que se va a cobrar, antes de pagar. */
export function OrderSummary({
  lines,
  subtotal,
  quote,
  quoting,
}: {
  lines: CartLine[];
  subtotal: number;
  quote: ShippingQuote | null;
  quoting: boolean;
}) {
  const ready = quote?.ok ? quote : null;
  const missing = ready?.freeShippingFrom && subtotal < ready.freeShippingFrom ? ready.freeShippingFrom - subtotal : 0;

  return (
    <div>
      <ul className="divide-y divide-line">
        {lines.map((line) => (
          <li key={line.productId} className="flex gap-4 py-4 first:pt-0">
            <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden bg-line/60">
              <ProductMedia src={line.image} alt="" category={line.category} sizes="56px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg leading-tight">{line.name}</p>
              <p className="mt-1 text-sm text-stone tabular-nums">
                {line.quantity} × {formatPrice(line.price)}
              </p>
            </div>
            <p className="shrink-0 text-sm tabular-nums">{formatPrice(line.price * line.quantity)}</p>
          </li>
        ))}
      </ul>

      <dl className="mt-6 space-y-3 border-t border-line pt-6 text-sm">
        <div className="flex items-baseline justify-between">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt>Envío</dt>
          <dd className="text-right tabular-nums">
            {ready ? (
              ready.shippingCost === 0 ? (
                "Gratis"
              ) : (
                formatPrice(ready.shippingCost)
              )
            ) : quoting ? (
              <span className="text-stone">Calculando…</span>
            ) : (
              <span className="text-stone">Elegí tu departamento</span>
            )}
          </dd>
        </div>
        {missing > 0 && (
          <p className="text-xs italic text-stone">
            Sumá {formatPrice(missing)} más y el envío es gratis.
          </p>
        )}
        <div className="flex items-baseline justify-between border-t border-line pt-4">
          <dt className="text-[11px] uppercase tracking-[0.24em]">Total</dt>
          <dd className="font-serif text-3xl tabular-nums">
            {ready ? formatPrice(ready.total) : formatPrice(subtotal)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
