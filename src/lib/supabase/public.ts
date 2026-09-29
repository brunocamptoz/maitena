import "server-only";
import { createClient } from "@supabase/supabase-js";

function required(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copiá .env.example a .env.local y completala (ver README).`,
    );
  }
  return value;
}

/**
 * Cliente de SOLO LECTURA con la clave pública (publishable/anon).
 * Está sujeto a las reglas de seguridad de la base (RLS): solo ve productos publicados y
 * únicamente las columnas permitidas (nunca el stock real). Es lo que usa la tienda pública.
 *
 * - Por defecto las respuestas se cachean 60 s y se pueden invalidar al instante con
 *   `revalidateTag("products")` (lo hará el admin al editar y el webhook al vender).
 * - `fresh: true` salta el caché (carrito y comprobaciones de stock).
 */
export function createPublicClient(opts: { fresh?: boolean } = {}) {
  const url = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) =>
        fetch(
          input,
          opts.fresh
            ? { ...init, cache: "no-store" }
            : { ...init, next: { revalidate: 60, tags: ["products"] } },
        ),
    },
  });
}
