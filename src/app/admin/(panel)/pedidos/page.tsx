import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { ORDER_STATUS_LABEL, formatDateTime } from "@/lib/admin/labels";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const TABS = [
  { key: "todos", label: "Todos", status: null },
  { key: "nuevos", label: "Nuevos", status: "paid" },
  { key: "enviados", label: "Enviados", status: "shipped" },
  { key: "entregados", label: "Entregados", status: "delivered" },
  { key: "pendientes", label: "Pago pendiente", status: "awaiting_payment" },
  { key: "cancelados", label: "Cancelados", status: "cancelled" },
] as const;

const statusTone = (s: string) =>
  s === "paid" ? "solid" : s === "cancelled" || s === "awaiting_payment" ? "muted" : "neutral";

export default async function OrdersPage(props: PageProps<"/admin/pedidos">) {
  const { db } = await requireAdmin();
  const sp = await props.searchParams;

  const rawTab = typeof sp.estado === "string" ? sp.estado : "todos";
  const tab = TABS.find((t) => t.key === rawTab) ?? TABS[0];
  const page = Math.max(1, Number.parseInt(typeof sp.pagina === "string" ? sp.pagina : "1", 10) || 1);
  // Sin coma, paréntesis ni comodines: tienen significado dentro del filtro `or(...)` de PostgREST.
  const q = (typeof sp.q === "string" ? sp.q : "").replace(/[,()%*\\]/g, " ").trim().slice(0, 80);

  let query = db
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_last_name, customer_email, total, order_status, payment_status, needs_attention, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (tab.status) query = query.eq("order_status", tab.status);
  if (q) {
    const digits = q.replace(/^#/, "");
    query = /^\d+$/.test(digits)
      ? query.eq("order_number", Number(digits))
      : query.or(`customer_email.ilike.%${q}%,customer_name.ilike.%${q}%,customer_last_name.ilike.%${q}%`);
  }

  const { data: orders, count, error } = await query;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const href = (over: { estado?: string; pagina?: number }) => ({
    pathname: "/admin/pedidos",
    query: {
      ...((over.estado ?? tab.key) !== "todos" && { estado: over.estado ?? tab.key }),
      ...(q && { q }),
      ...((over.pagina ?? 1) > 1 && { pagina: over.pagina }),
    },
  });

  return (
    <>
      <PageHeader title="Pedidos" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Filtrar pedidos" className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={href({ estado: t.key })}
              aria-current={tab.key === t.key ? "page" : undefined}
              className={cn(
                "border px-4 py-2 text-[10px] uppercase tracking-[0.2em] transition-colors",
                tab.key === t.key ? "border-ink bg-ink text-paper" : "border-line text-stone hover:border-ink hover:text-ink",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <form role="search" className="flex gap-2">
          {tab.key !== "todos" && <input type="hidden" name="estado" value={tab.key} />}
          <input
            name="q"
            defaultValue={q}
            type="search"
            placeholder="N.º, nombre o email"
            aria-label="Buscar pedido por número, nombre o email"
            className="h-10 w-56 border border-ink/25 bg-transparent px-3 text-sm focus:border-ink focus:outline-none"
          />
          <button
            type="submit"
            className="h-10 border border-ink px-4 text-[11px] uppercase tracking-[0.28em] transition-colors hover:bg-ink hover:text-paper"
          >
            Buscar
          </button>
        </form>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-error">
          No se pudieron cargar los pedidos. Recargá la página.
        </p>
      ) : !orders || orders.length === 0 ? (
        <EmptyState title={q || tab.key !== "todos" ? "Sin resultados" : "Todavía no hay pedidos"}>
          {q || tab.key !== "todos" ? "Probá con otro filtro o búsqueda." : "Cuando alguien compre, aparece acá."}
        </EmptyState>
      ) : (
        <>
          <ul className="divide-y divide-line border-y border-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/pedidos/${o.id}`}
                  className="grid items-center gap-x-4 gap-y-1 py-4 transition-colors hover:bg-white/50 md:grid-cols-[5rem_minmax(0,1fr)_9rem_8rem_9rem] md:px-2"
                >
                  <span className="font-medium">#{o.order_number}</span>
                  <span className="min-w-0">
                    <span className="block truncate">
                      {o.customer_name} {o.customer_last_name}
                    </span>
                    <span className="block truncate text-xs text-stone">{o.customer_email}</span>
                  </span>
                  <span className="text-xs text-stone">{formatDateTime(o.created_at)}</span>
                  <span className="text-sm tabular-nums md:text-right">{formatPrice(o.total)}</span>
                  <span className="flex flex-wrap gap-1.5 md:justify-end">
                    <Badge tone={statusTone(o.order_status)}>{ORDER_STATUS_LABEL[o.order_status] ?? o.order_status}</Badge>
                    {o.needs_attention && <Badge tone="alert">Revisar</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <nav aria-label="Páginas" className="mt-6 flex items-center justify-between text-xs uppercase tracking-[0.2em]">
              {page > 1 ? (
                <Link href={href({ pagina: page - 1 })} className="underline underline-offset-4">
                  ← Anterior
                </Link>
              ) : (
                <span />
              )}
              <span className="text-stone">
                Página {page} de {pages} · {count} pedidos
              </span>
              {page < pages ? (
                <Link href={href({ pagina: page + 1 })} className="underline underline-offset-4">
                  Siguiente →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
