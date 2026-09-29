/** Reglas de pago (Mercado Pago Checkout Pro). */
export const PAYMENTS = {
  currency: "UYU",

  /**
   * Con `binaryMode` el pago solo puede quedar aprobado o rechazado (nunca "pendiente de revisión").
   * Conviene para stock limitado: se sabe enseguida si la venta se concretó.
   */
  binaryMode: true,

  /**
   * Medios que NO se ofrecen. "ticket" = pagos en efectivo (Abitab, RedPagos): se acreditan en días y
   * dejarían el stock reservado. Se puede habilitar más adelante quitándolo de esta lista.
   */
  excludedPaymentTypes: ["ticket"],

  /** Aparece en el resumen de la tarjeta del comprador (máx. 16 caracteres). */
  statementDescriptor: "MAITENA JOYAS",

  /** Un mismo email no puede tener más de esta cantidad de pedidos sin pagar reteniendo stock. */
  maxPendingOrdersPerEmail: 5,
} as const;
