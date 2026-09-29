import Image from "next/image";
import Link from "next/link";
import { categories, type Category } from "@/lib/categories";
import { CategoryGlyph } from "@/components/ui/category-glyph";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/cn";

/**
 * Composición asimétrica: en desktop cada tarjeta tiene distinto alto y
 * posición vertical; en mobile es una pila de tarjetas grandes.
 */
const layout = [
  "md:col-span-7 md:aspect-[4/3]",
  "md:col-span-5 md:aspect-[4/5] md:mt-24",
  "md:col-span-5 md:aspect-[4/5] md:-mt-10",
  "md:col-span-7 md:aspect-[4/3] md:mt-14",
];

const tone = [
  "from-[#1b1a18] to-[#34312d]",
  "from-[#dcd8d1] to-[#f1eee9] text-ink",
  "from-[#ece8e1] to-[#cfcbc3] text-ink",
  "from-[#2a2826] to-[#0f0f0e]",
];

function Card({ category, index }: { category: Category; index: number }) {
  const light = index === 1 || index === 2;
  return (
    <Link
      href={`/categoria/${category.slug}`}
      className="group absolute inset-0 block overflow-hidden"
    >
      {category.image ? (
        <Image
          src={category.image}
          alt=""
          fill
          sizes="(min-width: 768px) 58vw, 100vw"
          className="object-cover transition-transform duration-[1400ms] ease-[var(--ease-soft)] group-hover:scale-[1.04]"
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br text-paper transition-transform duration-[1400ms] ease-[var(--ease-soft)] group-hover:scale-[1.04]",
            tone[index],
          )}
        >
          <CategoryGlyph
            slug={category.slug}
            className="absolute right-[8%] top-1/2 h-[62%] -translate-y-1/2 opacity-40 transition-all duration-[1400ms] ease-[var(--ease-soft)] group-hover:opacity-70"
          />
        </div>
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex items-end justify-between p-6 md:p-9",
          light ? "text-ink" : "text-paper",
        )}
      >
        <div>
          <span className="text-[10px] uppercase tracking-[0.35em] opacity-60">
            0{index + 1}
          </span>
          <h3 className="mt-2 font-serif text-5xl font-light leading-none md:text-6xl">
            {category.name}
          </h3>
        </div>
        <span className="mb-1 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em]">
          <span className="hidden sm:inline">Descubrir</span>
          <span
            aria-hidden="true"
            className="h-px w-8 bg-current transition-all duration-500 group-hover:w-14"
          />
        </span>
      </div>
    </Link>
  );
}

export function CategoryShowcase() {
  return (
    <section
      id="categorias"
      className="mx-auto max-w-7xl scroll-mt-16 px-5 py-24 md:px-10 md:py-36"
    >
      <Reveal className="mb-14 flex items-end justify-between gap-6 md:mb-20">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-stone">
            Colección
          </p>
          <h2 className="mt-4 font-serif text-4xl font-light leading-tight md:text-6xl">
            Cuatro maneras <br className="hidden md:block" />
            de llevar plata
          </h2>
        </div>
        <Link
          href="/catalogo"
          className="hidden shrink-0 border-b border-ink pb-1 text-[11px] uppercase tracking-[0.28em] transition-colors hover:text-stone md:block"
        >
          Ver todo
        </Link>
      </Reveal>

      <div className="grid gap-4 md:grid-cols-12 md:gap-x-6 md:gap-y-6">
        {categories.map((category, i) => (
          <Reveal
            key={category.slug}
            delay={(i % 2) * 120}
            className={cn("relative aspect-[4/5]", layout[i])}
          >
            <Card category={category} index={i} />
          </Reveal>
        ))}
      </div>

      <div className="mt-12 md:hidden">
        <Link
          href="/catalogo"
          className="flex h-14 items-center justify-center border border-ink text-[11px] uppercase tracking-[0.28em]"
        >
          Ver todo
        </Link>
      </div>
    </section>
  );
}
