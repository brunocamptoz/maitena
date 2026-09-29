export type ShippingQuote =
  | {
      ok: true;
      subtotal: number;
      shippingCost: number;
      total: number;
      /** Monto desde el cual el envío es gratis (null si no hay promoción). */
      freeShippingFrom: number | null;
      /** false = el negocio todavía no cargó los costos de envío. */
      configured: boolean;
    }
  | { ok: false; message: string };

export type CheckoutErrorCode =
  | "invalid_input"
  | "insufficient_stock"
  | "product_unavailable"
  | "price_changed"
  | "shipping_not_configured"
  | "payments_unavailable"
  | "too_many_pending"
  | "payment_error"
  | "unknown";

export type CheckoutResult =
  | { ok: true; url: string }
  | {
      ok: false;
      code: CheckoutErrorCode;
      message: string;
      /** Errores por campo del formulario. */
      fieldErrors?: Record<string, string>;
      /** Para insufficient_stock / product_unavailable: qué producto y cuántas unidades quedan. */
      productId?: string;
      available?: number;
      /** Para price_changed: el total real. */
      newTotal?: number;
    };
