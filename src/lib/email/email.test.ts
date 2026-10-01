import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { notifyOrderPaid, notifyOrderShipped, type NotifyDeps } from "./notify.ts";
import { adminSaleEmail, confirmationEmail, escapeHtml, safeUrl, shippedEmail } from "./templates.ts";
import type { EmailContext, EmailOrder, OutgoingEmail } from "./types.ts";

const ctx: EmailContext = {
  siteName: "Maitena Joyas",
  siteUrl: "https://maitena.example",
  contact: { email: "hola@maitena.example", whatsapp: "59899123456", instagram: "maitena.joyas" },
};

const order = (over: Partial<EmailOrder> = {}): EmailOrder => ({
  id: "0b7c1f0e-5d3a-4c39-9b0e-5c1b6f6f8a11",
  orderNumber: 1036,
  publicToken: "5e1e0c3a-1111-4222-8333-944444444444",
  orderStatus: "paid",
  paymentStatus: "approved",
  customerName: "Ana",
  customerLastName: "Pérez",
  customerEmail: "ana@example.com",
  customerPhone: "099 123 456",
  department: "Salto",
  city: "Salto",
  address: "Uruguay",
  doorNumber: "1234",
  apartment: "2B",
  postalCode: "50000",
  notes: "Timbre roto, llamar",
  subtotal: 3680,
  shippingCost: 250,
  total: 3930,
  createdAt: "2026-09-30T22:17:39.000Z",
  paidAt: "2026-09-30T22:18:22.000Z",
  tracking: { company: null, number: null, url: null },
  needsAttention: false,
  attentionReason: null,
  items: [
    { name: "Anillo Solitario", quantity: 2, unitPrice: 1490, subtotal: 2980 },
    { name: "Aros Botón", quantity: 1, unitPrice: 700, subtotal: 700 },
  ],
  ...over,
});

describe("plantillas", () => {
  it("confirmación al comprador: asunto, número, productos, total, envío y mensaje pedido", () => {
    const m = confirmationEmail(order(), ctx);
    assert.equal(m.subject, "Recibimos tu compra — Maitena Joyas");
    for (const s of ["#1036", "Anillo Solitario", "Aros Botón", "× 2", "$&nbsp;3.930", "Uruguay 1234", "apto. 2B", "Salto, Salto"]) {
      assert.ok(m.html.includes(s.replace("$&nbsp;", "$ ")) || m.html.includes(s), `falta: ${s}`);
    }
    assert.ok(m.html.includes("Estamos preparando tu pedido. En breve recibirás otro correo con los datos de seguimiento una vez que sea despachado."));
    assert.ok(m.html.includes("https://maitena.example/pedido/5e1e0c3a-1111-4222-8333-944444444444"));
    assert.ok(m.html.includes("Pago confirmado"));
    assert.ok(m.text.includes("Total: $ 3.930") && m.text.includes("#1036"));
  });

  it("aviso de venta al administrador: asunto, cliente completo, dirección y enlace al panel", () => {
    const m = adminSaleEmail(order(), ctx);
    assert.equal(m.subject, "Nueva venta en Maitena Joyas — Pedido #1036 ($ 3.930)");
    for (const s of ["ana@example.com", "099 123 456", "Ana", "Pérez", "Anillo Solitario", "Timbre roto, llamar", "Salto"]) {
      assert.ok(m.html.includes(s), `falta: ${s}`);
    }
    assert.ok(m.html.includes("https://maitena.example/admin/pedidos/0b7c1f0e-5d3a-4c39-9b0e-5c1b6f6f8a11"));
    assert.ok(!m.html.includes("requiere tu atención"));
    assert.ok(adminSaleEmail(order({ needsAttention: true, attentionReason: "stock_shortfall" }), ctx).html.includes("requiere tu atención"));
  });

  it("envío: muestra código, empresa y botón de seguimiento solo si hay URL válida", () => {
    const full = shippedEmail(
      order({ orderStatus: "shipped", tracking: { company: "DAC", number: "UY123456789", url: "https://www.dac.com.uy/track?c=UY1" } }),
      ctx,
    );
    assert.equal(full.subject, "Tu pedido fue enviado — Maitena Joyas");
    for (const s of ["DAC", "UY123456789", "Seguir mi envío", "https://www.dac.com.uy/track?c=UY1", "#1036"]) assert.ok(full.html.includes(s), s);

    const noUrl = shippedEmail(order({ orderStatus: "shipped", tracking: { company: null, number: "UY1", url: null } }), ctx);
    assert.ok(noUrl.html.includes("UY1") && !noUrl.html.includes("Seguir mi envío"));
    const noTracking = shippedEmail(order({ orderStatus: "shipped" }), ctx);
    assert.ok(noTracking.html.includes("Tu pedido fue enviado") && !noTracking.html.includes("Código de seguimiento"));
  });

  it("escapa todo lo que escribe el comprador (nada de HTML ni scripts inyectados)", () => {
    const evil = order({
      customerName: '<img src=x onerror="alert(1)">',
      customerLastName: "<script>alert(2)</script>",
      address: "Calle & \"Co\" <b>1</b>",
      notes: '<a href="javascript:alert(3)">click</a>',
      items: [{ name: "<svg onload=alert(4)>", quantity: 1, unitPrice: 1, subtotal: 1 }],
    });
    for (const m of [confirmationEmail(evil, ctx), adminSaleEmail(evil, ctx), shippedEmail(order({ ...evil, orderStatus: "shipped" }), ctx)]) {
      assert.ok(!/<script/i.test(m.html) && !/<img src=x/i.test(m.html) && !/<svg onload/i.test(m.html), "no debe haber etiquetas inyectadas");
      assert.ok(!m.html.includes('<a href="javascript:'), "no debe haber enlaces javascript:");
    }
    assert.ok(confirmationEmail(evil, ctx).html.includes("&lt;script&gt;"));
  });

  it("los enlaces de seguimiento solo pueden ser http(s)", () => {
    assert.equal(safeUrl("javascript:alert(1)"), null);
    assert.equal(safeUrl("data:text/html,x"), null);
    assert.equal(safeUrl("no es url"), null);
    assert.equal(safeUrl(null), null);
    assert.ok(safeUrl("https://dac.com.uy/x"));
    const m = shippedEmail(order({ orderStatus: "shipped", tracking: { company: "X", number: "1", url: "javascript:alert(1)" } }), ctx);
    assert.ok(!m.html.includes("javascript:") && !m.html.includes("Seguir mi envío"));
  });

  it("escapeHtml", () => {
    assert.equal(escapeHtml(`<a href="x">&'</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
  });

  it("contactos de la tienda: solo se muestran los configurados", () => {
    const sin = confirmationEmail(order(), { ...ctx, contact: { email: null, whatsapp: null, instagram: null } });
    assert.ok(!sin.html.includes("¿Dudas?"));
    assert.ok(confirmationEmail(order(), ctx).html.includes("¿Dudas?"));
  });
});

// ── Orquestación (sin red: base y Resend simulados) ──────────────────

function harness(over: Partial<NotifyDeps> & { failFirstSend?: boolean; o?: EmailOrder | null } = {}) {
  const claimed = new Set<string>();
  const sent: OutgoingEmail[] = [];
  const logs: string[] = [];
  let sends = 0;
  const deps: NotifyDeps = {
    db: {
      rpc: async (fn, args) => {
        const key = `${args.p_kind}`;
        if (fn === "claim_order_email") {
          if (claimed.has(key)) return { data: false, error: null };
          claimed.add(key);
          return { data: true, error: null };
        }
        if (fn === "unclaim_order_email") {
          claimed.delete(key);
          return { data: null, error: null };
        }
        return { data: null, error: { message: "rpc inesperada" } };
      },
    },
    loadOrder: async () => (over.o === undefined ? order() : over.o),
    mailer: async (email) => {
      sends += 1;
      if (over.failFirstSend && sends === 1) return { ok: false, error: "Resend caído" };
      sent.push(email);
      return { ok: true, id: `id-${sends}` };
    },
    ctx,
    adminEmail: "dueña@maitena.example",
    log: (level, message) => logs.push(`${level}: ${message}`),
    ...over,
  };
  return { deps, sent, claimed, logs };
}

describe("envío de emails de un pedido", () => {
  it("al pagarse envía la confirmación al comprador Y el aviso al administrador", async () => {
    const { deps, sent } = harness();
    const r = await notifyOrderPaid("x", deps);
    assert.deepEqual(r, { confirmation: "sent", admin: "sent" });
    assert.equal(sent.length, 2);
    assert.equal(sent[0].to, "ana@example.com");
    assert.match(sent[0].subject, /Recibimos tu compra/);
    assert.equal(sent[1].to, "dueña@maitena.example");
    assert.match(sent[1].subject, /Nueva venta/);
    assert.equal(sent[0].replyTo, "hola@maitena.example");
  });

  it("no duplica: llamar de nuevo (reintento del webhook, recarga de la página) no envía otra vez", async () => {
    const { deps, sent } = harness();
    await notifyOrderPaid("x", deps);
    const again = await notifyOrderPaid("x", deps);
    assert.deepEqual(again, { confirmation: "already_sent", admin: "already_sent" });
    assert.equal(sent.length, 2);
  });

  it("dos llamadas simultáneas envían cada email UNA sola vez", async () => {
    const { deps, sent } = harness();
    await Promise.all([notifyOrderPaid("x", deps), notifyOrderPaid("x", deps), notifyOrderPaid("x", deps)]);
    assert.equal(sent.length, 2);
  });

  it("si el envío falla se libera la marca y el reintento lo envía", async () => {
    const { deps, sent, logs } = harness({ failFirstSend: true });
    const first = await notifyOrderPaid("x", deps);
    assert.equal(first.confirmation, "failed");
    assert.equal(first.admin, "sent", "el fallo de uno no bloquea al otro");
    assert.ok(logs.some((l) => l.includes("Falló el envío")));
    const retry = await notifyOrderPaid("x", deps);
    assert.deepEqual(retry, { confirmation: "sent", admin: "already_sent" });
    assert.equal(sent.length, 2);
  });

  it("sin servicio de email configurado no envía ni reclama (se enviará cuando se configure)", async () => {
    const { deps, claimed } = harness({ mailer: null });
    assert.deepEqual(await notifyOrderPaid("x", deps), { confirmation: "not_configured", admin: "not_configured" });
    assert.equal(claimed.size, 0);
  });

  it("sin email de administrador solo envía al comprador", async () => {
    const { deps, sent } = harness({ adminEmail: undefined });
    const r = await notifyOrderPaid("x", deps);
    assert.deepEqual(r, { confirmation: "sent", admin: "no_recipient" });
    assert.equal(sent.length, 1);
  });

  it("NUNCA envía confirmación de un pedido que no está pagado", async () => {
    for (const o of [
      order({ orderStatus: "awaiting_payment", paymentStatus: "pending" }),
      order({ orderStatus: "cancelled", paymentStatus: "cancelled" }),
      order({ orderStatus: "paid", paymentStatus: "rejected" }),
    ]) {
      const { deps, sent } = harness({ o });
      assert.deepEqual(await notifyOrderPaid("x", deps), { confirmation: "order_not_ready", admin: "order_not_ready" });
      assert.equal(sent.length, 0);
    }
    const { deps } = harness({ o: null });
    assert.equal((await notifyOrderPaid("x", deps)).confirmation, "order_not_ready");
  });

  it("modo prueba: todo va a una sola dirección, con el asunto marcado", async () => {
    const { deps, sent } = harness({ redirectTo: "yo@gmail.com" });
    await notifyOrderPaid("x", deps);
    assert.ok(sent.every((e) => e.to === "yo@gmail.com"));
    assert.match(sent[0].subject, /^\[PRUEBA · para ana@example\.com\] Recibimos tu compra/);
  });

  it("email de envío: solo si el pedido está enviado, y una sola vez", async () => {
    const shipped = order({ orderStatus: "shipped", tracking: { company: "DAC", number: "UY1", url: null } });
    const { deps, sent } = harness({ o: shipped });
    assert.equal(await notifyOrderShipped("x", deps), "sent");
    assert.equal(await notifyOrderShipped("x", deps), "already_sent");
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "ana@example.com");
    assert.match(sent[0].subject, /Tu pedido fue enviado/);

    const { deps: d2 } = harness({ o: order({ orderStatus: "paid" }) });
    assert.equal(await notifyOrderShipped("x", d2), "order_not_ready");
  });

  it("usa una clave de idempotencia estable por pedido y tipo", async () => {
    const { deps, sent } = harness();
    await notifyOrderPaid("x", deps);
    assert.deepEqual(sent.map((e) => e.idempotencyKey), [
      "confirmation-0b7c1f0e-5d3a-4c39-9b0e-5c1b6f6f8a11",
      "admin-0b7c1f0e-5d3a-4c39-9b0e-5c1b6f6f8a11",
    ]);
  });
});
