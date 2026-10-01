/**
 * Comisión de Mercado Pago de un cobro. NO se calcula con ningún porcentaje: se toma lo que Mercado Pago
 * informa en cada pago (`transaction_details.net_received_amount` y `fee_details`), que depende del medio
 * de pago, las cuotas y el plan de acreditación de la cuenta.
 */

export type PaymentFees = {
  /** Lo que retiene Mercado Pago, en pesos (puede tener centavos). */
  fee: number;
  /** Lo que recibe la tienda: monto cobrado menos la comisión. */
  net: number;
};

export type FeeSource = {
  transaction_amount?: number;
  fee_details?: { amount?: number; fee_payer?: string; type?: string }[];
  transaction_details?: { net_received_amount?: number };
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** null = Mercado Pago todavía no informó la comisión de este pago. */
export function extractFees(payment: FeeSource): PaymentFees | null {
  const amount = Number(payment.transaction_amount);
  if (!Number.isFinite(amount)) return null;

  // Lo más confiable: lo que Mercado Pago dice que recibe el vendedor.
  const net = Number(payment.transaction_details?.net_received_amount);
  if (Number.isFinite(net) && net > 0 && net <= amount) return { fee: round2(amount - net), net: round2(net) };

  // Si no vino el neto, se suman las comisiones a cargo del vendedor ("collector").
  const collectorFees = (payment.fee_details ?? [])
    .filter((f) => f.fee_payer === "collector")
    .reduce((sum, f) => sum + (Number.isFinite(Number(f.amount)) ? Number(f.amount) : 0), 0);
  if (collectorFees > 0 && collectorFees <= amount) {
    return { fee: round2(collectorFees), net: round2(amount - collectorFees) };
  }
  return null;
}

/** Campos que se guardan en `payments.raw` (solo importes; nada del pagador ni de la tarjeta). */
export function feeFields(fees: PaymentFees | null) {
  return fees ? { fee_amount: fees.fee, net_received_amount: fees.net } : {};
}

/** Lee la comisión ya guardada en `payments.raw`. */
export function readFees(raw: unknown): PaymentFees | null {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return typeof r.fee_amount === "number" && typeof r.net_received_amount === "number"
    ? { fee: r.fee_amount, net: r.net_received_amount }
    : null;
}

/** No se vuelve a consultar a Mercado Pago un pago cuya comisión ya se pidió hace menos de este tiempo. */
export const FEE_RECHECK_MS = 30 * 60 * 1000;

/** ¿Falta la comisión de este pago y vale la pena preguntarla a Mercado Pago ahora? */
export function needsFeeCheck(raw: unknown, now = Date.now()) {
  if (readFees(raw)) return false;
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const checked = typeof r.fees_checked_at === "string" ? Date.parse(r.fees_checked_at) : Number.NaN;
  return !(Number.isFinite(checked) && now - checked < FEE_RECHECK_MS);
}
