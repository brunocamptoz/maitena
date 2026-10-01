import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";

/**
 * Cliente de Supabase CON la sesión del administrador (cookies). Respeta las reglas de seguridad de la base
 * (RLS): solo funciona si el usuario está en `admin_users`. Se crea uno nuevo por cada pedido al servidor.
 */
export async function createSessionClient() {
  const url = serverEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = serverEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");

  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Desde un Server Component no se pueden escribir cookies: el proxy se ocupa de renovar la sesión.
        }
      },
    },
  });
}
