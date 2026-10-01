import { Fragment } from "react";
import Link from "next/link";
import { site } from "@/config/site";
import { categories } from "@/lib/categories";

/**
 * Ilustración de línea fina (brillante tallado) con órbitas y destellos. Es decorativa: reemplazable por una
 * fotografía editorial cuando exista. Solo trazos blancos de baja opacidad sobre el fondo negro.
 */
function HeroGem({ className }: { className?: string }) {
  const star = "M0 -9Q0 0 9 0Q0 0 0 9Q0 0 -9 0Q0 0 0 -9Z";
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true" fill="none">
      <defs>
        <linearGradient id="hero-gem-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#faf8f5" stopOpacity="0.12" />
          <stop offset="1" stopColor="#faf8f5" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Órbitas */}
      <circle cx="200" cy="200" r="196" stroke="#faf8f5" strokeOpacity="0.1" strokeWidth="0.6" />
      <circle cx="200" cy="200" r="148" stroke="#faf8f5" strokeOpacity="0.12" strokeWidth="0.6" />
      <circle
        cx="200"
        cy="200"
        r="172"
        stroke="#faf8f5"
        strokeOpacity="0.25"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeDasharray="0.5 8"
        className="animate-orbit"
      />

      {/* Brillante */}
      <g transform="translate(90 103) scale(1.1)" stroke="#faf8f5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M55 15H145L190 65L100 170L10 65Z" fill="url(#hero-gem-fill)" strokeOpacity="0.6" strokeWidth="0.9" />
        <path d="M75 65L100 15L125 65Z" fill="#faf8f5" fillOpacity="0.07" strokeOpacity="0.4" strokeWidth="0.7" />
        <path d="M10 65H190" strokeOpacity="0.5" strokeWidth="0.7" />
        <path d="M55 15L75 65M145 15L125 65" strokeOpacity="0.4" strokeWidth="0.7" />
        <path d="M75 65L100 170L125 65M42 65L100 170L158 65" strokeOpacity="0.3" strokeWidth="0.7" />
        {/* Destellos */}
        <path d={star} transform="translate(55 15)" fill="#faf8f5" stroke="none" className="animate-twinkle" />
        <path
          d={star}
          transform="translate(190 65)"
          fill="#faf8f5"
          stroke="none"
          className="animate-twinkle"
          style={{ "--d": "1800ms" } as React.CSSProperties}
        />
        <path
          d={star}
          transform="translate(100 170)"
          fill="#faf8f5"
          stroke="none"
          className="animate-twinkle"
          style={{ "--d": "3300ms" } as React.CSSProperties}
        />
      </g>
    </svg>
  );
}

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

export function Hero() {
  // Solo datos reales: las categorías de la tienda y lo que ya se promete en el sitio.
  const ticker = [...categories.map((c) => c.name), "Envíos a todo Uruguay", "Joyas de plata"];

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
      <div aria-hidden="true" className="grain pointer-events-none absolute inset-0 -z-10" />

      {/* Guías verticales, como columnas de una revista */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 mx-auto hidden max-w-7xl px-10 md:block">
        <div className="relative h-full">
          <span className="absolute inset-y-0 -left-6 w-px bg-gradient-to-b from-transparent via-paper/10 to-transparent" />
          <span className="absolute inset-y-0 -right-6 w-px bg-gradient-to-b from-transparent via-paper/10 to-transparent" />
        </div>
      </div>

      {/* Brillante */}
      <HeroGem className="animate-float pointer-events-none absolute -right-[14%] top-4 -z-[5] w-[78vw] max-w-[360px] opacity-40 md:right-[6%] md:top-6 md:w-[min(31vw,420px)] md:max-w-none md:opacity-100" />

      <div className="relative mx-auto flex max-w-7xl flex-col px-5 pb-16 pt-14 md:px-10 md:pb-24 md:pt-20">
        <p
          className="animate-rise mb-6 flex items-center gap-4 text-[11px] uppercase tracking-[0.4em] text-paper/60"
          style={delay(100)}
        >
          <span aria-hidden="true" className="h-px w-10 bg-paper/40" />
          Joyas de plata · Uruguay
        </p>
        <h1
          className="animate-rise font-serif text-[clamp(3.6rem,15vw,10.5rem)] font-light uppercase leading-[0.9] tracking-[0.04em]"
          style={delay(250)}
        >
          Maitena
          <span className="mt-2 block text-[0.28em] tracking-[0.6em] text-paper/70">
            Joyas
          </span>
        </h1>

        <div
          className="animate-rise mt-12 flex flex-col gap-8 md:mt-16 md:flex-row md:items-end md:justify-between"
          style={delay(450)}
        >
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

      {/* Cinta de categorías (decorativa; el menú tiene los mismos enlaces) */}
      <div aria-hidden="true" className="marquee relative border-t border-paper/10">
        <div className="overflow-hidden py-4">
          <div className="animate-marquee flex w-max text-[10px] uppercase tracking-[0.4em] text-paper/45">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center gap-10 pr-10">
                {ticker.map((text) => (
                  <Fragment key={text}>
                    <span className="whitespace-nowrap">{text}</span>
                    <span className="size-1 shrink-0 rotate-45 border border-paper/40" />
                  </Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
