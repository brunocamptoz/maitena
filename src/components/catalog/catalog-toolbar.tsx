"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  SORT_OPTIONS,
  hasActiveFilters,
  type Filters,
  type SortKey,
} from "@/lib/catalog-filters";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

type Props = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  shown: number;
  total: number;
  /** Solo si hay productos agotados en el listado. */
  showAvailability: boolean;
  /** Solo si el listado es lo bastante grande. */
  priceBounds: { min: number; max: number } | null;
};

export function CatalogToolbar({
  filters,
  onChange,
  onReset,
  shown,
  total,
  showAvailability,
  priceBounds,
}: Props) {
  const [priceOpen, setPriceOpen] = useState(
    filters.min !== null || filters.max !== null,
  );

  const active = hasActiveFilters(filters);

  return (
    <div className="border-b border-line py-5">
      {/* Mobile: fila 1 = cantidad + orden, fila 2 = filtros. Desktop: todo en una fila. */}
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <p className="order-1 text-[11px] uppercase tracking-[0.24em] text-stone" aria-live="polite">
          {shown === total
            ? `${total} ${total === 1 ? "pieza" : "piezas"}`
            : `${shown} de ${total} piezas`}
        </p>

        <div className="order-3 flex w-full flex-wrap items-center gap-x-7 gap-y-3 md:order-2 md:ml-auto md:w-auto">
          {showAvailability && (
            <label className="flex cursor-pointer items-center gap-3 text-[11px] uppercase tracking-[0.2em]">
              <button
                type="button"
                role="switch"
                aria-checked={filters.onlyAvailable}
                onClick={() => onChange({ onlyAvailable: !filters.onlyAvailable })}
                className={cn(
                  "relative h-5 w-9 border transition-colors duration-300",
                  filters.onlyAvailable ? "border-ink bg-ink" : "border-ink/30 bg-transparent",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1/2 h-3 w-3 -translate-y-1/2 transition-all duration-300",
                    filters.onlyAvailable ? "left-[calc(100%-1rem)] bg-paper" : "left-1 bg-ink/40",
                  )}
                />
                <span className="sr-only">Solo disponibles</span>
              </button>
              <span aria-hidden="true">Solo disponibles</span>
            </label>
          )}

          {priceBounds && (
            <button
              type="button"
              onClick={() => setPriceOpen((v) => !v)}
              aria-expanded={priceOpen}
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]"
            >
              Precio
              <ChevronDown
                size={13}
                strokeWidth={1.25}
                className={cn("transition-transform duration-300", priceOpen && "rotate-180")}
              />
            </button>
          )}
        </div>

        <label className="order-2 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] md:order-3">
          <span className="sr-only text-stone md:not-sr-only">Ordenar</span>
          <span className="relative">
            <select
              value={filters.sort}
              onChange={(e) => onChange({ sort: e.target.value as SortKey })}
              className="cursor-pointer appearance-none bg-transparent py-1 pr-6 uppercase tracking-[0.2em] focus:outline-none focus-visible:underline"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              strokeWidth={1.25}
              className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2"
            />
          </span>
        </label>
      </div>

      {priceBounds && priceOpen && (
        <PriceRange
          // Se vuelve a montar si cambian los valores desde afuera (ej. "Limpiar").
          key={`${filters.min ?? ""}-${filters.max ?? ""}`}
          filters={filters}
          bounds={priceBounds}
          onChange={onChange}
        />
      )}

      {active && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 text-[11px] uppercase tracking-[0.2em] text-stone underline decoration-line underline-offset-[8px] transition-colors hover:text-ink hover:decoration-ink"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

function PriceRange({
  filters,
  bounds,
  onChange,
}: {
  filters: Filters;
  bounds: { min: number; max: number };
  onChange: (patch: Partial<Filters>) => void;
}) {
  const commit = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const parse = (k: string) => {
      const v = Number.parseInt(String(data.get(k) ?? ""), 10);
      return Number.isFinite(v) && v >= 0 ? v : null;
    };
    onChange({ min: parse("min"), max: parse("max") });
  };

  const input =
    "h-11 w-full border border-ink/25 bg-transparent px-3 text-sm tabular-nums placeholder:text-stone focus:border-ink focus:outline-none";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        commit(e.currentTarget);
      }}
      onBlur={(e) => {
        // Aplica al salir del formulario (no entre un campo y otro).
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) commit(e.currentTarget);
      }}
      className="mt-5 flex max-w-md items-end gap-3"
    >
      <label className="flex-1 text-[10px] uppercase tracking-[0.2em] text-stone">
        Desde
        <input
          name="min"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={filters.min ?? ""}
          placeholder={String(bounds.min)}
          className={cn(input, "mt-2")}
        />
      </label>
      <label className="flex-1 text-[10px] uppercase tracking-[0.2em] text-stone">
        Hasta
        <input
          name="max"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={filters.max ?? ""}
          placeholder={String(bounds.max)}
          className={cn(input, "mt-2")}
        />
      </label>
      <button
        type="submit"
        className="h-11 border border-ink px-5 text-[10px] uppercase tracking-[0.24em] transition-colors hover:bg-ink hover:text-paper"
      >
        Aplicar
      </button>
      <span className="sr-only">
        Precios entre {formatPrice(bounds.min)} y {formatPrice(bounds.max)}
      </span>
    </form>
  );
}
