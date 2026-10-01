"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { chip } from "@/components/admin/ui";
import { monthLabel } from "@/lib/admin/sales";
import { cn } from "@/lib/cn";

const arrow =
  "inline-flex size-11 shrink-0 items-center justify-center border border-ink bg-ink text-paper/70 transition-colors hover:text-paper aria-disabled:pointer-events-none aria-disabled:opacity-30";

/**
 * Selector de mes: una tira que se desliza con el dedo o el mouse (y flechas para ir al mes anterior o siguiente).
 * El mes elegido va en la dirección (?mes=2026-09), así se puede compartir o guardar el enlace.
 */
export function MonthStrip({ months, selected }: { months: string[]; selected: string }) {
  const list = useRef<HTMLUListElement>(null);
  const index = months.indexOf(selected);
  const prev = index > 0 ? months[index - 1] : null;
  const next = index >= 0 && index < months.length - 1 ? months[index + 1] : null;

  // Deja el mes elegido a la vista (en el centro de la tira) al abrir o cambiar de mes.
  useEffect(() => {
    const container = list.current;
    const chip = container?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!container || !chip) return;
    container.scrollLeft = chip.offsetLeft - (container.clientWidth - chip.offsetWidth) / 2;
  }, [selected]);

  const href = (key: string) => `/admin/ventas?mes=${key}`;

  return (
    <nav aria-label="Elegir mes" className="mb-8 flex items-center gap-2">
      <Link
        href={prev ? href(prev) : "#"}
        prefetch={false}
        aria-label="Mes anterior"
        aria-disabled={!prev}
        tabIndex={prev ? 0 : -1}
        className={arrow}
      >
        <ChevronLeft size={18} strokeWidth={1.25} aria-hidden="true" />
      </Link>

      <ul
        ref={list}
        className="no-scrollbar relative flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto scroll-smooth"
        aria-label="Meses"
      >
        {months.map((key) => {
          const on = key === selected;
          return (
            <li key={key} className="shrink-0 snap-center">
              <Link
                href={href(key)}
                prefetch={false}
                aria-current={on ? "page" : undefined}
                className={cn(chip(on), "h-11 px-5 text-[11px]")}
              >
                {monthLabel(key, "short")}
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href={next ? href(next) : "#"}
        prefetch={false}
        aria-label="Mes siguiente"
        aria-disabled={!next}
        tabIndex={next ? 0 : -1}
        className={arrow}
      >
        <ChevronRight size={18} strokeWidth={1.25} aria-hidden="true" />
      </Link>
    </nav>
  );
}
