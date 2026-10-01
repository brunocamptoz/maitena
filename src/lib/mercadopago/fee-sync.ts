import { extractFees, feeFields, needsFeeCheck, type FeeSource } from "./fees.ts";

export type FeeTarget = { id: string; provider_payment_id: string; status: string; raw: unknown };

export type FeeSyncDeps = {
  /** Consulta el pago a Mercado Pago; null si no existe (p. ej. un pago de una cuenta de prueba). */
  fetchPayment: (providerPaymentId: string) => Promise<FeeSource | null>;
  /** Guarda el `raw` actualizado del pago; devuelve true si se pudo. */
  save: (paymentId: string, raw: Record<string, unknown>) => Promise<boolean>;
  /** Instante de la consulta (ISO), para no repetirla enseguida. */
  now: string;
  /** Máximo de pagos a consultar por vez. */
  batch?: number;
};

/** Pagos aprobados, con id numérico de Mercado Pago y sin comisión guardada (o no consultada hace poco). */
export function feeTargets(payments: FeeTarget[], now = Date.now()) {
  return payments.filter(
    (p) => p.status === "approved" && /^\d{1,20}$/.test(p.provider_payment_id ?? "") && needsFeeCheck(p.raw, now),
  );
}

/**
 * Trae de Mercado Pago la comisión de cada pago y la guarda en `raw` junto con la hora de la consulta.
 * Si Mercado Pago no responde, el pago NO se marca como consultado: se reintenta en la próxima visita.
 */
export async function syncPaymentFees(targets: FeeTarget[], deps: FeeSyncDeps) {
  const batch = targets.slice(0, deps.batch ?? 25);
  const results = await Promise.allSettled(batch.map((t) => deps.fetchPayment(t.provider_payment_id)));

  let updated = 0;
  let failed = 0;
  for (const [i, result] of results.entries()) {
    if (result.status === "rejected") {
      failed++;
      continue;
    }
    const fees = result.value ? extractFees(result.value) : null;
    const previous = batch[i].raw && typeof batch[i].raw === "object" ? (batch[i].raw as Record<string, unknown>) : {};
    const saved = await deps.save(batch[i].id, { ...previous, ...feeFields(fees), fees_checked_at: deps.now });
    if (!saved) failed++;
    else if (fees) updated++;
  }
  return { updated, failed, checked: batch.length };
}
