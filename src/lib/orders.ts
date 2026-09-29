import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/** En qué punto está el pedido, desde el punto de vista del comprador. */
export type OrderPhase =
  | "pending" // esperando la confirmación del pago
  | "rejected" // el pago falló, puede reintentar
  | "expired" // venció el tiempo para pagar
  | "cancelled"
  | "paid" // pago confirmado, se está preparando
  | "shipped"
  | "delivered";

export type OrderView = {
  id: string;
  orderNumber: number;
  token: string;
  phase: OrderPhase;
  customerName: string;
  emailMasked: string;
  department: string;
  city: string;
  address: string;
  doorNumber: string;
  apartment: string | null;
  subtotal: number;
  shippingCost: number;
  total: number;
  paymentStatus: string;
  orderStatus: string;
  reservedUntil: string | null;
  hasPreference: boolean;
  tracking: { company: string | null; number: string | null; url: string | null } | null;
  createdAt: string;
  items: { name: string; quantity: number; unitPrice: number; subtotal: number }[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function maskEmail(email: string) {
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 1)}${"•".repeat(Math.max(user.length - 1, 2))}@${domain}`;
}

export function derivePhase(o: {
  order_status: string;
  payment_status: string;
  cancel_reason: string | null;
  reserved_until: string | null;
}): OrderPhase {
  switch (o.order_status) {
    case "delivered":
      return "delivered";
    case "shipped":
      return "shipped";
    case "paid":
    case "preparing":
      return "paid";
    case "cancelled":
      return o.cancel_reason === "expired" ? "expired" : "cancelled";
    default: {
      if (o.reserved_until && Date.parse(o.reserved_until) < Date.now()) return "expired";
      return o.payment_status === "rejected" ? "rejected" : "pending";
    }
  }
}

/** Busca un pedido por su enlace secreto (el comprador no tiene cuenta). null si no existe. */
export async function getOrderByToken(token: string): Promise<OrderView | null> {
  if (!UUID.test(token)) return null;
  const db = createServiceClient();

  const { data: o, error } = await db
    .from("orders")
    .select(
      "id, order_number, public_token, customer_name, customer_email, shipping_department, shipping_city, " +
        "shipping_address, shipping_door_number, shipping_apartment, subtotal, shipping_cost, total, " +
        "payment_status, order_status, cancel_reason, reserved_until, payment_preference_id, " +
        "tracking_company, tracking_number, tracking_url, created_at",
    )
    .eq("public_token", token.toLowerCase())
    .maybeSingle<Record<string, string | number | null>>();
  if (error) throw new Error(`No se pudo leer el pedido: ${error.message}`);
  if (!o) return null;

  const { data: items, error: itemsError } = await db
    .from("order_items")
    .select("product_name, quantity, unit_price, subtotal")
    .eq("order_id", o.id as string)
    .order("created_at");
  if (itemsError) throw new Error(`No se pudieron leer los productos del pedido: ${itemsError.message}`);

  const hasTracking = o.tracking_company || o.tracking_number || o.tracking_url;

  return {
    id: o.id as string,
    orderNumber: o.order_number as number,
    token: o.public_token as string,
    phase: derivePhase(o as Parameters<typeof derivePhase>[0]),
    customerName: o.customer_name as string,
    emailMasked: maskEmail(o.customer_email as string),
    department: o.shipping_department as string,
    city: o.shipping_city as string,
    address: o.shipping_address as string,
    doorNumber: o.shipping_door_number as string,
    apartment: (o.shipping_apartment as string | null) ?? null,
    subtotal: o.subtotal as number,
    shippingCost: o.shipping_cost as number,
    total: o.total as number,
    paymentStatus: o.payment_status as string,
    orderStatus: o.order_status as string,
    reservedUntil: (o.reserved_until as string | null) ?? null,
    hasPreference: !!o.payment_preference_id,
    tracking: hasTracking
      ? {
          company: (o.tracking_company as string | null) ?? null,
          number: (o.tracking_number as string | null) ?? null,
          url: (o.tracking_url as string | null) ?? null,
        }
      : null,
    createdAt: o.created_at as string,
    items: (items ?? []).map((i) => ({
      name: i.product_name as string,
      quantity: i.quantity as number,
      unitPrice: i.unit_price as number,
      subtotal: i.subtotal as number,
    })),
  };
}

/** Datos internos (no se muestran al comprador) que necesita reintentar un pago. */
export async function getOrderPaymentRef(token: string) {
  if (!UUID.test(token)) return null;
  const { data, error } = await createServiceClient()
    .from("orders")
    .select("id, order_status, payment_status, reserved_until, payment_preference_id")
    .eq("public_token", token.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer el pedido: ${error.message}`);
  return data;
}
