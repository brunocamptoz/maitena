import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { handleWebhook, type WebhookDeps } from "./webhook.ts";
import type { MpPayment } from "./process.ts";

const SECRET = "test-secret";
const ORDER_ID = "0b7c1f0e-5d3a-4c39-9b0e-5c1b6f6f8a11";

/** Firma como la calcula Mercado Pago: HMAC-SHA256 del manifiesto `id:…;request-id:…;ts:…;`. */
function signed(
  dataId: string,
  extra = "type=payment",
  { secret = SECRET, requestId = "req-1" } = {},
): { url: string; headers: Headers; body: unknown } {
  const ts = String(Date.now());
  const v1 = createHmac("sha256", secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
  return {
    url: `https://maitena.example/api/webhooks/mercadopago?data.id=${dataId}&${extra}`,
    headers: new Headers({ "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId }),
    body: { type: "payment", data: { id: dataId } },
  };
}

type Call = { fn: string; args: Record<string, unknown> };

function makeDeps(over: Partial<WebhookDeps> & { payment?: MpPayment | null; rpcResult?: unknown; rpcError?: string } = {}) {
  const calls: Call[] = [];
  const paid: string[] = [];
  const logs: string[] = [];
  const deps: WebhookDeps = {
    secret: SECRET,
    fetchPayment: async () =>
      over.payment === undefined
        ? { id: 123, status: "approved", external_reference: ORDER_ID, transaction_amount: 2980, currency_id: "UYU" }
        : over.payment,
    db: {
      rpc: async (fn, args) => {
        calls.push({ fn, args });
        if (over.rpcError) return { data: null, error: { message: over.rpcError } };
        return {
          data: over.rpcResult ?? { became_paid: true, needs_attention: false, order_status: "paid" },
          error: null,
        };
      },
    },
    onPaid: async (orderId) => {
      paid.push(orderId);
    },
    log: (level, message) => logs.push(`${level}: ${message}`),
    ...over,
  };
  return { deps, calls, paid, logs };
}

describe("webhook de Mercado Pago", () => {
  it("rechaza con 401 una firma falsificada y no toca la base", async () => {
    const req = signed("123", "type=payment", { secret: "otro-secreto" });
    const { deps, calls } = makeDeps();
    const res = await handleWebhook(req, deps);
    assert.equal(res.status, 401);
    assert.equal(calls.length, 0);
  });

  it("acepta la clave aunque venga con espacios o saltos de línea de más (error típico al copiar)", async () => {
    const { deps } = makeDeps({ secret: `  ${SECRET}
` });
    assert.equal((await handleWebhook(signed("123"), deps)).status, 200);
  });

  it("rechaza con 401 si falta la firma", async () => {
    const { deps, calls } = makeDeps();
    const res = await handleWebhook(
      { url: "https://x.example/api?data.id=123&type=payment", headers: new Headers(), body: {} },
      deps,
    );
    assert.equal(res.status, 401);
    assert.equal(calls.length, 0);
  });

  it("rechaza con 401 si el data.id de la URL fue cambiado después de firmar", async () => {
    const req = signed("123");
    req.url = req.url.replace("data.id=123", "data.id=999");
    const { deps, calls } = makeDeps();
    assert.equal((await handleWebhook(req, deps)).status, 401);
    assert.equal(calls.length, 0);
  });

  it("devuelve 500 si no hay secreto configurado (para que MP reintente y se note)", async () => {
    const { deps } = makeDeps({ secret: undefined });
    assert.equal((await handleWebhook(signed("123"), deps)).status, 500);
  });

  it("camino feliz: consulta el pago real, lo aplica y avisa UNA vez que se pagó", async () => {
    const { deps, calls, paid } = makeDeps();
    const res = await handleWebhook(signed("123"), deps);
    assert.equal(res.status, 200);
    assert.equal(res.body.became_paid, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].fn, "apply_payment");
    assert.equal(calls[0].args.p_order_id, ORDER_ID);
    assert.equal(calls[0].args.p_status, "approved");
    assert.equal(calls[0].args.p_amount, 2980);
    assert.equal(calls[0].args.p_provider_payment_id, "123");
    assert.deepEqual(paid, [ORDER_ID]);
  });

  it("NO confía en el cuerpo: usa lo que informa la API de Mercado Pago", async () => {
    const req = signed("123");
    req.body = { type: "payment", data: { id: "123" }, status: "approved", transaction_amount: 1 };
    const { deps, calls } = makeDeps({ payment: { id: 123, status: "rejected", external_reference: ORDER_ID, transaction_amount: 2980, currency_id: "UYU" } });
    await handleWebhook(req, deps);
    assert.equal(calls[0].args.p_status, "rejected");
    assert.equal(calls[0].args.p_amount, 2980);
  });

  it("un reintento (el pedido ya estaba pagado) no vuelve a disparar acciones", async () => {
    const { deps, paid } = makeDeps({ rpcResult: { became_paid: false, order_status: "paid" } });
    const res = await handleWebhook(signed("123"), deps);
    assert.equal(res.status, 200);
    assert.deepEqual(paid, []);
  });

  it("ignora (200) eventos que no son de pagos", async () => {
    const req = signed("123", "type=merchant_order");
    req.body = { type: "merchant_order" };
    const { deps, calls } = makeDeps();
    const res = await handleWebhook(req, deps);
    assert.equal(res.status, 200);
    assert.equal(res.body.ignored, "not_a_payment_event");
    assert.equal(calls.length, 0);
  });

  it("ignora (200) un pago que no existe, ej. simulaciones del panel", async () => {
    const { deps, calls } = makeDeps({ payment: null });
    const res = await handleWebhook(signed("123456"), deps);
    assert.equal(res.status, 200);
    assert.equal(res.body.ignored, "payment_not_found");
    assert.equal(calls.length, 0);
  });

  it("ignora (200) un pago sin referencia a un pedido nuestro", async () => {
    const { deps, calls } = makeDeps({ payment: { id: 1, status: "approved", transaction_amount: 10, currency_id: "UYU" } });
    const res = await handleWebhook(signed("1"), deps);
    assert.equal(res.status, 200);
    assert.equal(res.body.ignored, "no_order_reference");
    assert.equal(calls.length, 0);
  });

  it("ignora (200) un pago en otra moneda: no puede confirmar un pedido en pesos", async () => {
    const { deps, calls } = makeDeps({ payment: { id: 1, status: "approved", external_reference: ORDER_ID, transaction_amount: 10, currency_id: "USD" } });
    const res = await handleWebhook(signed("1"), deps);
    assert.equal(res.body.ignored, "unexpected_currency");
    assert.equal(calls.length, 0);
  });

  it("ignora (200) un pago de un pedido inexistente", async () => {
    const { deps } = makeDeps({ rpcError: "order_not_found" });
    const res = await handleWebhook(signed("123"), deps);
    assert.equal(res.status, 200);
    assert.equal(res.body.ignored, "unknown_order");
  });

  it("500 si Mercado Pago no responde (para que reintente)", async () => {
    const { deps, calls } = makeDeps({
      fetchPayment: async () => {
        throw new Error("timeout");
      },
    });
    assert.equal((await handleWebhook(signed("123"), deps)).status, 500);
    assert.equal(calls.length, 0);
  });

  it("500 si la base falla al aplicar el pago (para que reintente)", async () => {
    const { deps } = makeDeps({ rpcError: "connection reset" });
    assert.equal((await handleWebhook(signed("123"), deps)).status, 500);
  });

  it("200 aunque falle la acción posterior al pago (emails, etc.): el pago ya quedó registrado", async () => {
    const { deps } = makeDeps({
      onPaid: async () => {
        throw new Error("Resend caído");
      },
    });
    assert.equal((await handleWebhook(signed("123"), deps)).status, 200);
  });

  it("los pagos pendientes / en revisión no confirman nada", async () => {
    const { deps, calls } = makeDeps({
      payment: { id: 7, status: "in_process", external_reference: ORDER_ID, transaction_amount: 2980, currency_id: "UYU" },
      rpcResult: { became_paid: false, order_status: "awaiting_payment" },
    });
    await handleWebhook(signed("7"), deps);
    assert.equal(calls[0].args.p_status, "pending");
  });

  it("solo se guardan metadatos mínimos del pago (nada del pagador ni de la tarjeta)", async () => {
    const { deps, calls } = makeDeps({
      payment: {
        id: 5, status: "approved", external_reference: ORDER_ID, transaction_amount: 2980, currency_id: "UYU",
        payment_method_id: "visa", payment_type_id: "credit_card",
        // @ts-expect-error datos que NO deben persistirse aunque Mercado Pago los envíe
        payer: { email: "x@y.com", identification: { number: "123" } }, card: { last_four_digits: "1234" },
      },
    });
    await handleWebhook(signed("5"), deps);
    const raw = JSON.stringify(calls[0].args.p_raw);
    for (const leak of ["payer", "x@y.com", "identification", "last_four_digits", "\"card\""]) {
      assert.ok(!raw.includes(leak), `no debe guardarse: ${leak}`);
    }
  });
});
