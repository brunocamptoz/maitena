import type { EmailOrder } from "./types.ts";

/** Lectura mínima compatible con supabase-js (para poder usarla con la clave de servidor o en pruebas). */
type Row = Record<string, unknown>;
export type ReadDb = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{ data: unknown; error: { message: string } | null }>;
        order: (column: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
      };
    };
  };
};

const ORDER_COLUMNS =
  "id, order_number, public_token, order_status, payment_status, customer_name, customer_last_name, " +
  "customer_email, customer_phone, shipping_department, shipping_city, shipping_address, shipping_door_number, " +
  "shipping_apartment, shipping_postal_code, shipping_notes, subtotal, shipping_cost, total, created_at, paid_at, " +
  "tracking_company, tracking_number, tracking_url, needs_attention, attention_reason";

const str = (v: unknown) => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);

export async function loadOrderForEmail(db: ReadDb, orderId: string): Promise<EmailOrder | null> {
  const order = await db.from("orders").select(ORDER_COLUMNS).eq("id", orderId).maybeSingle();
  if (order.error) throw new Error(`No se pudo leer el pedido: ${order.error.message}`);
  const o = order.data as Row | null;
  if (!o) return null;

  const items = await db
    .from("order_items")
    .select("product_name, quantity, unit_price, subtotal")
    .eq("order_id", orderId)
    .order("created_at");
  if (items.error) throw new Error(`No se pudieron leer los productos del pedido: ${items.error.message}`);

  return {
    id: str(o.id),
    orderNumber: Number(o.order_number),
    publicToken: str(o.public_token),
    orderStatus: str(o.order_status),
    paymentStatus: str(o.payment_status),
    customerName: str(o.customer_name),
    customerLastName: str(o.customer_last_name),
    customerEmail: str(o.customer_email),
    customerPhone: str(o.customer_phone),
    department: str(o.shipping_department),
    city: str(o.shipping_city),
    address: str(o.shipping_address),
    doorNumber: str(o.shipping_door_number),
    apartment: strOrNull(o.shipping_apartment),
    postalCode: strOrNull(o.shipping_postal_code),
    notes: strOrNull(o.shipping_notes),
    subtotal: Number(o.subtotal),
    shippingCost: Number(o.shipping_cost),
    total: Number(o.total),
    createdAt: str(o.created_at),
    paidAt: strOrNull(o.paid_at),
    tracking: {
      company: strOrNull(o.tracking_company),
      number: strOrNull(o.tracking_number),
      url: strOrNull(o.tracking_url),
    },
    needsAttention: o.needs_attention === true,
    attentionReason: strOrNull(o.attention_reason),
    items: ((items.data as Row[] | null) ?? []).map((i) => ({
      name: str(i.product_name),
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      subtotal: Number(i.subtotal),
    })),
  };
}
