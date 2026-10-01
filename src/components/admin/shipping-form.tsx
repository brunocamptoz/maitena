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
  rates: Record<string, string>;
};

export function ShippingForm({ departments, initial }: { departments: string[]; initial: ShippingFormValues }) {
  const [state, action, pending] = useActionState<ShippingState, FormData>(saveShipping, {});
  // Controlados: React 19 vacía los campos sin control cuando termina la acción.
  const [defaultCost, setDefaultCost] = useState(initial.defaultCost);
  const [freeFrom, setFreeFrom] = useState(initial.freeFrom);
  const [rates, setRates] = useState(initial.rates);
  const errors = state.errors ?? {};

  return (
    <form action={action} className="space-y-10" noValidate>
      <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="defaultCost" className={label}>
            Costo de envío general (UYU)
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
            {errors.defaultCost ?? "Se cobra en todos los departamentos que no tengan un costo propio. Poné 0 si el envío es gratis."}
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

      <fieldset>
        <legend className="mb-1 text-[11px] uppercase tracking-[0.24em]">Costo por departamento</legend>
        <p className="mb-5 max-w-xl text-sm text-stone">
          Opcional. Dejá vacío el departamento que use el costo general.
        </p>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => {
            const key = `rate:${dept}`;
            return (
              <div key={dept}>
                <label htmlFor={key} className="mb-1.5 block text-sm">
                  {dept}
                </label>
                <input
                  id={key}
                  name={key}
                  value={rates[dept] ?? ""}
                  onChange={(e) => setRates((r) => ({ ...r, [dept]: e.target.value }))}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={defaultCost.trim() || "General"}
                  aria-invalid={!!errors[key]}
                  aria-describedby={errors[key] ? `${key}-error` : undefined}
                  className={input}
                />
                {errors[key] && (
                  <p id={`${key}-error`} role="alert" className="mt-1 text-xs text-error">
                    {errors[key]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

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
