import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { categories } from "@/lib/categories";
import { listProducts } from "@/lib/products";

const staticPages = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/catalogo", priority: 0.9, changeFrequency: "weekly" },
  { path: "/envios", priority: 0.4, changeFrequency: "yearly" },
  { path: "/cambios-y-devoluciones", priority: 0.4, changeFrequency: "yearly" },
  { path: "/contacto", priority: 0.4, changeFrequency: "yearly" },
  { path: "/privacidad", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terminos", priority: 0.2, changeFrequency: "yearly" },
] as const;

/**
 * Mapa del sitio para buscadores. Incluye solo lo que conviene indexar: páginas públicas, las categorías que
 * tienen productos y los productos reales (los de demostración llevan `noindex`, así que no se listan).
 * Si la base no responde, devuelve igual las páginas fijas: el mapa nunca rompe el despliegue.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = staticPages.map((p) => ({
    url: `${site.url}${p.path}`,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  try {
    const products = (await listProducts()).filter((p) => !p.isDemo);

    for (const category of categories) {
      if (products.some((p) => p.category === category.slug)) {
        entries.push({
          url: `${site.url}/categoria/${category.slug}`,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
    for (const product of products) {
      entries.push({
        url: `${site.url}/productos/${product.slug}`,
        lastModified: product.createdAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (error) {
    console.error("[sitemap] no se pudieron leer los productos:", error);
  }

  return entries;
}
