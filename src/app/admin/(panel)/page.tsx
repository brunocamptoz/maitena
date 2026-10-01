import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState, Notice, PageHeader, SectionTitle, StatCard } from "@/components/admin/ui";
import { LOW_STOCK_THRESHOLD } from "@/config/shop";
import { requireAdmin } from "@/lib/admin/auth";
import { ORDER_STATUS_LABEL, formatDateTime } from "@/lib/admin/labels";
import { daysAgoIso, salesSummary, stockAlerts, type SaleRow, type StockRow } from "@/lib/admin/stats";
import { serverEnv } from "@/lib/env";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Resumen" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { db } = await requireAdmin();

  const count = (status: string) =>
    db.from("orders").select("id", { count: "exact", head: true }).eq("order_status", status);
  const since30 = daysAgoIso(30);

  const [awaiting, paid, shipped, products, sales, recent, attention, settings, rates] = await Promise.all([
    count("awaiting_payment"),
    count("paid"),
    count("shipped"),
    db.from("products").select("id, name, stock, stock_reserved, active, archived_at, is_demo"),
    db
      .from("orders")
      .select("total, paid_at")
      .eq("payment_status", "approved")
      .neq("order_status", "cancelled")
      .gte("paid_at", since30),
    db
      .from("orders")
      .select("id, order_number, customer_name, customer_last_name, total, order_status, paid_at, created_at")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(8),
    db
      .from("orders")
      .select("id, order_number, attention_reason")
      .eq("needs_attention", true)
      .order("created_at", { ascending: false })
      .limit(5),
    db.from("store_settings").select("shipping_configured, shipping_default_cost").single(),
    db.from("shipping_rates").select("department", { count: "exact", head: true }),
  ]);

  const stock = stockAlerts((products.data ?? []) as StockRow[], LOW_STOCK_THRESHOLD);
  const money = salesSummary((sales.data ?? []) as SaleRow[]);
  const demos = (products.data ?? []).filter((p) => p.is_demo && p.active && !p.archived_at).length;
  const emailReady = !!serverEnv("RESEND_API_KEY") && !!serverEnv("EMAIL_FROM");
  const emailTestMode = !!serverEnv("EMAIL_REDIRECT_TO");

  const notices: { tone: "alert" | "info"; text: string; href?: string; cta?: string }[] = [];
  if (settings.data && !settings.data.shipping_configured) {
    notices.push({ tone: "alert", text: "Los costos de envío no están configurados: la tienda no puede cobrar.", href: "/admin/configuracion", cta: "Configurar envíos" });
  }
  if (settings.data?.shipping_configured && settings.data.shipping_default_cost === 0 && (rates.count ?? 0) === 0) {
    notices.push({ tone: "info", text: "El envío está en $0 para todo el país. Si no es intencional, cargá los costos reales.", href: "/admin/configuracion", cta: "Revisar envíos" });
  }
  if (!emailReady) {
    notices.push({ tone: "alert", text: "El servicio de emails no está configurado: no se envían correos a clientes ni avisos de venta." });
  } else if (emailTestMode) {
    notices.push({ tone: "info", text: "Emails en modo prueba: los correos de los clientes llegan a tu casilla (EMAIL_REDIRECT_TO). Desactivalo antes de vender." });
  }
  if (!serverEnv("MERCADOPAGO_WEBHOOK_SECRET")) {
    notices.push({ tone: "alert", text: "Falta la clave secreta del webhook de Mercado Pago: los pagos no se confirman solos." });
  }
  if (demos > 0) {
    notices.push({ tone: "info", text: `Hay ${demos} producto${demos === 1 ? "" : "s"} de demostración publicado${demos === 1 ? "" : "s"}. Eliminalos cuando cargues los reales.`, href: "/admin/productos", cta: "Ver productos" });
  }

  return (
    <>
      <PageHeader title="Resumen" description="Lo que necesita tu atención hoy." />

      {notices.length > 0 && (
        <div className="mb-8 space-y-3">
          {notices.map((n) => (
            <Notice key={n.text} tone={n.tone}>
              {n.text}{" "}
              {n.href && (
                <Link href={n.href} className="font-medium underline underline-offset-4">
                  {n.cta}
                </Link>
              )}
            </Notice>
          ))}
        </div>
      )}

      {(attention.data?.length ?? 0) > 0 && (
        <Card className="mb-8 border-error/50 bg-error/5">
          <SectionTitle>Pedidos que requieren tu atención</SectionTitle>
          <ul className="divide-y divide-error/15 text-sm">
            {attention.data!.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <Link href={`/admin/pedidos/${o.id}`} className="font-medium underline underline-offset-4">
                  Pedido #{o.order_number}
                </Link>
                <span className="text-xs text-error">{o.attention_reason}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <StatCard label="Nuevos (para enviar)" value={paid.count ?? 0} tone={(paid.count ?? 0) > 0 ? "alert" : undefined} />
        <StatCard label="Enviados" value={shipped.count ?? 0} />
        <StatCard label="Pago pendiente" value={awaiting.count ?? 0} hint="Carritos sin pagar todavía" />
      </div>

      <div className="mt-3 grid gap-3 md:mt-4 md:grid-cols-2 md:gap-4">
        <StatCard
          label="Ventas · últimos 7 días"
          value={formatPrice(money.last7.total)}
          hint={`${money.last7.count} pedido${money.last7.count === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Ventas · últimos 30 días"
          value={formatPrice(money.last30.total)}
          hint={`${money.last30.count} pedido${money.last30.count === 1 ? "" : "s"}`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <SectionTitle aside={<Link href="/admin/pedidos" className="text-[10px] uppercase tracking-[0.2em] text-stone underline underline-offset-4">Ver todos</Link>}>
            Ventas recientes
          </SectionTitle>
          {recent.data && recent.data.length > 0 ? (
            <ul className="divide-y divide-line">
              {recent.data.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 transition-colors hover:bg-paper">
                    <span>
                      <span className="font-medium">#{o.order_number}</span>{" "}
                      <span className="text-stone">
                        {o.customer_name} {o.customer_last_name}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 text-sm">
                      <span className="text-xs text-stone">{formatDateTime(o.paid_at)}</span>
                      <Badge tone={o.order_status === "paid" ? "solid" : "muted"}>{ORDER_STATUS_LABEL[o.order_status] ?? o.order_status}</Badge>
                      <span className="tabular-nums">{formatPrice(o.total)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Todavía no hay ventas">Cuando alguien pague, aparece acá.</EmptyState>
          )}
        </Card>

        <Card>
          <SectionTitle aside={<Link href="/admin/productos" className="text-[10px] uppercase tracking-[0.2em] text-stone underline underline-offset-4">Productos</Link>}>
            Stock
          </SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Poco stock" value={stock.low.length} hint={`${LOW_STOCK_THRESHOLD} o menos`} tone={stock.low.length > 0 ? "alert" : undefined} />
            <StatCard label="Agotados" value={stock.out.length} tone={stock.out.length > 0 ? "alert" : undefined} />
          </div>
          {stock.low.length + stock.out.length > 0 ? (
            <ul className="mt-4 divide-y divide-line text-sm">
              {[...stock.out, ...stock.low].slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/admin/productos/${p.id}`} className="underline-offset-4 hover:underline">
                    {p.name}
                  </Link>
                  {p.stock <= 0 ? <Badge tone="alert">Agotado</Badge> : <Badge tone="neutral">Quedan {p.stock}</Badge>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-stone">Todo el catálogo tiene stock suficiente.</p>
          )}
        </Card>
      </div>
    </>
  );
}
