"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";

export type LoginState = { error?: string };

const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
});

/** Solo se vuelve a una dirección interna del panel (evita redirecciones a sitios externos). */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/admin") && !next.startsWith("//") && !next.includes("\\") ? next : "/admin/pedidos";
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Ingresá tu email y tu contraseña." };

  const db = await createSessionClient();
  const { data, error } = await db.auth.signInWithPassword(parsed.data);
  // Mismo mensaje para "no existe" y "contraseña incorrecta": no se revela qué cuentas existen.
  if (error || !data.user) return { error: "Email o contraseña incorrectos." };

  const { data: row } = await db.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!row) {
    await db.auth.signOut();
    return { error: "Esta cuenta no tiene acceso al panel." };
  }

  redirect(safeNext(formData.get("next")));
}
