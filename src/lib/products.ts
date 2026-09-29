import "server-only";
import { demoProducts } from "@/data/demo-products";
import { NEW_PRODUCT_DAYS } from "@/config/shop";
import type { CategorySlug } from "@/lib/categories";
import type { Product, ProductCardData, SyncedProduct } from "@/lib/types";

/**
 * Capa de acceso a datos de la tienda pública.
 *
 * Hoy lee los productos demo. En el paso 4 SOLO cambia el cuerpo de estas funciones
 * (consultas a Supabase, devolviendo solo productos activos y `stock` disponible);
 * ninguna página ni componente necesita modificarse.
 */

const byNewest = (a: Product, b: Product) =>
  Date.parse(b.createdAt) - Date.parse(a.createdAt);

export async function listProducts(opts: { category?: CategorySlug } = {}) {
  return demoProducts
    .filter((p) => !opts.category || p.category === opts.category)
    .sort(byNewest);
}

export async function getProduct(slug: string) {
  return demoProducts.find((p) => p.slug === slug) ?? null;
}

export async function getProductsByIds(ids: string[]) {
  const wanted = new Set(ids);
  return demoProducts.filter((p) => wanted.has(p.id));
}

/** Misma categoría primero; si faltan, completa con lo más nuevo del resto. */
export async function getRelatedProducts(product: Product, limit = 4) {
  const others = (await listProducts()).filter((p) => p.id !== product.id);
  const same = others.filter((p) => p.category === product.category);
  const rest = others.filter((p) => p.category !== product.category);
  return [...same, ...rest].slice(0, limit);
}

export async function listProductSlugs() {
  return demoProducts.map((p) => p.slug);
}

export function toCardData(p: Product): ProductCardData {
  const createdAt = Date.parse(p.createdAt);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    category: p.category,
    stock: p.stock,
    isDemo: p.isDemo,
    isNew: Date.now() - createdAt < NEW_PRODUCT_DAYS * 86_400_000,
    images: p.images.slice(0, 2),
    createdAt,
  };
}

export function toSyncedProduct(p: Product): SyncedProduct {
  return {
    slug: p.slug,
    name: p.name,
    price: p.price,
    stock: p.stock,
    category: p.category,
    image: p.images[0]?.url ?? null,
  };
}
