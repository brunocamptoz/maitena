import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ClearCartOnPaid, OrderPoller, RetryPaymentButton } from "@/components/order/order-helpers";
import { buttonStyles } from "@/components/ui/button";
import { notifyOrderPaid } from "@/lib/email/service";
import { formatPrice } from "@/lib/format";
import { getMercadoPago, reconcileOrder } from "@/lib/mercadopago/client";
import { getOrderByToken, type OrderPhase, type OrderView } from "@/lib/orders";
import { createServiceClient } from "@/lib/supabase/service";

// El estado de un pedido cambia solo: nunca se cachea.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu pedido",
  robots: { index: false, follow: false },
};

const copy: Record<OrderPhase, { eyebrow: string; title: string; text: string }> = {
  pending: {
    eyebrow: "Pago en proceso",
    title: "Estamos confirmando tu pago",
    text: "Apenas Mercado Pago lo acredite, tu pedido queda confirmado y te avisamos por email. Esta página se actualiza sola.",
  },
  rejected: {
    eyebrow: "Pago no completado",
    title: "No pudimos procesar el pago",
    text: "No se realizó ningún cobro. Podés intentarlo de nuevo, con otro medio de pago si querés, mientras reservamos tus productos.",
  },
  expired: {
    eyebrow: "Pedido vencido",
    title: "Venció el tiempo para pagar",
    text: "Liberamos tus productos para que otras personas puedan comprarlos. Si todavía los querés, podés hacer una nueva compra.",
  },
  cancelled: {
    eyebrow: "Pedido cancelado",
    title: "Este pedido fue cancelado",
    text: "Si tenés dudas o ya realizaste un pago, escribinos y lo resolvemos.",
  },
  paid: {
    eyebrow: "Compra confirmada",
    title: "¡Gracias por tu compra!",
    text: "Recibimos tu pago. Estamos preparando tu pedido y en breve recibirás otro correo con los datos de seguimiento una vez que sea despachado.",
  },
  shipped: {
    eyebrow: "En camino",
    title: "Tu pedido fue enviado",
    text: "Ya despachamos tu pedido. Acá abajo tenés los datos de seguimiento.",
  },
  delivered: {
    eyebrow: "Entregado",
    title: "Tu pedido fue entregado",
    text: "Esperamos que lo disfrutes. ¡Gracias por elegirnos!",
  },
};

const time = new Intl.DateTimeFormat("es-UY", { hour: "2-digit", minute: "2-digit", timeZone: "America/Montevideo" });
const day = new Intl.DateTimeFormat("es-UY", { dateStyle: "long", timeZone: "America/Montevideo" });

/**
 * Red de seguridad: si el aviso (webhook) de Mercado Pago se demora o se pierde, consulta el pago real a
 * su API. Nunca confía en los datos de la URL: `payment_id` solo se usa para CONSULTAR el pago.
 */
async function reconcileIfNeeded(order: OrderView, paymentIdHint: string | null) {
  const mp = getMercadoPago();
  const open = order.orderStatus === "awaiting_payment" || order.phase === "expired";
  const recent = Date.now() - Date.parse(order.createdAt) < 3 * 86_400_000;
  if (!mp || !open || !recent) return false;
  try {
    await reconcileOrder(createServiceClient(), mp, order.id, paymentIdHint);
    return true;
  } catch (error) {
    console.error("[pedido] No se pudo consultar a Mercado Pago:", error);
    return false;
  }
}

export default async function OrderPage(props: PageProps<"/pedido/[token]">) {
  const { token } = await props.params;
  const search = await props.searchParams;

  let order = await getOrderByToken(token);
  if (!order) notFound();

  const hint = [search.payment_id, search.collection_id].find((v): v is string => typeof v === "string") ?? null;
  if (await reconcileIfNeeded(order, hint)) {
    order = (await getOrderByToken(token)) ?? order;
  }

  const { eyebrow, title, text } = copy[order.phase];
  const holdsStock = order.phase === "pending" || order.phase === "rejected";
  const until = holdsStock && order.reservedUntil ? time.format(new Date(order.reservedUntil)) : null;
  const done = order.phase === "paid" || order.phase === "shipped" || order.phase === "delivered";

  // Respaldo: si el pedido está pagado y todavía falta algún email, se envía ahora (sin demorar la página).
  if (done && order.emailsPending) {
    const orderId = order.id;
    after(() => notifyOrderPaid(orderId));
  }

  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-12 md:px-10 md:pb-36 md:pt-20">
      <OrderPoller active={order.phase === "pending"} />
      {done && <ClearCartOnPaid />}

      <p className="text-[11px] uppercase tracking-[0.4em] text-stone">
        {eyebrow} · Pedido #{order.orderNumber}
      </p>
      <h1 className="mt-5 font-serif text-5xl font-light leading-[1.05] md:text-7xl">{title}</h1>
      <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-stone">{text}</p>
      {until && (
        <p className="mt-3 text-sm text-stone">
          Tus productos están reservados hasta las <strong className="font-medium text-ink">{until}</strong>.
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
        {order.phase === "rejected" && order.hasPreference && <RetryPaymentButton token={order.token} />}
        <Link
          href="/catalogo"
          className={buttonStyles({ variant: order.phase === "rejected" ? "text" : "outline" })}
        >
          {done ? "Seguir explorando" : "Volver a la tienda"}
        </Link>
      </div>

      {order.tracking && (order.phase === "shipped" || order.phase === "delivered") && (
        <section aria-labelledby="tracking-title" className="mt-16 border border-line p-6 md:p-8">
          <h2 id="tracking-title" className="font-serif text-2xl font-light">
            Seguimiento
          </h2>
          <dl className="mt-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
            {order.tracking.company && (
              <>
                <dt className="text-stone">Empresa de transporte</dt>
                <dd>{order.tracking.company}</dd>
              </>
            )}
            {order.tracking.number && (
              <>
                <dt className="text-stone">Código de seguimiento</dt>
                <dd className="font-medium tabular-nums">{order.tracking.number}</dd>
              </>
            )}
          </dl>
          {order.tracking.url && (
            <a
              href={order.tracking.url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({ variant: "outline", className: "mt-6" })}
            >
              Seguir mi envío
            </a>
          )}
        </section>
      )}

      <div className="mt-16 grid gap-12 md:grid-cols-[1.4fr_1fr] md:gap-16">
        <section aria-labelledby="items-title">
          <h2 id="items-title" className="font-serif text-2xl font-light">
            Tu pedido
          </h2>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {order.items.map((item) => (
              <li key={item.name} className="flex items-baseline justify-between gap-4 py-4">
                <span>
                  <span className="font-serif text-lg">{item.name}</span>
                  <span className="ml-2 text-sm text-stone tabular-nums">
                    × {item.quantity}
                  </span>
                </span>
                <span className="text-sm tabular-nums">{formatPrice(item.subtotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Envío</dt>
              <dd className="tabular-nums">{order.shippingCost === 0 ? "Gratis" : formatPrice(order.shippingCost)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-4">
              <dt className="text-[11px] uppercase tracking-[0.24em]">Total</dt>
              <dd className="font-serif text-3xl tabular-nums">{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="delivery-title">
          <h2 id="delivery-title" className="font-serif text-2xl font-light">
            Entrega
          </h2>
          <address className="mt-6 space-y-1 text-[15px] not-italic leading-relaxed text-stone">
            <p className="text-ink">{order.customerName}</p>
            <p>
              {order.address} {order.doorNumber}
              {order.apartment ? `, apto. ${order.apartment}` : ""}
            </p>
            <p>
              {order.city}, {order.department}
            </p>
            <p className="pt-3 text-sm">Confirmación a {order.emailMasked}</p>
            <p className="text-sm">{day.format(new Date(order.createdAt))}</p>
          </address>
        </section>
      </div>
    </div>
  );
}
