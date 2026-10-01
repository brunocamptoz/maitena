import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/admin/login/login-form";
import { getAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage(props: PageProps<"/admin/login">) {
  if (await getAdmin()) redirect("/admin");

  const { next } = await props.searchParams;
  const nextPath = typeof next === "string" ? next : "";

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-12 text-center">
          <p className="font-serif text-3xl font-light uppercase tracking-[0.32em]">Maitena</p>
          <p className="mt-2 text-[9px] uppercase tracking-[0.5em] text-stone">Panel de administración</p>
        </div>
        <LoginForm next={nextPath} />
        <p className="mt-10 text-center text-xs text-stone">Acceso solo para administradores de la tienda.</p>
      </div>
    </div>
  );
}
