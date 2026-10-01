import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { buttonStyles } from "@/components/ui/button";
import { LOW_STOCK_THRESHOLD } from "@/config/shop";
import { requireAdmin } from "@/lib/admin/auth";
import { CATEGORY_LABEL } from "@/lib/admin/labels";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Productos" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "publicados", label: "Publicados" },
  { key: "ocultos", label: "Ocultos" },
  { key: "archivados", label: "Archivados" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

export default async function ProductsPage(props: PageProps<"/admin/productos">) {
  const { db } = await requireAdmin();
  const sp = await props.searchParams;
  const rawFilter = typeof sp.estado === "string" ? sp.estado : "todos";
  const filter: FilterKey = FILTERS.some((f) => f.key === rawFilter) ? (rawFilter as FilterKey) : "todos";
  // Se quitan los caracteres que tienen significado en el filtro de PostgREST (coma, paréntesis, comodines).
  const q = (typeof sp.q === "string" ? sp.q : "").replace(/[,()%*\\]/g, " ").trim().slice(0, 60);

  let query = db
    .from("products")
    .select("id, name, slug, category, price, stock, stock_reserved, active, is_demo, archived_at, created_at, product_images ( image_url, position )")
    .order("created_at", { ascending: false });
  if (filter === "archivados") query = query.not("archived_at", "is", null);
  else query = query.is("archived_at", null);
  if (filter === "publicados") query = query.eq("active", true);
  if (filter === "ocultos") query = query.eq("active", false);
  if (q) query = query.ilike("name", `%${q}%`);

  const { data: products, error } = await query;

  return (
    <>
      <PageHeader
        title="Productos"
        description="Cargá, editá y ocultá lo que se ve en la tienda."
        actions={
          <Link href="/admin/productos/nuevo" className={buttonStyles({ size: "md" })}>
            <Plus size={14} strokeWidth={1.5} aria-hidden="true" /> Nuevo producto
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Filtrar productos" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={{ pathname: "/admin/productos", query: { ...(f.key !== "todos" && { estado: f.key }), ...(q && { q }) } }}
              aria-current={filter === f.key ? "page" : undefined}
              className={cn(
                "border px-4 py-2 text-[10px] uppercase tracking-[0.2em] transition-colors",
                filter === f.key ? "border-ink bg-ink text-paper" : "border-line text-stone hover:border-ink hover:text-ink",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <form role="search" className="flex gap-2">
          {filter !== "todos" && <input type="hidden" name="estado" value={filter} />}
          <input
            name="q"
            defaultValue={q}
            type="search"
            placeholder="Buscar por nombre"
            aria-label="Buscar por nombre"
            className="h-10 w-52 border border-ink/25 bg-transparent px-3 text-sm focus:border-ink focus:outline-none"
          />
          <button type="submit" className={buttonStyles({ variant: "outline", size: "md", className: "h-10 px-4" })}>
            Buscar
          </button>
        </form>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-error">
          No se pudieron cargar los productos. Recargá la página.
        </p>
      ) : !products || products.length === 0 ? (
        <EmptyState title={q || filter !== "todos" ? "Sin resultados" : "Todavía no hay productos"}>
          {q || filter !== "todos" ? "Probá con otro filtro o búsqueda." : "Creá el primero con “Nuevo producto”."}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {products.map((p) => {
            const photo = [...p.product_images].sort((a, b) => a.position - b.position)[0];
            const available = Math.max(p.stock - p.stock_reserved, 0);
            return (
              <li key={p.id}>
                <Link
                  href={`/admin/productos/${p.id}`}
                  className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-4 py-4 transition-colors hover:bg-white/50 md:grid-cols-[4rem_minmax(0,1fr)_7rem_9rem_auto] md:px-2"
                >
                  <span className="relative block aspect-square w-16 overflow-hidden border border-line bg-silver/40">
                    {photo && (
                      <Image src={photo.image_url} alt="" fill sizes="64px" className="object-cover" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="block text-xs text-stone">{CATEGORY_LABEL[p.category] ?? p.category}</span>
                    <span className="mt-2 flex flex-wrap gap-1.5 md:hidden">
                      <span className="text-sm tabular-nums">{formatPrice(p.price)}</span>
                      <Status p={p} available={available} />
                    </span>
                  </span>
                  <span className="hidden text-sm tabular-nums md:block">{formatPrice(p.price)}</span>
                  <span className="hidden text-sm md:block">
                    <span className="tabular-nums">{available}</span> disponible{available === 1 ? "" : "s"}
                    {p.stock_reserved > 0 && <span className="block text-xs text-stone">{p.stock_reserved} reservado{p.stock_reserved === 1 ? "" : "s"}</span>}
                  </span>
                  <span className="hidden justify-self-end md:flex md:gap-1.5">
                    <Status p={p} available={available} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Status({
  p,
  available,
}: {
  p: { active: boolean; archived_at: string | null; is_demo: boolean };
  available: number;
}) {
  return (
    <>
      {p.archived_at ? (
        <Badge tone="muted">Archivado</Badge>
      ) : !p.active ? (
        <Badge tone="muted">Oculto</Badge>
      ) : available <= 0 ? (
        <Badge tone="alert">Agotado</Badge>
      ) : available <= LOW_STOCK_THRESHOLD ? (
        <Badge>Poco stock</Badge>
      ) : (
        <Badge tone="solid">Publicado</Badge>
      )}
      {p.is_demo && <Badge tone="muted">Demo</Badge>}
    </>
  );
}
