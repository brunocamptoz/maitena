"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { CartButton } from "@/components/cart/cart-button";
import { nav, site } from "@/config/site";
import { cn } from "@/lib/cn";

export function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 bg-ink text-paper">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-5 md:h-20 md:px-10">
        {/* Izquierda */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={open}
            className="-ml-2 flex h-11 w-11 items-center justify-center md:hidden"
          >
            <span className="flex w-5 flex-col gap-[6px]">
              <span className="h-px w-full bg-current" />
              <span className="h-px w-3/5 bg-current" />
            </span>
          </button>
          <nav aria-label="Categorías" className="hidden gap-8 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[11px] uppercase tracking-[0.22em] text-paper/70 transition-colors hover:text-paper"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Centro */}
        <Link href="/" aria-label={`${site.name} — inicio`} className="text-center">
          <span className="block font-serif text-[26px] font-light uppercase leading-none tracking-[0.32em] md:text-[30px]">
            Maitena
          </span>
          <span className="mt-1 block text-[9px] uppercase tracking-[0.5em] text-paper/60">
            Joyas
          </span>
        </Link>

        {/* Derecha */}
        <div className="flex items-center justify-end gap-7">
          <Link
            href="/catalogo"
            className="hidden text-[11px] uppercase tracking-[0.22em] text-paper/70 transition-colors hover:text-paper md:block"
          >
            Ver todo
          </Link>
          <CartButton />
        </div>
      </div>

      {/* Menú mobile */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex flex-col bg-ink px-6 pb-10 pt-5 transition-opacity duration-500 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between">
          <span className="font-serif text-2xl font-light uppercase tracking-[0.32em]">
            Maitena
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="-mr-2 flex h-11 w-11 items-center justify-center"
          >
            <X strokeWidth={1} size={26} />
          </button>
        </div>
        <nav aria-label="Menú" className="mt-14 flex flex-col">
          {[...nav, { href: "/catalogo", label: "Ver todo" }].map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              style={{ transitionDelay: open ? `${120 + i * 60}ms` : "0ms" }}
              className={cn(
                "border-b border-paper/10 py-5 font-serif text-4xl font-light transition-all duration-700",
                open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
