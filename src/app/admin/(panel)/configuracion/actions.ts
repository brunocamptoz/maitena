"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { parseShippingForm } from "@/lib/admin/shipping-schema";
import { SHIPPING_TAG } from "@/lib/store-settings";

export type ShippingState = { ok?: boolean; message?: string; errors?: Record<string, string> };

export async function saveShipping(_prev: ShippingState, formData: FormData): Promise<ShippingState> {
  const { db } = await requireAdminAction();

  const parsed = parseShippingForm((key) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  });
  if (!parsed.ok) return { errors: parsed.errors, message: "Revisá los campos marcados." };
  const { defaultCost, freeFrom } = parsed.value;

  const { error } = await db
    .from("store_settings")
    .update({ shipping_default_cost: defaultCost, free_shipping_from: freeFrom, shipping_configured: true })
    .eq("id", true);
  if (error) {
    console.error("[admin/shipping] ajustes:", error.code, error.message);
    return { message: "No se pudo guardar. Intentá de nuevo." };
  }

  // El cartel "Envío gratis a partir de…" de la tienda toma el monto de acá: se actualiza al instante.
  revalidateTag(SHIPPING_TAG, { expire: 0 });
  revalidatePath("/admin/configuracion");
  return { ok: true, message: "Costos de envío guardados. Ya se aplican a las compras nuevas." };
}
