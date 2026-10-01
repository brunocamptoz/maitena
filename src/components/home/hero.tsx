import Link from "next/link";
import { site } from "@/config/site";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-paper">
      {/* Luz suave: reemplazable por fotografía editorial */}
      <div
        aria-hidden="true"
        className="animate-glint pointer-events-none absolute -right-1/4 top-[-20%] -z-10 h-[90%] w-[85%] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.16),transparent)] blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-paper/[0.04] to-transparent"
      />

      <div className="mx-auto flex max-w-7xl flex-col px-5 pb-16 pt-14 md:px-10 md:pb-24 md:pt-20">
        <p className="mb-6 text-[11px] uppercase tracking-[0.4em] text-paper/60">
          Joyas de plata · Uruguay
        </p>
        <h1 className="font-serif text-[clamp(3.6rem,15vw,10.5rem)] font-light uppercase leading-[0.9] tracking-[0.04em]">
          Maitena
          <span className="mt-2 block text-[0.28em] tracking-[0.6em] text-paper/70">
            Joyas
          </span>
        </h1>

        <div className="mt-12 flex flex-col gap-8 md:mt-16 md:flex-row md:items-end md:justify-between">
          <p className="max-w-sm font-serif text-2xl font-light italic leading-snug text-paper/85 md:text-3xl">
            {site.tagline}.
          </p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href="/catalogo"
              className="group inline-flex h-14 items-center gap-4 bg-paper px-8 text-[11px] uppercase tracking-[0.28em] text-ink transition-colors duration-500 hover:bg-silver"
            >
              Ver colección
              <span
                aria-hidden="true"
                className="inline-block h-px w-6 bg-ink transition-all duration-500 group-hover:w-10"
              />
            </Link>
            <a
              href="#categorias"
              className="text-[11px] uppercase tracking-[0.28em] text-paper/70 underline decoration-paper/30 underline-offset-[10px] transition-colors hover:text-paper"
            >
              Explorar categorías
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
