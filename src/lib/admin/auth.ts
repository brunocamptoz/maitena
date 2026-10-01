import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session";

/**
 * Autorización del panel. Se comprueba EN EL SERVIDOR en cada página y cada acción:
 *   1. hay una sesión válida (getUser consulta a Supabase Auth, no se fía solo de la cookie), y
 *   2. ese usuario figura en `admin_users` (tabla que solo se edita a mano).
 * Cualquier otra persona, aunque tenga una cuenta, no pasa.
 */
export const getAdmin = cache(async () => {
  const db = await createSessionClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return null;

  const { data: row } = await db.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!row) return null;

  return { user: data.user, db };
});

/** Para páginas: sin permiso, al login. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Para acciones del servidor: sin permiso, error (no una redirección). */
export async function requireAdminAction() {
  const admin = await getAdmin();
  if (!admin) throw new Error("No autorizado");
  return admin;
}

export type Admin = NonNullable<Awaited<ReturnType<typeof getAdmin>>>;
