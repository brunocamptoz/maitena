"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session";

export async function signOutAction() {
  const db = await createSessionClient();
  await db.auth.signOut();
  redirect("/admin/login");
}
