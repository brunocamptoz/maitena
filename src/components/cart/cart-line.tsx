"use client";

import Link from "next/link";
import { ProductMedia } from "@/components/ui/product-media";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { useCartStore, type CartLine } from "@/lib/cart/store";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

export function CartLineItem({ line }: { line: CartLine }) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const close = useCartStore((s) => s.close);
  const unavailable = line.status === "unavailable";
  const href = `/productos/${line.slug}`;

  return (
    <li className="flex gap-4 border-b border-line py-6 first:pt-0">
      <Link
        href={href}
        onClick={close}
        className={cn(
          "relative block aspect-[4/5] w-20 shrink-0 overflow-hidden bg-line/60 sm:w-24",
          unavailable && "opacity-50",
        )}
        tabIndex={-1}
        aria-hidden="true"
      >
        <ProductMedia
          src={line.image}
          alt=""
          category={line.category}
          sizes="96px"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link href={href} onClick={close}>
              <h3 className={cn("font-serif text-xl leading-tight", unavailable && "text-stone")}>
                {line.name}
              </h3>
            </Link>
            <p className="mt-1 text-sm tabular-nums text-stone">{formatPrice(line.price)}</p>
          </div>
          {!unavailable && (
            <p className="shrink-0 text-sm tabular-nums">
              {formatPrice(line.price * line.quantity)}
            </p>
          )}
        </div>

        {line.notice && (
          <p role="status" className="mt-2 text-xs italic leading-snug text-stone">
            {line.notice}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          {unavailable ? (
            <span />
          ) : (
            <QuantityStepper
              size="md"
              value={line.quantity}
              max={line.stock}
              onChange={(q) => setQuantity(line.productId, q)}
              label={`Cantidad de ${line.name}`}
            />
          )}
          <button
            type="button"
            onClick={() => remove(line.productId)}
            className="text-[10px] uppercase tracking-[0.2em] text-stone underline decoration-line underline-offset-[6px] transition-colors hover:text-ink hover:decoration-ink"
          >
            Quitar
          </button>
        </div>
      </div>
    </li>
  );
}
