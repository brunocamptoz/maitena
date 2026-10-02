"use server";

import { revalidateTag } from "next/cache";
import { site } from "@/config/site";
import { PAYMENTS } from "@/config/payments";
import { checkoutInputSchema, quoteInputSchema, toFieldErrors } from "@/lib/checkout/schema";
import { computeShipping, shippingIsSellable } from "@/lib/checkout/shipping";
import type { CheckoutResult, ShippingQuote } from "@/lib/checkout/types";
import { formatPrice } from "@/lib/format";
import { createPreference, getMercadoPago, getPreferenceInitPoint } from "@/lib/mercadopago/client";
import { buildPreferenceBody } from "@/lib/mercadopago/preference";
import { getOrderPaymentRef } from "@/lib/orders";
import { getProductsByIds } from "@/lib/products";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Cuánto costaría el envío (y el total) para un departamento. Sirve para MOSTRAR el costo antes de
 * pagar; al cobrar, el servidor lo recalcula desde la base (ver createCheckout).
 */
export async function quoteShipping(input: unknown): Promise<ShippingQuote> {
  const parsed = quoteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Elegí tu departamento para calcular el envío." };
  const { department, items } = parsed.data;

  // Productos, ajustes de envío y tarifa se piden a la vez: son tres lecturas independientes.
  const db = createServiceClient();
  const [products, settings, rate] = await Promise.all([
    getProductsByIds(items.map((i) => i.productId)),
    db.from("store_settings").select("shipping_default_cost, free_shipping_from, shipping_configured").single(),
    db.from("shipping_rates").select("cost").eq("department", department).maybeSingle(),
  ]);
  const byId = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  for (const line of items) {
    const product = byId.get(line.productId);
    if (!product || product.stock < line.quantity) {
      return {
        ok: false,
        message: "Algunos productos ya no están disponibles en esa cantidad. Volvé al carrito para revisarlo.",
      };
    }
    subtotal += product.price * line.quantity;
  }

  if (settings.error || !settings.data) {
    return { ok: false, message: "No pudimos calcular el envío. Probá de nuevo en unos minutos." };
  }

  const shippingCost = computeShipping({
    subtotal,
    defaultCost: settings.data.shipping_default_cost,
    rateCost: rate.data?.cost ?? null,
    freeFrom: settings.data.free_shipping_from,
  });

  return {
    ok: true,
    subtotal,
    shippingCost,
    total: subtotal + shippingCost,
    freeShippingFrom: settings.data.free_shipping_from,
    configured: shippingIsSellable(settings.data.shipping_configured),
  };
}

const errorMessages: Record<string, string> = {
  invalid_department: "Elegí un departamento válido.",
  invalid_items: "Tu carrito está vacío o tiene datos inválidos.",
  invalid_quantity: "Alguna cantidad no es válida. Revisá tu carrito.",
};

/**
 * Crea el pedido, reserva el stock y devuelve el enlace de pago de Mercado Pago.
 *
 *   1. Valida todo de nuevo en el servidor (nunca se confía en el navegador).
 *   2. `create_order` (SQL): lee los precios de la base, reserva el stock de forma atómica y calcula el envío.
 *   3. Comprueba que el total real coincide con el que el comprador vio; si no, no cobra.
 *   4. Crea la preferencia de Mercado Pago con esos montos. El pago se confirma SOLO por el webhook.
 */
export async function createCheckout(input: unknown): Promise<CheckoutResult> {
  const parsed = checkoutInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Revisá los datos marcados en el formulario.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }
  const { customer, items, expectedTotal, website } = parsed.data;

  // Campo trampa: solo lo completan los bots.
  if (website) return { ok: false, code: "invalid_input", message: "No pudimos procesar tu pedido." };

  const mp = getMercadoPago();
  if (!mp) {
    console.error("[checkout] Falta MERCADOPAGO_ACCESS_TOKEN");
    return {
      ok: false,
      code: "payments_unavailable",
      message: "Los pagos no están disponibles por el momento. Probá de nuevo más tarde.",
    };
  }

  const db = createServiceClient();

  const settings = await db.from("store_settings").select("shipping_configured").single();
  if (settings.error || !settings.data) {
    console.error("[checkout] No se pudieron leer los ajustes:", settings.error?.message);
    return { ok: false, code: "unknown", message: "No pudimos iniciar la compra. Probá de nuevo en unos minutos." };
  }
  if (!shippingIsSellable(settings.data.shipping_configured)) {
    return {
      ok: false,
      code: "shipping_not_configured",
      message: "Estamos terminando de configurar los envíos. Escribinos y coordinamos tu compra.",
    };
  }

  // Freno básico contra quien intente dejar el stock reservado sin pagar.
  const pending = await db
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_email", customer.email)
    .eq("order_status", "awaiting_payment")
    .eq("stock_status", "reserved");
  if ((pending.count ?? 0) >= PAYMENTS.maxPendingOrdersPerEmail) {
    return {
      ok: false,
      code: "too_many_pending",
      message: "Tenés varias compras sin terminar de pagar. Completalas o esperá unos minutos para hacer una nueva.",
    };
  }

  const created = await db.rpc("create_order", {
    p_customer: {
      name: customer.name,
      last_name: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      department: customer.department,
      city: customer.city,
      address: customer.address,
      door_number: customer.doorNumber,
      apartment: customer.apartment,
      postal_code: customer.postalCode,
      notes: customer.notes,
    },
    p_items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
  });

  if (created.error) {
    const { message, details, hint } = created.error;

    if (message === "insufficient_stock" || message === "product_unavailable") {
      const [product] = details ? await getProductsByIds([details]) : [];
      const available = message === "insufficient_stock" ? Number.parseInt(hint ?? "0", 10) || 0 : 0;
      const name = product?.name ?? "uno de los productos";
      return {
        ok: false,
        code: message,
        productId: details ?? undefined,
        available,
        message:
          available > 0
            ? `Solo quedan ${available} ${available === 1 ? "unidad" : "unidades"} de “${name}”. Ajustá la cantidad en tu carrito.`
            : `“${name}” ya no está disponible. Quitalo de tu carrito para continuar.`,
      };
    }

    if (errorMessages[message]) {
      return { ok: false, code: "invalid_input", message: errorMessages[message] };
    }

    console.error("[checkout] create_order falló:", created.error);
    return { ok: false, code: "unknown", message: "No pudimos iniciar la compra. Probá de nuevo en unos minutos." };
  }

  const order = created.data as {
    order_id: string;
    order_number: number;
    public_token: string;
    total: number;
    shipping_cost: number;
    reserved_until: string;
    items: { product_id: string; name: string; quantity: number; unit_price: number }[];
  };

  // Lo que se cobra tiene que ser exactamente lo que el comprador vio en pantalla.
  if (order.total !== expectedTotal) {
    await db.rpc("release_order_stock", { p_order_id: order.order_id, p_reason: "price_changed" });
    revalidateTag("products", { expire: 0 });
    return {
      ok: false,
      code: "price_changed",
      newTotal: order.total,
      message: `El total cambió a ${formatPrice(order.total)}. Revisalo y volvé a confirmar.`,
    };
  }

  try {
    const preference = await createPreference(
      mp,
      buildPreferenceBody(
        {
          orderId: order.order_id,
          orderNumber: order.order_number,
          publicToken: order.public_token,
          items: order.items.map((i) => ({
            productId: i.product_id,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unit_price,
          })),
          shippingCost: order.shipping_cost,
          shippingLabel: `Envío a ${customer.department}`,
          customer: { name: customer.name, lastName: customer.lastName, email: customer.email },
          reservedUntil: new Date(order.reserved_until),
          now: new Date(),
          siteUrl: site.url,
        },
        PAYMENTS,
      ),
      order.order_id,
    );

    const saved = await db
      .from("orders")
      .update({ payment_preference_id: preference.id })
      .eq("id", order.order_id);
    if (saved.error) console.error("[checkout] No se pudo guardar la preferencia:", saved.error.message);

    // El stock reservado ya no figura como disponible para los demás.
    revalidateTag("products", { expire: 0 });
    return { ok: true, url: preference.initPoint };
  } catch (error) {
    console.error("[checkout] Mercado Pago rechazó la preferencia:", error);
    // Sin enlace de pago no hay compra: se libera el stock enseguida.
    await db.rpc("release_order_stock", { p_order_id: order.order_id, p_reason: "checkout_failed" });
    return {
      ok: false,
      code: "payment_error",
      message: "No pudimos iniciar el pago. Probá de nuevo en unos minutos.",
    };
  }
}

/** Devuelve el enlace de pago de un pedido que sigue vigente (para reintentar tras un rechazo). */
export async function getPaymentRetryUrl(token: unknown): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const invalid = { ok: false as const, message: "No pudimos retomar el pago. Volvé a la tienda e intentá de nuevo." };
  if (typeof token !== "string") return invalid;

  const mp = getMercadoPago();
  const order = await getOrderPaymentRef(token);
  if (!mp || !order?.payment_preference_id) return invalid;
  if (order.order_status !== "awaiting_payment") return invalid;
  if (!order.reserved_until || Date.parse(order.reserved_until) < Date.now()) {
    return { ok: false, message: "Venció el tiempo para pagar este pedido. Podés hacer una nueva compra." };
  }

  try {
    const url = await getPreferenceInitPoint(mp, order.payment_preference_id);
    return url ? { ok: true, url } : invalid;
  } catch (error) {
    console.error("[checkout] No se pudo obtener la preferencia:", error);
    return invalid;
  }
}
