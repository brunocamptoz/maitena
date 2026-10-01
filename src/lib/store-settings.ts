import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

/** Etiqueta del caché del dato: el panel la invalida al guardar los costos de envío (`revalidateTag`). */
export const SHIPPING_TAG = "shipping";

/**
 * Monto desde el cual el envío es gratis (el que se guarda en /admin → Envíos), o null si no hay promoción
 * o todavía no se configuró el envío (mientras no se pueda cobrar, la tienda no promete nada).
 *
 * Los ajustes de la tienda no son de lectura pública, así que se leen en el servidor con la clave secreta, y
 * solo estas dos columnas. Se cachea 60 s (y se refresca al instante cuando el panel guarda). Nunca lanza:
 * si falla la lectura, el sitio simplemente no muestra el cartel.
 */
export async function getFreeShippingFrom(): Promise<number | null> {
  const url = serverEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;

  try {
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 60, tags: [SHIPPING_TAG] } }),
      },
    });
    const { data, error } = await db.from("store_settings").select("free_shipping_from, shipping_configured").single();
    if (error || !data) return null;
    const from = data.free_shipping_from;
    return data.shipping_configured && typeof from === "number" && from > 0 ? from : null;
  } catch {
    return null;
  }
}
