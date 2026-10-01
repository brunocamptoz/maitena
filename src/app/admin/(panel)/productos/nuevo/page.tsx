import type { Metadata } from "next";
import Link from "next/link";
import { Notice, PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { site } from "@/config/site";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Nuevo producto"
        actions={
          <Link href="/admin/productos" className="text-[11px] uppercase tracking-[0.2em] text-stone underline underline-offset-4">
            Volver
          </Link>
        }
      />
      <Notice>Al crearlo te llevamos a su página para que subas las fotos.</Notice>
      <div className="mt-8">
        <ProductForm
          siteUrl={site.url}
          initial={{ name: "", slug: "", description: "", category: "", price: null, stock: null, stockReserved: 0, active: false }}
        />
      </div>
    </>
  );
}
