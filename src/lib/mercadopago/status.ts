/** Estados de pago de la base de datos (enum `payment_status`). */
export type PaymentStatus = "pending" | "approved" | "rejected" | "cancelled" | "refunded";

/**
 * Traduce el estado de Mercado Pago a los 5 estados propios.
 *   approved                              → approved
 *   rejected                              → rejected
 *   cancelled                             → cancelled
 *   refunded, charged_back                → refunded   (dinero devuelto al comprador)
 *   pending, in_process, in_mediation,
 *   authorized y cualquier estado nuevo   → pending    (nunca se confirma algo que MP no confirmó)
 */
export function mapPaymentStatus(mpStatus: string | null | undefined): PaymentStatus {
  switch (mpStatus) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}
