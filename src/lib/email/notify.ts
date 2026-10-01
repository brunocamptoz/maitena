import { adminSaleEmail, confirmationEmail, shippedEmail } from "./templates.ts";
import type { EmailContext, EmailOrder, Mailer, RenderedEmail } from "./types.ts";

/** Cliente de base mínimo (compatible con supabase-js) para reclamar/liberar envíos. */
export type RpcDb = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export type NotifyDeps = {
  db: RpcDb;
  loadOrder: (orderId: string) => Promise<EmailOrder | null>;
  /** null = todavía no se configuró el servicio de email (RESEND_API_KEY / EMAIL_FROM). */
  mailer: Mailer | null;
  ctx: EmailContext;
  /** A dónde va el aviso de nueva venta (ADMIN_NOTIFICATION_EMAIL). */
  adminEmail?: string;
  /**
   * Modo prueba: TODOS los emails se envían a esta dirección (con el asunto marcado). Sirve para ver cómo
   * llegan los correos del comprador cuando todavía no hay dominio verificado en Resend.
   */
  redirectTo?: string;
  log?: (level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) => void;
};

export type EmailOutcome =
  | "sent"
  | "already_sent"
  | "not_configured"
  | "no_recipient"
  | "order_not_ready"
  | "failed";

type Kind = "confirmation" | "admin" | "shipping";

const PAID_STATES = new Set(["paid", "preparing", "shipped", "delivered"]);

/**
 * Envía UN email de un pedido sin duplicarlo jamás: primero "reclama" el envío de forma atómica en la base
 * (`claim_order_email`: solo un llamador gana, aunque lleguen dos webhooks a la vez); si el envío falla,
 * libera la marca para que se pueda reintentar.
 */
async function sendOnce(
  kind: Kind,
  order: EmailOrder,
  to: string | undefined,
  render: () => RenderedEmail,
  deps: NotifyDeps,
): Promise<EmailOutcome> {
  const log = deps.log ?? (() => {});

  if (!deps.mailer) {
    log("warn", "Email no enviado: falta configurar RESEND_API_KEY y EMAIL_FROM", { kind, order: order.orderNumber });
    return "not_configured";
  }
  if (!to) {
    log("warn", "Email no enviado: no hay destinatario", { kind, order: order.orderNumber });
    return "no_recipient";
  }

  const claimed = await deps.db.rpc("claim_order_email", { p_order_id: order.id, p_kind: kind });
  if (claimed.error) {
    log("error", "No se pudo reclamar el envío del email", { kind, error: claimed.error.message });
    return "failed";
  }
  if (claimed.data !== true) return "already_sent";

  const rendered = render();
  const redirected = deps.redirectTo && deps.redirectTo.toLowerCase() !== to.toLowerCase();
  const result = await deps.mailer({
    to: deps.redirectTo || to,
    subject: redirected ? `[PRUEBA · para ${to}] ${rendered.subject}` : rendered.subject,
    html: rendered.html,
    text: rendered.text,
    replyTo: deps.ctx.contact.email ?? undefined,
    idempotencyKey: `${kind}-${order.id}`,
  });

  if (!result.ok) {
    log("error", "Falló el envío del email; se reintentará", { kind, order: order.orderNumber, error: result.error });
    await deps.db.rpc("unclaim_order_email", { p_order_id: order.id, p_kind: kind });
    return "failed";
  }

  log("info", "Email enviado", { kind, order: order.orderNumber, id: result.id });
  return "sent";
}

/**
 * Cuando un pedido queda PAGADO: confirmación al comprador + aviso de nueva venta al administrador.
 * Es seguro llamarla muchas veces (webhook, reintentos, página del pedido): cada email sale una sola vez.
 */
export async function notifyOrderPaid(
  orderId: string,
  deps: NotifyDeps,
): Promise<{ confirmation: EmailOutcome; admin: EmailOutcome }> {
  const order = await deps.loadOrder(orderId);
  if (!order || !PAID_STATES.has(order.orderStatus) || order.paymentStatus !== "approved") {
    // Nunca se confirma por mail un pedido que no está realmente pagado.
    return { confirmation: "order_not_ready", admin: "order_not_ready" };
  }

  const confirmation = await sendOnce(
    "confirmation",
    order,
    order.customerEmail,
    () => confirmationEmail(order, deps.ctx),
    deps,
  );
  const admin = await sendOnce("admin", order, deps.adminEmail, () => adminSaleEmail(order, deps.ctx), deps);
  return { confirmation, admin };
}

/** Cuando el administrador despacha el pedido y carga el seguimiento (paso del panel). */
export async function notifyOrderShipped(orderId: string, deps: NotifyDeps): Promise<EmailOutcome> {
  const order = await deps.loadOrder(orderId);
  if (!order || order.orderStatus !== "shipped") return "order_not_ready";
  return sendOnce("shipping", order, order.customerEmail, () => shippedEmail(order, deps.ctx), deps);
}
