import { z } from "zod";

/** Reglas del flujo de un pedido en el panel (puras: se prueban sin base de datos). */

export type OrderStatus = "awaiting_payment" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";

/** "Pago confirmado" → empezar a preparar. */
export const canPrepare = (s: string) => s === "paid";
/** Se puede despachar (cargar seguimiento) un pedido pagado, ya sea recién llegado o en preparación. */
export const canShip = (s: string) => s === "paid" || s === "preparing";
export const canDeliver = (s: string) => s === "shipped";
/**
 * Cancelar solo antes del despacho: una vez enviado, devolver las unidades al stock sería mentir
 * (el paquete ya salió). Las devoluciones posteriores se gestionan aparte.
 */
export const canCancel = (s: string) => s === "awaiting_payment" || s === "paid" || s === "preparing";
/** Corregir el seguimiento mientras el pedido está en camino. */
export const canEditTracking = (s: string) => s === "shipped";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

/** Solo http(s): el enlace se muestra al cliente en el email y en su página de pedido. */
const trackingUrl = z
  .string()
  .trim()
  .max(500, "El enlace es demasiado largo.")
  .transform((v) => (v === "" ? null : v))
  .refine(
    (v) => {
      if (v === null) return true;
      try {
        const u = new URL(v);
        return u.protocol === "https:" || u.protocol === "http:";
      } catch {
        return false;
      }
    },
    "El enlace de seguimiento debe empezar con https://",
  );

export const trackingSchema = z.object({
  company: z.string().trim().min(1, "Indicá la empresa de transporte.").max(80, "Máximo 80 caracteres."),
  number: optional(80),
  url: trackingUrl,
});

export type TrackingInput = z.output<typeof trackingSchema>;

export function trackingFromForm(formData: FormData) {
  const text = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  return { company: text("company"), number: text("number"), url: text("url") };
}

/** Enlace de WhatsApp para un teléfono uruguayo (09x xxx xxx → +598 9x xxx xxx). null si no parece un número. */
export function whatsappLink(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `598${digits.slice(1)}`;
  else if (!digits.startsWith("598") && digits.length === 8) digits = `598${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? `https://wa.me/${digits}` : null;
}

const EVENT_LABEL: Record<string, string> = {
  created: "Pedido creado",
  payment_approved: "Pago aprobado",
  payment_pending: "Pago pendiente de acreditación",
  payment_rejected: "Pago rechazado",
  payment_cancelled: "Pago cancelado",
  payment_refunded: "Pago reembolsado",
  stock_released: "Stock reservado devuelto",
  cancelled: "Pedido cancelado",
  preparing: "Se empezó a preparar",
  shipped: "Pedido enviado",
  tracking_updated: "Seguimiento corregido",
  delivered: "Marcado como entregado",
  attention_resolved: "Aviso marcado como resuelto",
  email_resent: "Email reenviado",
};

export function eventLabel(type: string) {
  return EVENT_LABEL[type] ?? type;
}
