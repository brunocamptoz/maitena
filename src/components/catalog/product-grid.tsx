"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CatalogToolbar } from "@/components/catalog/catalog-toolbar";
import { ProductCard } from "@/components/catalog/product-card";
import { buttonStyles } from "@/components/ui/button";
import { PRICE_FILTER_MIN_PRODUCTS } from "@/config/shop";
import {
  DEFAULT_FILTERS,
  applyFilters,
  parseFilters,
  serializeFilters,
  type Filters,
} from "@/lib/catalog-filters";
import type { ProductCardData } from "@/lib/types";

/**
 * Grilla con orden y filtros. El estado vive en la URL (?orden=…&disponibles=1&desde=…&hasta=…),
 * así los filtros se pueden compartir y el botón "atrás" funciona. Todo se resuelve en el navegador,
 * sin ir al servidor: la página en sí es estática y rápida.
 */
export function ProductGrid({ products }: { products: ProductCardData[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const visible = useMemo(() => applyFilters(products, filters), [products, filters]);

  // Los filtros extra aparecen solo cuando aportan.
  const showAvailability = products.some((p) => p.stock <= 0);
  const priceBounds = useMemo(() => {
    if (products.length < PRICE_FILTER_MIN_PRODUCTS) return null;
    const prices = products.map((p) => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [products]);

  const navigate = (next: Filters) => {
    const qs = serializeFilters(next);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div>
      {products.length > 1 && (
        <CatalogToolbar
          filters={filters}
          onChange={(patch) => navigate({ ...filters, ...patch })}
          onReset={() => navigate({ ...DEFAULT_FILTERS, sort: filters.sort })}
          shown={visible.length}
          total={products.length}
          showAvailability={showAvailability}
          priceBounds={priceBounds}
        />
      )}

      {visible.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-12 pt-8 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {visible.map((product, i) => (
            <li key={product.id}>
              <ProductCard product={product} preload={i < 2} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-24 text-center">
          <p className="font-serif text-3xl font-light">
            No encontramos piezas con esos filtros
          </p>
          <button
            type="button"
            onClick={() => navigate({ ...DEFAULT_FILTERS, sort: filters.sort })}
            className={buttonStyles({ variant: "outline", className: "mt-8" })}
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}

/** Se muestra en el HTML inicial (SEO y carga rápida) hasta que el navegador activa los filtros. */
export function StaticProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div>
      {/* Reserva el alto de la barra de filtros para evitar saltos de layout. */}
      <div aria-hidden="true" className="h-[4.25rem] border-b border-line" />
      <ul className="grid grid-cols-2 gap-x-3 gap-y-12 pt-8 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
        {products.map((product, i) => (
          <li key={product.id}>
            <ProductCard product={product} preload={i < 2} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EmptyCatalog() {
  return (
    <div className="py-24 text-center">
      <p className="font-serif text-4xl font-light">Estamos preparando esta colección</p>
      <p className="mx-auto mt-4 max-w-sm text-stone">
        Muy pronto vas a encontrar piezas nuevas acá.
      </p>
      <Link href="/catalogo" className={buttonStyles({ variant: "outline", className: "mt-10" })}>
        Ver todo
      </Link>
    </div>
  );
}
