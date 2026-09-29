import { ProductCard } from "@/components/catalog/product-card";
import type { ProductCardData } from "@/lib/types";

export function RelatedProducts({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby="related-title"
      className="mt-24 border-t border-line pt-16 md:mt-36 md:pt-24"
    >
      <p className="text-[11px] uppercase tracking-[0.4em] text-stone">Seguí explorando</p>
      <h2 id="related-title" className="mt-4 font-serif text-4xl font-light md:text-5xl">
        También te puede gustar
      </h2>
      <ul className="mt-12 grid grid-cols-2 gap-x-3 gap-y-12 md:grid-cols-4 md:gap-x-6">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
