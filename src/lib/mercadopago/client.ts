import "server-only";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import type { PreferenceBody } from "@/lib/mercadopago/preference";
import { processPayment, type Db, type MpPayment, type ProcessOutcome } from "@/lib/mercadopago/process";

/** null si todavía no se configuró MERCADOPAGO_ACCESS_TOKEN (la tienda avisa que los pagos no están disponibles). */
export function getMercadoPago() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return null;
  return new MercadoPagoConfig({ accessToken, options: { timeout: 10_000 } });
}

const isNotFound = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { status?: number }).status === 404;

/** El pago tal como lo informa Mercado Pago (la única fuente confiable). null si no existe. */
export async function fetchPaymentById(config: MercadoPagoConfig, id: string | number) {
  try {
    return (await new Payment(config).get({ id })) as MpPayment;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** Todos los pagos asociados a un pedido (external_reference), del más viejo al más nuevo. */
export async function listPaymentsForOrder(config: MercadoPagoConfig, orderId: string) {
  const found = await new Payment(config).search({
    options: { external_reference: orderId, sort: "date_created", criteria: "desc", limit: 10 },
  });
  const ids = (found.results ?? []).map((r) => r.id).filter((id): id is string => !!id);
  const payments = await Promise.all(ids.map((id) => fetchPaymentById(config, id)));
  return payments.filter((p): p is MpPayment => p !== null).reverse();
}

/** Crea la preferencia de pago. `idempotencyKey` evita duplicarla si se reintenta el mismo pedido. */
export async function createPreference(
  config: MercadoPagoConfig,
  body: PreferenceBody,
  idempotencyKey: string,
) {
  const res = await new Preference(config).create({ body, requestOptions: { idempotencyKey } });
  if (!res.id || !res.init_point) {
    throw new Error("Mercado Pago no devolvió el enlace de pago.");
  }
  return { id: res.id, initPoint: res.init_point };
}

export async function getPreferenceInitPoint(config: MercadoPagoConfig, preferenceId: string) {
  const res = await new Preference(config).get({ preferenceId });
  return res.init_point ?? null;
}

/**
 * Red de seguridad: consulta a Mercado Pago los pagos de un pedido y los aplica.
 * Cubre el caso de un aviso (webhook) demorado o perdido; es seguro repetirlo (idempotente).
 * `hintPaymentId` = el `payment_id` que Mercado Pago agrega al volver a la tienda (solo se usa
 * para CONSULTAR el pago real, nunca se confía en los datos de la URL).
 */
export async function reconcileOrder(
  db: Db,
  config: MercadoPagoConfig,
  orderId: string,
  hintPaymentId?: string | null,
): Promise<ProcessOutcome[]> {
  const payments = await listPaymentsForOrder(config, orderId);
  if (hintPaymentId && /^\d{1,20}$/.test(hintPaymentId) && !payments.some((p) => String(p.id) === hintPaymentId)) {
    const hinted = await fetchPaymentById(config, hintPaymentId);
    if (hinted) payments.push(hinted);
  }

  const outcomes: ProcessOutcome[] = [];
  for (const payment of payments) {
    // Solo pagos de ESTE pedido: el hint de la URL podría apuntar a otro.
    if (payment.external_reference?.toLowerCase() !== orderId.toLowerCase()) continue;
    outcomes.push(await processPayment(db, payment));
  }
  return outcomes;
}
