import Link from "next/link";
import { ProductCard } from "@/components/catalog/product-card";
import { Reveal } from "@/components/ui/reveal";
import { listProducts, toCardData } from "@/lib/products";

/** Últimas piezas publicadas. Se oculta solo si todavía no hay productos. */
export async function NewArrivals() {
  const products = (await listProducts()).slice(0, 4).map(toCardData);
  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby="new-title"
      className="mx-auto max-w-7xl px-5 pb-24 md:px-10 md:pb-36"
    >
      <Reveal className="mb-12 flex items-end justify-between gap-6 md:mb-16">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-stone">Novedades</p>
          <h2 id="new-title" className="mt-4 font-serif text-4xl font-light md:text-6xl">
            Lo último
          </h2>
        </div>
        <Link
          href="/catalogo"
          className="shrink-0 border-b border-ink pb-1 text-[11px] uppercase tracking-[0.28em] transition-colors hover:text-stone"
        >
          Ver todo
        </Link>
      </Reveal>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-12 md:grid-cols-4 md:gap-x-6">
        {products.map((product, i) => (
          <li key={product.id}>
            <Reveal delay={i * 90}>
              <ProductCard product={product} />
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
