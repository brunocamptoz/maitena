"use server";

import { z } from "zod";
import { getProductsByIds, toSyncedProduct } from "@/lib/products";
import type { SyncedProduct } from "@/lib/types";

const input = z
  .array(
    z.object({
      productId: z.string().min(1).max(64),
      quantity: z.number().int().min(1).max(999),
    }),
  )
  .max(100);

/**
 * Devuelve el estado ACTUAL (precio, stock, disponibilidad) de los productos del carrito,
 * para que el navegador nunca muestre datos viejos. `null` = ya no existe / no está publicado.
 * Es solo informativo: el precio que se cobra siempre se recalcula en el checkout.
 */
export async function syncCart(
  items: unknown,
): Promise<Record<string, SyncedProduct | null>> {
  const parsed = input.safeParse(items);
  if (!parsed.success) return {};

  const ids = [...new Set(parsed.data.map((i) => i.productId))];
  const found = await getProductsByIds(ids);
  const byId = new Map(found.map((p) => [p.id, toSyncedProduct(p)]));

  return Object.fromEntries(ids.map((id) => [id, byId.get(id) ?? null]));
}
