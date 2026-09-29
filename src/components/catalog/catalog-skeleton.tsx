import { ProductCardSkeleton } from "@/components/catalog/product-card";

/** Esqueleto de carga para listados (se usa desde loading.tsx). */
export function CatalogSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="mx-auto max-w-7xl px-5 pb-24 pt-8 md:px-10 md:pt-12"
    >
      <div className="h-3 w-40 animate-pulse bg-line/70" />
      <div className="mb-14 mt-14 h-14 w-2/3 max-w-md animate-pulse bg-line/70 md:h-20" />
      <div className="h-12 border-b border-line" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-12 pt-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
