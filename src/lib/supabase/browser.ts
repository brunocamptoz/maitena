"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase en el NAVEGADOR del administrador, solo para subir fotografías directo a Storage
 * (sin pasar por el servidor, que limita el tamaño de la carga). Usa la clave pública y la sesión del admin:
 * la base solo deja escribir en el bucket a quien está en `admin_users`.
 */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
