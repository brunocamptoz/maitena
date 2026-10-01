"use client";

import { useActionState, useState } from "react";
import { saveShipping, type ShippingState } from "@/app/admin/(panel)/configuracion/actions";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const input =
  "h-11 w-full border border-ink/25 bg-transparent px-3 text-[15px] tabular-nums focus:border-ink focus:outline-none aria-[invalid=true]:border-error";
const label = "mb-1.5 block text-[10px] uppercase tracking-[0.22em]";

export type ShippingFormValues = {
  defaultCost: string;
  freeFrom: string;
};

export function ShippingForm({ initial }: { initial: ShippingFormValues }) {
  const [state, action, pending] = useActionState<ShippingState, FormData>(saveShipping, {});
  // Controlados: React 19 vacía los campos sin control cuando termina la acción.
  const [defaultCost, setDefaultCost] = useState(initial.defaultCost);
  const [freeFrom, setFreeFrom] = useState(initial.freeFrom);
  const errors = state.errors ?? {};

  return (
    <form action={action} className="space-y-8" noValidate>
      <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="defaultCost" className={label}>
            Costo de envío (UYU)
          </label>
          <input
            id="defaultCost"
            name="defaultCost"
            value={defaultCost}
            onChange={(e) => setDefaultCost(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={!!errors.defaultCost}
            aria-describedby="defaultCost-hint"
            className={input}
          />
          <p id="defaultCost-hint" className={cn("mt-1.5 text-xs", errors.defaultCost ? "text-error" : "text-stone")}>
            {errors.defaultCost ?? "Se cobra en todo el país. Poné 0 si el envío es gratis."}
          </p>
        </div>
        <div>
          <label htmlFor="freeFrom" className={label}>
            Envío gratis desde (UYU)
          </label>
          <input
            id="freeFrom"
            name="freeFrom"
            value={freeFrom}
            onChange={(e) => setFreeFrom(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Sin promoción"
            aria-invalid={!!errors.freeFrom}
            aria-describedby="freeFrom-hint"
            className={input}
          />
          <p id="freeFrom-hint" className={cn("mt-1.5 text-xs", errors.freeFrom ? "text-error" : "text-stone")}>
            {errors.freeFrom ?? "Si el subtotal de la compra llega a este monto, el envío no se cobra. Vacío = sin promoción."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={buttonStyles({ size: "md" })}>
          {pending ? "Guardando…" : "Guardar costos de envío"}
        </button>
        <p role={state.ok ? "status" : "alert"} className={cn("text-sm", state.ok ? "text-ink" : "text-error")}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
