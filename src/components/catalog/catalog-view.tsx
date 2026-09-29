import { Suspense } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CategoryNav } from "@/components/catalog/category-nav";
import {
  EmptyCatalog,
  ProductGrid,
  StaticProductGrid,
} from "@/components/catalog/product-grid";
import type { CategorySlug } from "@/lib/categories";
import type { ProductCardData } from "@/lib/types";

/** Estructura compartida por /catalogo y /categoria/[slug]. */
export function CatalogView({
  title,
  eyebrow,
  category,
  products,
}: {
  title: string;
  eyebrow: string;
  category: CategorySlug | null;
  products: ProductCardData[];
}) {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-8 md:px-10 md:pb-36 md:pt-12">
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          ...(category
            ? [{ label: "Catálogo", href: "/catalogo" }, { label: title }]
            : [{ label: "Catálogo" }]),
        ]}
      />

      <header className="mb-10 mt-10 md:mb-14 md:mt-14">
        <p className="text-[11px] uppercase tracking-[0.4em] text-stone">{eyebrow}</p>
        <h1 className="mt-4 font-serif text-5xl font-light leading-none md:text-7xl">
          {title}
        </h1>
      </header>

      <CategoryNav active={category} />

      {products.length === 0 ? (
        <EmptyCatalog />
      ) : (
        <Suspense fallback={<StaticProductGrid products={products} />}>
          <ProductGrid products={products} />
        </Suspense>
      )}
    </div>
  );
}
