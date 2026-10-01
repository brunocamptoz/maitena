import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { z } from "zod";
import { Badge, Card, Notice, PageHeader, SectionTitle } from "@/components/admin/ui";
import { ProductDanger } from "@/components/admin/product-danger";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImages } from "@/components/admin/product-images";
import { site } from "@/config/site";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Editar producto" };
export const dynamic = "force-dynamic";

export default async function EditProductPage(props: PageProps<"/admin/productos/[id]">) {
  const { id } = await props.params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const { db } = await requireAdmin();
  const sp = await props.searchParams;

  const { data: product } = await db
    .from("products")
    .select("id, name, slug, description, category, price, stock, stock_reserved, active, is_demo, archived_at, product_images ( id, image_url, position )")
    .eq("id", id)
    .maybeSingle();
  if (!product) notFound();

  const images = [...product.product_images].sort((a, b) => a.position - b.position).map((i) => ({ id: i.id, url: i.image_url }));
  const live = product.active && !product.archived_at;

  return (
    <>
      <PageHeader
        title={product.name}
        description={product.is_demo ? "Producto de demostración." : undefined}
        actions={
          <>
            {product.archived_at ? <Badge tone="muted">Archivado</Badge> : live ? <Badge tone="solid">Publicado</Badge> : <Badge tone="muted">Oculto</Badge>}
            {live && (
              <Link
                href={`/productos/${product.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-stone underline underline-offset-4"
              >
                Ver en la tienda <ExternalLink size={12} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            )}
            <Link href="/admin/productos" className="text-[11px] uppercase tracking-[0.2em] text-stone underline underline-offset-4">
              Volver
            </Link>
          </>
        }
      />

      {sp.creado === "1" && (
        <div className="mb-8">
          <Notice tone="ok">
            Producto creado. {images.length === 0 && "Ahora subí las fotos y, cuando esté listo, marcalo como publicado."}
          </Notice>
        </div>
      )}
      {product.archived_at && (
        <div className="mb-8">
          <Notice>Este producto está archivado: no se ve en la tienda. Restauralo abajo para volver a editarlo y publicarlo.</Notice>
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <Card>
          <SectionTitle>Datos</SectionTitle>
          <ProductForm
            siteUrl={site.url}
            initial={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              description: product.description,
              category: product.category,
              price: product.price,
              stock: product.stock,
              stockReserved: product.stock_reserved,
              active: product.active,
            }}
          />
        </Card>

        <div className="space-y-8">
          <Card>
            <SectionTitle>Fotos</SectionTitle>
            <ProductImages productId={product.id} images={images} />
          </Card>
          <Card>
            <SectionTitle>Archivar o borrar</SectionTitle>
            <ProductDanger productId={product.id} archived={!!product.archived_at} name={product.name} />
          </Card>
        </div>
      </div>
    </>
  );
}
