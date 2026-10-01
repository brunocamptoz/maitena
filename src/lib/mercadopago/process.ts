import { extractFees, feeFields, type FeeSource } from "./fees.ts";
import { mapPaymentStatus } from "./status.ts";

/** Lo mínimo que se usa de un pago de Mercado Pago (ya consultado a su API, no lo que llegó por HTTP). */
export type MpPayment = FeeSource & {
  id?: string | number;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  date_approved?: string | null;
  live_mode?: boolean;
};

/** Cliente de base de datos mínimo (compatible con supabase-js): permite probar sin red. */
export type Db = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export type ProcessOutcome =
  | { kind: "ignored"; reason: string }
  | {
      kind: "applied";
      orderId: string;
      becamePaid: boolean;
      needsAttention: boolean;
      attentionReason: string | null;
      orderStatus: string;
    };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Aplica un pago REAL (ya verificado contra la API de Mercado Pago) al pedido correspondiente.
 * El vínculo pago → pedido es `external_reference` (id del pedido, puesto por nosotros al crear la preferencia).
 * Toda la lógica de estados y stock vive en la función SQL `apply_payment`, que es idempotente.
 */
export async function processPayment(db: Db, payment: MpPayment): Promise<ProcessOutcome> {
  const paymentId = payment.id === undefined || payment.id === null ? "" : String(payment.id);
  if (!paymentId) return { kind: "ignored", reason: "payment_without_id" };

  const orderId = payment.external_reference;
  if (!orderId || !UUID.test(orderId)) return { kind: "ignored", reason: "no_order_reference" };

  // Los montos del pedido están en pesos uruguayos: un pago en otra moneda no puede confirmarlo.
  if (payment.currency_id && payment.currency_id !== "UYU") {
    return { kind: "ignored", reason: "unexpected_currency" };
  }

  const amount = Number(payment.transaction_amount);
  if (!Number.isFinite(amount) || amount < 0) return { kind: "ignored", reason: "invalid_amount" };

  const { data, error } = await db.rpc("apply_payment", {
    p_order_id: orderId.toLowerCase(),
    p_provider_payment_id: paymentId,
    p_status: mapPaymentStatus(payment.status),
    p_provider_status: payment.status ?? null,
    p_provider_status_detail: payment.status_detail ?? null,
    p_amount: amount,
    p_payment_method: payment.payment_method_id ?? null,
    // Solo referencias mínimas; nunca datos del pagador ni de la tarjeta.
    p_raw: {
      id: paymentId,
      status: payment.status ?? null,
      status_detail: payment.status_detail ?? null,
      payment_method_id: payment.payment_method_id ?? null,
      payment_type_id: payment.payment_type_id ?? null,
      transaction_amount: amount,
      currency_id: payment.currency_id ?? null,
      date_approved: payment.date_approved ?? null,
      live_mode: payment.live_mode ?? null,
      // Comisión de Mercado Pago (solo importes): alimenta la sección Ventas del panel.
      ...feeFields(extractFees(payment)),
    },
  });

  if (error) {
    // Un pago que apunta a un pedido que no existe no es un error nuestro: no hay nada que reintentar.
    if (error.message === "order_not_found") return { kind: "ignored", reason: "unknown_order" };
    throw new Error(`apply_payment falló: ${error.message}`);
  }

  const result = (data ?? {}) as {
    became_paid?: boolean;
    needs_attention?: boolean;
    attention_reason?: string | null;
    order_status?: string;
  };

  return {
    kind: "applied",
    orderId: orderId.toLowerCase(),
    becamePaid: result.became_paid === true,
    needsAttention: result.needs_attention === true,
    attentionReason: result.attention_reason ?? null,
    orderStatus: result.order_status ?? "unknown",
  };
}
