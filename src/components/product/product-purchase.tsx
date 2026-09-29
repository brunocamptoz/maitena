"use client";

import { useState } from "react";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { buttonStyles } from "@/components/ui/button";
import { site } from "@/config/site";
import { useCartStore, type AddItem } from "@/lib/cart/store";

/** Selector de cantidad + "Agregar al carrito". Respeta el stock disponible y lo que ya hay en el carrito. */
export function ProductPurchase({ item }: { item: AddItem }) {
  const [qty, setQty] = useState(1);
  const add = useCartStore((s) => s.add);
  const open = useCartStore((s) => s.open);
  const inCart = useCartStore(
    (s) => s.lines.find((l) => l.productId === item.productId)?.quantity ?? 0,
  );

  const soldOut = item.stock <= 0;
  const remaining = Math.max(item.stock - inCart, 0);
  const safeQty = Math.min(qty, Math.max(remaining, 1));

  if (soldOut) {
    const { whatsapp } = site.contact;
    return (
      <div className="space-y-4">
        <button type="button" disabled className={buttonStyles({ full: true })}>
          Agotado
        </button>
        <p className="text-sm text-stone">
          Este producto no está disponible por el momento.
          {whatsapp && (
            <>
              {" "}
              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola! Me interesa "${item.name}".`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline underline-offset-4"
              >
                Consultanos por WhatsApp
              </a>
              .
            </>
          )}
        </p>
      </div>
    );
  }

  const onAdd = () => {
    if (add(item, safeQty) > 0) {
      setQty(1);
      open();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <QuantityStepper
          value={safeQty}
          max={Math.max(remaining, 1)}
          onChange={setQty}
          className={remaining <= 0 ? "pointer-events-none opacity-40" : undefined}
        />
        {remaining > 0 ? (
          <button type="button" onClick={onAdd} className={buttonStyles({ full: true })}>
            Agregar al carrito
          </button>
        ) : (
          <button
            type="button"
            onClick={open}
            className={buttonStyles({ variant: "outline", full: true })}
          >
            Ver carrito
          </button>
        )}
      </div>
      {remaining <= 0 && (
        <p className="text-sm text-stone" role="status">
          Ya tenés en tu carrito todas las unidades disponibles.
        </p>
      )}
    </div>
  );
}
