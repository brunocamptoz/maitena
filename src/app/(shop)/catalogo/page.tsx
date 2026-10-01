import type { Metadata } from "next";
import { CatalogView } from "@/components/catalog/catalog-view";
import { listProducts, toCardData } from "@/lib/products";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Todas las joyas y accesorios de plata de Maitena Joyas. Envíos a todo Uruguay.",
  alternates: { canonical: "/catalogo" },
};

export default async function CatalogPage() {
  const products = (await listProducts()).map(toCardData);

  return (
    <CatalogView
      title="Todas las piezas"
      eyebrow="Colección"
      category={null}
      products={products}
    />
  );
}
