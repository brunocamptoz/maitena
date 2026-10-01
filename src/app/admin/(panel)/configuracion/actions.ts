"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { parseShippingForm } from "@/lib/admin/shipping-schema";

export type ShippingState = { ok?: boolean; message?: string; errors?: Record<string, string> };

export async function saveShipping(_prev: ShippingState, formData: FormData): Promise<ShippingState> {
  const { db } = await requireAdminAction();

  const { data: departments, error: depError } = await db.from("departments").select("name").order("sort_order");
  if (depError || !departments) return { message: "No se pudieron leer los departamentos. Recargá la página." };

  const names = departments.map((d) => d.name);
  const parsed = parseShippingForm((key) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  }, names);
  if (!parsed.ok) return { errors: parsed.errors, message: "Revisá los campos marcados." };
  const { defaultCost, freeFrom, rates } = parsed.value;

  // Se guardan primero las tarifas y al final se marca como configurado: si algo falla a mitad de camino,
  // la tienda sigue sin poder cobrar en vez de cobrar con costos a medio cargar.
  const withRate = Object.entries(rates).map(([department, cost]) => ({ department, cost }));
  if (withRate.length > 0) {
    const { error } = await db.from("shipping_rates").upsert(withRate, { onConflict: "department" });
    if (error) return failure("tarifas", error);
  }
  const blank = names.filter((n) => !(n in rates));
  if (blank.length > 0) {
    const { error } = await db.from("shipping_rates").delete().in("department", blank);
    if (error) return failure("tarifas", error);
  }

  const { error } = await db
    .from("store_settings")
    .update({ shipping_default_cost: defaultCost, free_shipping_from: freeFrom, shipping_configured: true })
    .eq("id", true);
  if (error) return failure("ajustes", error);

  revalidatePath("/admin/configuracion");
  return { ok: true, message: "Costos de envío guardados. Ya se aplican a las compras nuevas." };
}

function failure(what: string, error: { code?: string; message: string }): ShippingState {
  console.error(`[admin/shipping] ${what}:`, error.code, error.message);
  return { message: "No se pudo guardar. Intentá de nuevo." };
}
