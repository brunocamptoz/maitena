import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { z } from "zod";
import { NotesForm, OrderActions, ResolveAttentionButton } from "@/components/admin/order-actions";
import { Badge, Card, Notice, PageHeader, SectionTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import {
  ATTENTION_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  formatDateLong,
  formatDateTime,
} from "@/lib/admin/labels";
import { eventLabel, whatsappLink } from "@/lib/admin/order-rules";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Pedido" };
export const dynamic = "force-dynamic";

export default async function OrderDetailPage(props: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await props.params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { db } = await requireAdmin();

  const [orderRes, itemsRes, paymentsRes, eventsRes] = await Promise.all([
    db.from("orders").select("*").eq("id", id).maybeSingle(),
    db.from("order_items").select("id, product_id, product_name, quantity, unit_price, subtotal").eq("order_id", id).order("created_at"),
    db.from("payments").select("id, provider_payment_id, status, provider_status, payment_method, amount, created_at").eq("order_id", id).order("created_at", { ascending: false }),
    db.from("order_events").select("id, type, detail, created_at").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  const order = orderRes.data;
  if (!order) notFound();

  const wa = whatsappLink(order.customer_phone);
  const paid = order.payment_status === "approved";
  const address = [
    `${order.shipping_address} ${order.shipping_door_number}${order.shipping_apartment ? `, apto. ${order.shipping_apartment}` : ""}`,
    `${order.shipping_city}, ${order.shipping_department}`,
    order.shipping_postal_code ? `CP ${order.shipping_postal_code}` : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <PageHeader
        title={`Pedido #${order.order_number}`}
        description={`Creado el ${formatDateLong(order.created_at)}`}
        actions={
          <>
            <Badge tone={order.order_status === "paid" ? "solid" : order.order_status === "cancelled" ? "muted" : "neutral"}>
              {ORDER_STATUS_LABEL[order.order_status] ?? order.order_status}
            </Badge>
            <Link href="/admin/pedidos" className="text-[11px] uppercase tracking-[0.2em] text-stone underline underline-offset-4">
              Volver
            </Link>
          </>
        }
      />

      {order.needs_attention && (
        <Card className="mb-8 space-y-4 border-error/50 bg-error/5">
          <SectionTitle>Requiere tu atención</SectionTitle>
          <p className="text-sm text-error">
            {(order.attention_reason && ATTENTION_LABEL[order.attention_reason]) ?? order.attention_reason ?? "Revisá este pedido."}
          </p>
          <ResolveAttentionButton orderId={order.id} />
        </Card>
      )}

      {order.order_status === "awaiting_payment" && (
        <div className="mb-8">
          <Notice>
            El cliente todavía no pagó. Los productos están reservados hasta {formatDateTime(order.reserved_until)}; si no paga, el pedido se cancela solo y el stock vuelve.
          </Notice>
        </div>
      )}

      <Card className="mb-8">
        <SectionTitle>Acciones</SectionTitle>
        {order.order_status === "cancelled" || order.order_status === "delivered" ? (
          <p className="text-sm text-stone">
            {order.order_status === "cancelled"
              ? `Pedido cancelado${order.cancelled_at ? ` el ${formatDateLong(order.cancelled_at)}` : ""}.`
              : `Pedido entregado${order.delivered_at ? ` el ${formatDateLong(order.delivered_at)}` : ""}.`}
          </p>
        ) : (
          <OrderActions
            orderId={order.id}
            status={order.order_status}
            paymentApproved={paid}
            tracking={{ company: order.tracking_company, number: order.tracking_number, url: order.tracking_url }}
            shippingEmailSent={!!order.shipping_email_sent_at}
          />
        )}
      </Card>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <Card>
            <SectionTitle>Productos</SectionTitle>
            <table className="w-full text-sm">
              <caption className="sr-only">Productos del pedido</caption>
              <thead className="text-left text-[10px] uppercase tracking-[0.2em] text-stone">
                <tr>
                  <th scope="col" className="pb-3 font-normal">Producto</th>
                  <th scope="col" className="pb-3 text-right font-normal">Cant.</th>
                  <th scope="col" className="pb-3 text-right font-normal">Precio</th>
                  <th scope="col" className="pb-3 text-right font-normal">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(itemsRes.data ?? []).map((i) => (
                  <tr key={i.id}>
                    <td className="py-3 pr-3">
                      <Link href={`/admin/productos/${i.product_id}`} className="underline-offset-4 hover:underline">
                        {i.product_name}
                      </Link>
                    </td>
                    <td className="py-3 text-right tabular-nums">{i.quantity}</td>
                    <td className="py-3 text-right tabular-nums">{formatPrice(i.unit_price)}</td>
                    <td className="py-3 text-right tabular-nums">{formatPrice(i.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-sm">
                <tr className="border-t border-line">
                  <td colSpan={3} className="pt-3 text-right text-stone">Subtotal</td>
                  <td className="pt-3 text-right tabular-nums">{formatPrice(order.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="pt-1 text-right text-stone">Envío</td>
                  <td className="pt-1 text-right tabular-nums">{order.shipping_cost === 0 ? "Sin costo" : formatPrice(order.shipping_cost)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="pt-2 text-right font-medium">Total</td>
                  <td className="pt-2 text-right font-medium tabular-nums">{formatPrice(order.total)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>

          <Card>
            <SectionTitle>Historial</SectionTitle>
            {(eventsRes.data ?? []).length === 0 ? (
              <p className="text-sm text-stone">Sin movimientos todavía.</p>
            ) : (
              <ol className="space-y-3 border-l border-line pl-5">
                {(eventsRes.data ?? []).map((e) => (
                  <li key={e.id} className="relative text-sm">
                    <span aria-hidden="true" className="absolute -left-[1.45rem] top-1.5 size-2 rounded-full bg-ink" />
                    <span className="block">{eventLabel(e.type)}</span>
                    <span className="text-xs text-stone">{formatDateTime(e.created_at)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <SectionTitle>Cliente</SectionTitle>
            <p className="font-medium">
              {order.customer_name} {order.customer_last_name}
            </p>
            <p className="mt-2 text-sm">
              <a href={`mailto:${order.customer_email}`} className="underline underline-offset-4">
                {order.customer_email}
              </a>
            </p>
            <p className="mt-1 text-sm">
              <a href={`tel:${order.customer_phone}`} className="underline underline-offset-4">
                {order.customer_phone}
              </a>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="ml-3 inline-flex items-center gap-1 text-xs text-stone underline underline-offset-4">
                  WhatsApp <ExternalLink size={11} strokeWidth={1.5} aria-hidden="true" />
                </a>
              )}
            </p>
          </Card>

          <Card>
            <SectionTitle>Dirección de envío</SectionTitle>
            <address className="space-y-0.5 text-sm not-italic">
              {address.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </address>
            {order.shipping_notes && (
              <p className="mt-3 border-t border-line pt-3 text-sm text-stone">
                <span className="text-[10px] uppercase tracking-[0.2em]">Indicaciones del cliente</span>
                <br />
                {order.shipping_notes}
              </p>
            )}
            {(order.tracking_company || order.tracking_number || order.tracking_url) && (
              <div className="mt-3 border-t border-line pt-3 text-sm">
                <p className="text-[10px] uppercase tracking-[0.2em] text-stone">Seguimiento</p>
                {order.tracking_company && <p className="mt-1">{order.tracking_company}</p>}
                {order.tracking_number && <p className="tabular-nums">{order.tracking_number}</p>}
                {order.tracking_url && /^https?:\/\//i.test(order.tracking_url) && (
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-4">
                    Abrir seguimiento
                  </a>
                )}
                <p className="mt-1 text-xs text-stone">
                  {order.shipped_at && `Enviado el ${formatDateLong(order.shipped_at)}. `}
                  {order.shipping_email_sent_at ? "Email de envío enviado al cliente." : "Email de envío pendiente."}
                </p>
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle>Pago</SectionTitle>
            <p className="text-sm">
              Estado: <strong className="font-medium">{PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status}</strong>
              {order.paid_at && <span className="text-stone"> · {formatDateLong(order.paid_at)}</span>}
            </p>
            {(paymentsRes.data ?? []).length > 0 && (
              <ul className="mt-3 divide-y divide-line border-t border-line text-sm">
                {(paymentsRes.data ?? []).map((p) => (
                  <li key={p.id} className="py-2.5">
                    <span className="block tabular-nums">
                      {formatPrice(Number(p.amount))} · {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                    </span>
                    <span className="block text-xs text-stone">
                      Mercado Pago {p.provider_payment_id ? `#${p.provider_payment_id}` : ""}
                      {p.payment_method ? ` · ${p.payment_method}` : ""} · {formatDateTime(p.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-stone">
              Confirmación al cliente: {order.confirmation_email_sent_at ? `enviada el ${formatDateTime(order.confirmation_email_sent_at)}` : "no enviada"}.
            </p>
          </Card>

          <Card>
            <SectionTitle>Notas internas</SectionTitle>
            <NotesForm orderId={order.id} initial={order.admin_notes ?? ""} />
          </Card>
        </div>
      </div>
    </>
  );
}
