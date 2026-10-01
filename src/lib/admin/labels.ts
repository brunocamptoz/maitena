/** Textos en español de los estados (los valores internos están en inglés en la base). */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Pago pendiente",
  paid: "Pago confirmado",
  preparing: "Preparando pedido",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export const ATTENTION_LABEL: Record<string, string> = {
  duplicate_payment: "Cobro duplicado: el cliente pagó dos veces. Reintegrá uno desde Mercado Pago.",
  amount_mismatch: "El monto cobrado no coincide con el pedido. Revisalo en Mercado Pago antes de despachar.",
  stock_shortfall: "Se cobró pero ya no queda stock suficiente. Contactá al cliente o reintegrá el pago.",
  paid_after_cancel: "Pagó después de que cancelaste el pedido. Reintegrá el pago desde Mercado Pago.",
  payment_refunded: "El pago fue reembolsado. Revisá si hay que cancelar el pedido.",
  refund_pending: "Pedido cancelado con pago aprobado: falta reintegrar el dinero desde Mercado Pago.",
};

export const CATEGORY_LABEL: Record<string, string> = {
  anillos: "Anillos",
  pulseras: "Pulseras",
  cadenas: "Cadenas",
  aros: "Aros",
  dijes: "Dijes",
};

const tz = "America/Montevideo";
const dateTime = new Intl.DateTimeFormat("es-UY", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: tz,
});
const dateLong = new Intl.DateTimeFormat("es-UY", { dateStyle: "long", timeStyle: "short", timeZone: tz });

const saleParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: tz,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Fecha y hora de una compra en hora de Montevideo: { date: "30/09/2026", time: "19:18" }. */
export function formatSaleDate(iso: string | null | undefined) {
  if (!iso) return { date: "—", time: "" };
  const p = Object.fromEntries(saleParts.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.day}/${p.month}/${p.year}`, time: `${p.hour}:${p.minute}` };
}

export const formatDateTime =(iso: string | null | undefined) => (iso ? dateTime.format(new Date(iso)) : "—");
export const formatDateLong = (iso: string | null | undefined) => (iso ? dateLong.format(new Date(iso)) : "—");
