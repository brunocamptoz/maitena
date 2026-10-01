// Verifica en la base REAL de Supabase que la seguridad y el manejo de stock funcionan.
//
//   npm run db:check
//
// Solo toca filas que crea él mismo (slug "zz-check-…") y las borra al terminar. Se puede correr las
// veces que haga falta: es la prueba de regresión de la base (¿sigue todo cerrado al público?).
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadOrderForEmail } from "../src/lib/email/load-order.ts";
import { notifyOrderPaid } from "../src/lib/email/notify.ts";
import { handleWebhook } from "../src/lib/mercadopago/webhook.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Faltan variables en .env.local (URL, clave pública y clave secreta de Supabase).");
  process.exit(1);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(url, anonKey, opts);
const svc = createClient(url, serviceKey, opts);

let passed = 0;
let failed = 0;
const ok = (name, cond, extra = "") => {
  if (cond) passed++;
  else failed++;
  console.log(`  ${cond ? "✓" : "✗ FALLA"} ${name}${!cond && extra ? `  →  ${extra}` : ""}`);
};
const denied = (error) => !!error && (error.code === "42501" || /permission denied/i.test(error.message));

const tag = `zz-check-${Date.now().toString(36)}`;
const created = { products: [], orders: [] };

const customer = (n) => ({
  name: "Prueba",
  last_name: "Automática",
  email: `check+${n}@example.com`,
  phone: "099000000",
  department: "Montevideo",
  city: "Montevideo",
  address: "Calle de prueba",
  door_number: "1",
});

async function mkProduct(suffix, stock, price = 1000) {
  const { data, error } = await svc
    .from("products")
    .insert({
      name: `ZZ ${suffix}`,
      slug: `${tag}-${suffix}`,
      price,
      category: "anillos",
      stock,
      active: true,
      is_demo: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(`No se pudo crear el producto de prueba: ${error.message}`);
  created.products.push(data.id);
  return data.id;
}

async function mkOrder(productId, quantity, n = 1) {
  const res = await svc.rpc("create_order", {
    p_customer: customer(n),
    p_items: [{ product_id: productId, quantity }],
  });
  if (res.data?.order_id) created.orders.push(res.data.order_id);
  return res;
}

const product = async (id) =>
  (await svc.from("products").select("stock, stock_reserved, available_stock").eq("id", id).single()).data;
const order = async (id) => (await svc.from("orders").select("*").eq("id", id).single()).data;
const pay = (orderId, paymentId, status, amount, providerStatus = status) =>
  svc.rpc("apply_payment", {
    p_order_id: orderId,
    p_provider_payment_id: `${tag}-${paymentId}`,
    p_status: status,
    p_provider_status: providerStatus,
    p_provider_status_detail: "check",
    p_amount: amount,
    p_payment_method: "visa",
    p_raw: {},
  });

async function main() {
  console.log("\n1. Estructura");
  const tables = [
    "admin_users", "departments", "store_settings", "shipping_rates", "products",
    "product_images", "orders", "order_items", "payments", "order_events",
  ];
  for (const t of tables) {
    const { error } = await svc.from(t).select("*", { head: true, count: "exact" }).limit(1);
    ok(`existe la tabla ${t}`, !error, error?.message);
  }
  const { data: deps } = await svc.from("departments").select("name");
  ok("están los 19 departamentos", deps?.length === 19, String(deps?.length));
  const bucket = await svc.storage.getBucket("product-images");
  ok(
    "bucket product-images: público, 5 MB, sin SVG",
    bucket.data?.public === true &&
      Number(bucket.data?.file_size_limit) === 5242880 &&
      !bucket.data?.allowed_mime_types?.includes("image/svg+xml"),
    JSON.stringify(bucket.error ?? bucket.data),
  );

  console.log("\n2. El público (clave pública) solo puede leer lo publicado");
  const visible = await anon
    .from("products")
    .select("id, slug, price, available_stock, product_images(image_url, position)")
    .eq("active", true)
    .is("archived_at", null);
  ok("lee productos publicados y sus fotos", !visible.error, visible.error?.message);
  const { count: publishedCount } = await svc
    .from("products")
    .select("*", { head: true, count: "exact" })
    .eq("active", true)
    .is("archived_at", null);
  ok(
    "ve exactamente los productos publicados",
    (visible.data?.length ?? -1) === publishedCount,
    `${visible.data?.length} vs ${publishedCount}`,
  );
  ok("NO puede leer el stock real", denied((await anon.from("products").select("stock")).error));
  ok("NO puede leer las reservas", denied((await anon.from("products").select("stock_reserved")).error));
  ok("NO puede hacer select *", denied((await anon.from("products").select("*")).error));
  for (const t of ["orders", "order_items", "payments", "order_events", "store_settings", "shipping_rates", "admin_users", "departments"]) {
    ok(`NO puede leer ${t}`, denied((await anon.from(t).select("*").limit(1)).error));
  }
  const ins = await anon
    .from("products")
    .insert({ name: "hack", slug: `${tag}-hack`, price: 1, category: "aros" });
  ok("NO puede crear productos", !!ins.error);
  const upd = await anon.from("products").update({ price: 1 }).eq("slug", "no-existe");
  ok("NO puede modificar productos", !!upd.error);
  const rpc = await anon.rpc("create_order", { p_customer: {}, p_items: [] });
  ok("NO puede crear pedidos por la API", !!rpc.error && !rpc.data);
  const rpc2 = await anon.rpc("apply_payment", {
    p_order_id: "00000000-0000-0000-0000-000000000000",
    p_provider_payment_id: "x",
    p_status: "approved",
    p_provider_status: "x",
    p_provider_status_detail: "x",
    p_amount: 1,
    p_payment_method: "x",
  });
  ok("NO puede registrar pagos por la API", !!rpc2.error && !rpc2.data);
  const up = await anon.storage
    .from("product-images")
    .upload(`${tag}.png`, new Blob(["x"], { type: "image/png" }), { contentType: "image/png" });
  ok("NO puede subir archivos al Storage", !!up.error);

  console.log("\n3. Stock bajo concurrencia (la última unidad)");
  const last = await mkProduct("ultima", 1);
  const [a, b] = await Promise.all([mkOrder(last, 1, 1), mkOrder(last, 1, 2)]);
  const wins = [a, b].filter((r) => !r.error);
  const losses = [a, b].filter((r) => r.error?.message === "insufficient_stock");
  ok("dos compradores simultáneos: solo uno se lleva la última unidad", wins.length === 1 && losses.length === 1,
    JSON.stringify([a.error?.message, b.error?.message]));
  let p = await product(last);
  ok("queda 1 reservada y 0 disponibles", p.stock_reserved === 1 && p.available_stock === 0, JSON.stringify(p));

  const many = await mkProduct("varias", 3);
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => mkOrder(many, 1, 10 + i)));
  const okCount = results.filter((r) => !r.error).length;
  ok("8 compras simultáneas con stock 3: exactamente 3 salen", okCount === 3, `salieron ${okCount}`);
  p = await product(many);
  ok("y nunca se reserva de más", p.stock_reserved === 3 && p.available_stock === 0, JSON.stringify(p));

  console.log("\n4. El precio lo decide la base, no el cliente");
  const priced = await mkProduct("precio", 5, 1490);
  const po = await mkOrder(priced, 2, 30);
  ok("subtotal = 1490 × 2", po.data?.subtotal === 2980, JSON.stringify(po.data ?? po.error));
  ok("total = subtotal + envío", po.data?.total === po.data?.subtotal + po.data?.shipping_cost);

  console.log("\n5. Pagos (verificados por el servidor) y stock");
  const winner = wins[0].data;
  let r = await pay(winner.order_id, "p1", "approved", winner.total + 1);
  ok("un monto distinto NO confirma el pedido", r.data?.became_paid === false && r.data?.attention_reason === "amount_mismatch",
    JSON.stringify(r.data ?? r.error));
  r = await pay(winner.order_id, "p2", "approved", winner.total);
  ok("el pago correcto confirma el pedido", r.data?.became_paid === true && r.data?.order_status === "paid", JSON.stringify(r.data ?? r.error));
  p = await product(last);
  ok("el stock baja de 1 a 0 y se libera la reserva", p.stock === 0 && p.stock_reserved === 0, JSON.stringify(p));
  r = await pay(winner.order_id, "p2", "approved", winner.total);
  ok("repetir el mismo webhook no confirma dos veces", r.data?.became_paid === false, JSON.stringify(r.data ?? r.error));
  p = await product(last);
  ok("…ni descuenta stock dos veces", p.stock === 0, JSON.stringify(p));

  console.log("\n6. Abandono: la reserva vence y el stock vuelve");
  const abandon = await mkProduct("abandono", 2);
  const ab = await mkOrder(abandon, 1, 40);
  await svc.from("orders").update({ reserved_until: new Date(Date.now() - 60_000).toISOString() }).eq("id", ab.data.order_id);
  const rel = await svc.rpc("release_expired_reservations");
  ok("libera reservas vencidas", !rel.error && rel.data >= 1, JSON.stringify(rel.data ?? rel.error));
  const abOrder = await order(ab.data.order_id);
  ok("el pedido abandonado queda cancelado ('expired')", abOrder.order_status === "cancelled" && abOrder.cancel_reason === "expired");
  p = await product(abandon);
  ok("el stock vuelve a estar disponible", p.stock_reserved === 0 && p.available_stock === 2, JSON.stringify(p));
  r = await pay(ab.data.order_id, "late", "approved", ab.data.total);
  ok("un pago tardío reactiva el pedido si hay stock", r.data?.became_paid === true, JSON.stringify(r.data ?? r.error));

  console.log("\n7. Errores esperados");
  const missing = await svc.rpc("create_order", {
    p_customer: customer(50),
    p_items: [{ product_id: "00000000-0000-0000-0000-000000000000", quantity: 1 }],
  });
  ok("producto inexistente → product_unavailable", missing.error?.message === "product_unavailable");
  const badDep = await svc.rpc("create_order", {
    p_customer: { ...customer(51), department: "Narnia" },
    p_items: [{ product_id: priced, quantity: 1 }],
  });
  ok("departamento inválido → invalid_department", badDep.error?.message === "invalid_department");

  console.log("\n8. Webhook completo (firma → pago → pedido → stock), sin llamar a Mercado Pago");
  {
    const wp = await mkProduct("webhook", 2, 1000);
    const wo = await mkOrder(wp, 1, 60);
    const secret = "secreto-de-prueba";
    const paymentId = String(Date.now());
    const sign = (id, requestId, s = secret) => {
      const ts = String(Date.now());
      const v1 = createHmac("sha256", s).update(`id:${id};request-id:${requestId};ts:${ts};`).digest("hex");
      return new Headers({ "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId });
    };
    const paid = [];
    const deps = (over = {}) => ({
      secret,
      db: svc,
      onPaid: async (id) => paid.push(id),
      fetchPayment: async () => ({
        id: paymentId,
        status: "approved",
        external_reference: wo.data.order_id,
        transaction_amount: wo.data.total,
        currency_id: "UYU",
        payment_method_id: "visa",
        payment_type_id: "credit_card",
        fee_details: [{ amount: 6, fee_payer: "collector", type: "mercadopago_fee" }],
        transaction_details: { net_received_amount: wo.data.total - 6 },
      }),
      ...over,
    });
    const hook = (headers, over) =>
      handleWebhook(
        {
          url: `https://tienda.example/api/webhooks/mercadopago?data.id=${paymentId}&type=payment`,
          headers,
          body: { type: "payment", data: { id: paymentId } },
        },
        deps(over),
      );

    let res = await hook(sign(paymentId, "r1", "secreto-falso"));
    ok("una notificación con firma falsa se rechaza (401) y no cambia nada", res.status === 401 && (await order(wo.data.order_id)).order_status === "awaiting_payment");

    res = await hook(sign(paymentId, "r2"));
    ok("notificación firmada: 200 y el pedido queda pagado", res.status === 200 && res.body.became_paid === true, JSON.stringify(res));
    const wOrder = await order(wo.data.order_id);
    ok("…estado, método y stock correctos", wOrder.order_status === "paid" && wOrder.payment_status === "approved" && wOrder.stock_status === "committed");
    p = await product(wp);
    ok("…el stock baja de 2 a 1 y no queda reserva", p.stock === 1 && p.stock_reserved === 0, JSON.stringify(p));
    ok("…se avisó UNA vez que se pagó", paid.length === 1 && paid[0] === wo.data.order_id);

    res = await hook(sign(paymentId, "r3"));
    ok("el reintento de Mercado Pago es idempotente", res.status === 200 && res.body.became_paid === false && paid.length === 1);
    p = await product(wp);
    ok("…y no descuenta stock otra vez", p.stock === 1, JSON.stringify(p));

    const { data: pays } = await svc.from("payments").select("provider_payment_id, status, amount, raw").eq("order_id", wo.data.order_id);
    ok("un solo registro de pago, con monto y metadatos mínimos",
      pays?.length === 1 && Number(pays[0].amount) === wo.data.total && !JSON.stringify(pays[0].raw).includes("payer"),
      JSON.stringify(pays));
    ok("…con la comisión y el neto de Mercado Pago (para la sección Ventas)",
      pays?.[0]?.raw?.fee_amount === 6 && pays?.[0]?.raw?.net_received_amount === wo.data.total - 6,
      JSON.stringify(pays?.[0]?.raw));

    res = await hook(sign(paymentId, "r4"), { fetchPayment: async () => null });
    ok("un pago que Mercado Pago no conoce se ignora sin error (200)", res.status === 200 && res.body.ignored === "payment_not_found");

    // Emails (con un "Resend" simulado: no se envía nada de verdad)
    const sentMails = [];
    const emailDeps = (over = {}) => ({
      db: svc,
      loadOrder: (id) => loadOrderForEmail(svc, id),
      mailer: async (m) => (sentMails.push(m), { ok: true, id: "simulado" }),
      ctx: { siteName: "Maitena Joyas", siteUrl: "https://tienda.example", contact: { email: null, whatsapp: null, instagram: null } },
      adminEmail: "admin@example.com",
      ...over,
    });
    const [e1, e2, e3] = await Promise.all([1, 2, 3].map(() => notifyOrderPaid(wo.data.order_id, emailDeps())));
    const outcomes = [e1, e2, e3].flatMap((r) => [r.confirmation, r.admin]);
    ok("3 avisos simultáneos de 'pagado': cada email sale UNA sola vez", sentMails.length === 2 && outcomes.filter((o) => o === "sent").length === 2, JSON.stringify(outcomes));
    ok("…el comprador y el administrador reciben cada uno el suyo", sentMails.some((m) => m.to === "check+60@example.com") && sentMails.some((m) => m.to === "admin@example.com"));
    const marks = await order(wo.data.order_id);
    ok("…y quedan registradas las marcas de envío en el pedido", !!marks.confirmation_email_sent_at && !!marks.admin_notified_at);
    const again = await notifyOrderPaid(wo.data.order_id, emailDeps());
    ok("repetir no vuelve a enviar", again.confirmation === "already_sent" && again.admin === "already_sent" && sentMails.length === 2);
    await svc.rpc("unclaim_order_email", { p_order_id: wo.data.order_id, p_kind: "confirmation" });
    const failing = await notifyOrderPaid(wo.data.order_id, emailDeps({ mailer: async () => ({ ok: false, error: "caído" }) }));
    const afterFail = await order(wo.data.order_id);
    ok("si el envío falla se libera la marca para reintentar", failing.confirmation === "failed" && afterFail.confirmation_email_sent_at === null);
    const retried = await notifyOrderPaid(wo.data.order_id, emailDeps());
    ok("…y el reintento lo envía", retried.confirmation === "sent" && sentMails.length === 3);
    const unpaid = await mkOrder(await mkProduct("email-sin-pagar", 1), 1, 61);
    const blocked = await notifyOrderPaid(unpaid.data.order_id, emailDeps());
    ok("un pedido SIN pagar no recibe email de confirmación", blocked.confirmation === "order_not_ready" && sentMails.length === 3);
  }

  console.log("\n9. Administración: lo que el panel usa en el servidor");
  {
    const ap = await mkProduct("admin", 3, 1000);
    const unpaid = await mkOrder(ap, 1, 70);
    const early = await svc.from("orders").update({ order_status: "shipped" }).eq("id", unpaid.data.order_id);
    ok("no se puede marcar como enviado un pedido sin pago aprobado", early.error?.message === "order_not_paid", JSON.stringify(early.error));

    const paidOrder = await mkOrder(ap, 1, 71);
    await pay(paidOrder.data.order_id, "adm", "approved", paidOrder.data.total);
    const guarded = (from, patch) =>
      svc.from("orders").update(patch).eq("id", paidOrder.data.order_id).in("order_status", from).select("id");

    const ship = {
      order_status: "shipped",
      tracking_company: "DAC",
      tracking_number: "ZZ123",
      tracking_url: "https://example.com/seguimiento",
    };
    let step = await guarded(["paid", "preparing"], ship);
    const shipped = await order(paidOrder.data.order_id);
    ok("pago confirmado → enviado con seguimiento y fecha de envío", step.data?.length === 1 && shipped.order_status === "shipped" && !!shipped.shipped_at && shipped.tracking_number === "ZZ123", JSON.stringify(step.error));
    step = await guarded(["paid", "preparing"], ship);
    ok("un pedido ya enviado no se vuelve a despachar (doble clic)", step.data?.length === 0);
    step = await guarded(["shipped"], { order_status: "delivered" });
    const delivered = await order(paidOrder.data.order_id);
    ok("enviado → entregado con fecha de entrega", step.data?.length === 1 && delivered.order_status === "delivered" && !!delivered.delivered_at, JSON.stringify(step.error));

    const cancelPaid = await mkOrder(ap, 1, 72);
    await pay(cancelPaid.data.order_id, "adm2", "approved", cancelPaid.data.total);
    let stock = await product(ap);
    ok("(antes de cancelar) stock descontado por la venta pagada", stock.stock === 1, JSON.stringify(stock));
    const cancelled = await svc.rpc("cancel_order", { p_order_id: cancelPaid.data.order_id, p_restock: true, p_reason: "admin" });
    const co = await order(cancelPaid.data.order_id);
    stock = await product(ap);
    ok("cancelar un pedido pagado devuelve el stock", cancelled.data === true && stock.stock === 2, JSON.stringify(stock));
    ok("…lo deja cancelado y marcado: falta reintegrar el dinero", co.order_status === "cancelled" && co.needs_attention === true && co.attention_reason === "refund_pending", JSON.stringify(co));
    const again = await svc.rpc("cancel_order", { p_order_id: cancelPaid.data.order_id, p_restock: true, p_reason: "admin" });
    stock = await product(ap);
    ok("cancelar dos veces no devuelve stock dos veces", again.data === false && stock.stock === 2, JSON.stringify(stock));

    const denyAnon = async (name, call) => {
      const res = await call;
      ok(`el público NO puede ${name}`, !!res.error || (Array.isArray(res.data) && res.data.length === 0));
    };
    await denyAnon("cambiar los ajustes de envío", anon.from("store_settings").update({ shipping_default_cost: 0 }).eq("id", true).select());
    await denyAnon("crear tarifas de envío", anon.from("shipping_rates").insert({ department: "Salto", cost: 1 }).select());
    await denyAnon("modificar pedidos", anon.from("orders").update({ admin_notes: "x" }).eq("id", paidOrder.data.order_id).select());
    await denyAnon("modificar fotos de productos", anon.from("product_images").update({ position: 9 }).eq("product_id", ap).select());
    await denyAnon("cancelar pedidos por la API", anon.rpc("cancel_order", { p_order_id: paidOrder.data.order_id }));
    await denyAnon("reclamar emails por la API", anon.rpc("claim_order_email", { p_order_id: paidOrder.data.order_id, p_kind: "shipping" }));
  }

  console.log("\n10. Recordatorios de configuración (no son fallas)");
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey } });
    const cfg = await res.json();
    console.log(
      `  ${cfg.disable_signup ? "✓" : "•"} Registro público de usuarios ${cfg.disable_signup ? "desactivado" : "ACTIVADO: desactivalo en Authentication → Sign In / Providers (nadie debería poder crear cuentas)"}`,
    );
  } catch {
    console.log("  • No se pudo comprobar si el registro público de usuarios está desactivado.");
  }
  const { data: settings } = await svc.from("store_settings").select("shipping_configured").single();
  console.log(`  ${settings?.shipping_configured ? "✓" : "•"} Costos de envío ${settings?.shipping_configured ? "configurados" : "SIN configurar (se cargan desde /admin)"}`);
  const { count: admins } = await svc.from("admin_users").select("*", { head: true, count: "exact" });
  console.log(`  ${admins ? "✓" : "•"} Administradores: ${admins ?? 0}${admins ? "" : " (falta crear el usuario admin, ver supabase/README.md)"}`);
  const { count: demos } = await svc
    .from("products")
    .select("*", { head: true, count: "exact" })
    .eq("is_demo", true)
    .not("slug", "like", "zz-check-%");
  console.log(`  ${demos ? "•" : "✓"} Productos demo cargados: ${demos ?? 0}${demos ? " (se eliminan desde /admin cuando cargues los reales)" : ""}`);
}

async function cleanup() {
  if (created.orders.length) {
    await svc.from("payments").delete().in("order_id", created.orders);
    await svc.from("orders").delete().in("id", created.orders);
  }
  if (created.products.length) {
    await svc.from("products").delete().in("id", created.products);
  }
  await svc.storage.from("product-images").remove([`${tag}.png`]);
}

try {
  await main();
} catch (e) {
  failed++;
  console.error("\nError inesperado:", e.message);
} finally {
  await cleanup().catch((e) => console.error("No se pudo limpiar los datos de prueba:", e.message));
}

console.log(`\nResultado: ${passed} ✓  ${failed} ✗\n`);
process.exitCode = failed ? 1 : 0;
