import "server-only";
import { z } from "zod";
import { NEW_PRODUCT_DAYS } from "@/config/shop";
import { CATEGORY_SLUGS, type CategorySlug } from "@/lib/categories";
import { createPublicClient } from "@/lib/supabase/public";
import type { Product, ProductCardData, SyncedProduct } from "@/lib/types";

/**
 * Lectura de productos para la tienda pública (Supabase, con la clave pública y RLS).
 * Solo ve productos publicados y `available_stock` (stock menos reservas), nunca el stock real.
 */

const COLUMNS =
  "id, slug, name, description, price, category, available_stock, is_demo, created_at, " +
  "product_images ( image_url, alt, position )";

const rowSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number().int(),
  category: z.enum(CATEGORY_SLUGS),
  available_stock: z.number().int(),
  is_demo: z.boolean(),
  created_at: z.string(),
  product_images: z.array(
    z.object({ image_url: z.string(), alt: z.string(), position: z.number().int() }),
  ),
});

function toProduct(row: z.infer<typeof rowSchema>): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: row.price,
    category: row.category,
    stock: row.available_stock,
    isDemo: row.is_demo,
    createdAt: row.created_at,
    images: [...row.product_images]
      .sort((a, b) => a.position - b.position)
      .map((img) => ({ url: img.image_url, alt: img.alt || row.name })),
  };
}

function fail(what: string, message: string): never {
  throw new Error(`No se pudo leer ${what} desde Supabase: ${message}`);
}

const uuid = z.string().uuid();

export async function listProducts(opts: { category?: CategorySlug } = {}) {
  let query = createPublicClient()
    .from("products")
    .select(COLUMNS)
    .eq("active", true)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (opts.category) query = query.eq("category", opts.category);

  const { data, error } = await query;
  if (error) fail("los productos", error.message);
  return z.array(rowSchema).parse(data).map(toProduct);
}

export async function getProduct(slug: string) {
  const { data, error } = await createPublicClient()
    .from("products")
    .select(COLUMNS)
    .eq("slug", slug)
    .eq("active", true)
    .is("archived_at", null)
    .maybeSingle();
  if (error) fail("el producto", error.message);
  return data ? toProduct(rowSchema.parse(data)) : null;
}

/** Datos ACTUALES (sin caché) de varios productos. Ids que no son UUID simplemente no se encuentran. */
export async function getProductsByIds(ids: string[]) {
  const valid = ids.filter((id) => uuid.safeParse(id).success);
  if (valid.length === 0) return [];

  const { data, error } = await createPublicClient({ fresh: true })
    .from("products")
    .select(COLUMNS)
    .in("id", valid)
    .eq("active", true)
    .is("archived_at", null);
  if (error) fail("el carrito", error.message);
  return z.array(rowSchema).parse(data).map(toProduct);
}

/** Misma categoría primero; si faltan, completa con lo más nuevo del resto. */
export async function getRelatedProducts(product: Product, limit = 4) {
  const others = (await listProducts()).filter((p) => p.id !== product.id);
  const same = others.filter((p) => p.category === product.category);
  const rest = others.filter((p) => p.category !== product.category);
  return [...same, ...rest].slice(0, limit);
}

export async function listProductSlugs() {
  const { data, error } = await createPublicClient()
    .from("products")
    .select("slug")
    .eq("active", true)
    .is("archived_at", null);
  if (error) fail("los productos", error.message);
  return z.array(z.object({ slug: z.string() })).parse(data).map((row) => row.slug);
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
