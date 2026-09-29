import type { Preference } from "mercadopago";

/** Cuerpo de la preferencia de Checkout Pro (el SDK no exporta este tipo por separado). */
export type PreferenceBody = Parameters<Preference["create"]>[0]["body"];

export type PreferenceSettings = {
  currency: string;
  binaryMode: boolean;
  excludedPaymentTypes: readonly string[];
  statementDescriptor: string;
};

export type PreferenceInput = {
  orderId: string;
  orderNumber: number;
  publicToken: string;
  items: { productId: string; name: string; quantity: number; unitPrice: number }[];
  shippingCost: number;
  shippingLabel: string;
  customer: { name: string; lastName: string; email: string };
  /** Cuándo vence la reserva de stock: la preferencia de pago vence en el mismo momento. */
  reservedUntil: Date;
  now: Date;
  siteUrl: string;
};

/** Mercado Pago rechaza direcciones locales en back_urls / notification_url. */
export function isPublicHttpsUrl(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname;
    return (
      u.protocol === "https:" &&
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      !host.endsWith(".local") &&
      host.includes(".")
    );
  } catch {
    return false;
  }
}

/** Fecha en el formato que pide Mercado Pago, con el huso de Uruguay (UTC-3, sin horario de verano). */
export function toMercadoPagoDate(date: Date) {
  return new Date(date.getTime() - 3 * 3_600_000).toISOString().replace("Z", "-03:00");
}

/**
 * Arma la preferencia de Checkout Pro. Los montos vienen del pedido ya creado en la base
 * (precios leídos de la base, nunca del navegador), así que lo que se cobra = lo que se guardó.
 */
export function buildPreferenceBody(input: PreferenceInput, settings: PreferenceSettings): PreferenceBody {
  const orderUrl = `${input.siteUrl}/pedido/${input.publicToken}`;
  const isPublic = isPublicHttpsUrl(input.siteUrl);

  const items: PreferenceBody["items"] = input.items.map((item) => ({
    id: item.productId,
    title: item.name.slice(0, 250),
    quantity: item.quantity,
    unit_price: item.unitPrice,
    currency_id: settings.currency,
  }));

  if (input.shippingCost > 0) {
    items.push({
      id: "shipping",
      title: input.shippingLabel.slice(0, 250),
      quantity: 1,
      unit_price: input.shippingCost,
      currency_id: settings.currency,
    });
  }

  return {
    items,
    external_reference: input.orderId,
    payer: {
      name: input.customer.name,
      surname: input.customer.lastName,
      email: input.customer.email,
    },
    payment_methods: {
      excluded_payment_types: settings.excludedPaymentTypes.map((id) => ({ id })),
    },
    binary_mode: settings.binaryMode,
    statement_descriptor: settings.statementDescriptor,
    expires: true,
    expiration_date_from: toMercadoPagoDate(input.now),
    expiration_date_to: toMercadoPagoDate(input.reservedUntil),
    metadata: { order_id: input.orderId, order_number: input.orderNumber },
    // Con un sitio público se agregan el regreso a la tienda y el aviso de pagos; en desarrollo local
    // (localhost) Mercado Pago no los acepta, así que se omiten.
    ...(isPublic
      ? {
          back_urls: { success: orderUrl, pending: orderUrl, failure: orderUrl },
          auto_return: "approved",
          notification_url: `${input.siteUrl}/api/webhooks/mercadopago`,
        }
      : {}),
  };
}
