import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la clave SECRETA (service_role): se salta todas las reglas de seguridad de la base.
 * Solo para código de servidor que ya validó todo (checkout, webhook, admin). Jamás importar desde
 * componentes de cliente: `server-only` hace fallar el build si alguien lo intenta.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Completá .env.local (ver README).",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    // Los datos de pedidos nunca se cachean.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
