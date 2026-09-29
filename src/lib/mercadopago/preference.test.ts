import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPreferenceBody, isPublicHttpsUrl, toMercadoPagoDate, type PreferenceInput } from "./preference.ts";
import { mapPaymentStatus } from "./status.ts";

const settings = {
  currency: "UYU",
  binaryMode: true,
  excludedPaymentTypes: ["ticket"],
  statementDescriptor: "MAITENA JOYAS",
} as const;

const base: PreferenceInput = {
  orderId: "0b7c1f0e-5d3a-4c39-9b0e-5c1b6f6f8a11",
  orderNumber: 1001,
  publicToken: "5e1e0c3a-1111-4222-8333-944444444444",
  items: [
    { productId: "p1", name: "Anillo Solitario", quantity: 2, unitPrice: 1490 },
    { productId: "p2", name: "Aros Botón", quantity: 1, unitPrice: 790 },
  ],
  shippingCost: 200,
  shippingLabel: "Envío a Salto",
  customer: { name: "Ana", lastName: "Pérez", email: "ana@example.com" },
  now: new Date("2026-09-30T15:00:00.000Z"),
  reservedUntil: new Date("2026-09-30T15:30:00.000Z"),
  siteUrl: "https://maitena.example",
};

describe("preferencia de Checkout Pro", () => {
  it("el total de la preferencia coincide con el del pedido (productos + envío)", () => {
    const body = buildPreferenceBody(base, settings);
    const total = body.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    assert.equal(total, 2 * 1490 + 790 + 200);
    assert.ok(body.items.every((i) => i.currency_id === "UYU"));
  });

  it("agrega el envío como línea aparte y la omite si es gratis", () => {
    assert.equal(buildPreferenceBody(base, settings).items.at(-1)?.id, "shipping");
    const free = buildPreferenceBody({ ...base, shippingCost: 0 }, settings);
    assert.ok(!free.items.some((i) => i.id === "shipping"));
  });

  it("vincula el pago con el pedido por external_reference", () => {
    assert.equal(buildPreferenceBody(base, settings).external_reference, base.orderId);
  });

  it("excluye el efectivo, usa modo binario y descriptor", () => {
    const body = buildPreferenceBody(base, settings);
    assert.deepEqual(body.payment_methods?.excluded_payment_types, [{ id: "ticket" }]);
    assert.equal(body.binary_mode, true);
    assert.equal(body.statement_descriptor, "MAITENA JOYAS");
  });

  it("la preferencia vence junto con la reserva de stock (huso de Uruguay)", () => {
    const body = buildPreferenceBody(base, settings);
    assert.equal(body.expires, true);
    assert.equal(body.expiration_date_from, "2026-09-30T12:00:00.000-03:00");
    assert.equal(body.expiration_date_to, "2026-09-30T12:30:00.000-03:00");
  });

  it("con un sitio público agrega regreso a la tienda, auto_return y webhook", () => {
    const body = buildPreferenceBody(base, settings);
    const orderUrl = `https://maitena.example/pedido/${base.publicToken}`;
    assert.deepEqual(body.back_urls, { success: orderUrl, pending: orderUrl, failure: orderUrl });
    assert.equal(body.auto_return, "approved");
    assert.equal(body.notification_url, "https://maitena.example/api/webhooks/mercadopago");
  });

  it("en localhost omite las URLs (Mercado Pago no las acepta)", () => {
    const body = buildPreferenceBody({ ...base, siteUrl: "http://localhost:3000" }, settings);
    assert.equal(body.back_urls, undefined);
    assert.equal(body.auto_return, undefined);
    assert.equal(body.notification_url, undefined);
  });

  it("no manda datos personales innecesarios (solo nombre, apellido y email del comprador)", () => {
    const body = buildPreferenceBody(base, settings);
    assert.deepEqual(Object.keys(body.payer ?? {}).sort(), ["email", "name", "surname"]);
  });

  it("isPublicHttpsUrl", () => {
    assert.equal(isPublicHttpsUrl("https://maitena.com.uy"), true);
    assert.equal(isPublicHttpsUrl("http://maitena.com.uy"), false);
    assert.equal(isPublicHttpsUrl("https://localhost:3000"), false);
    assert.equal(isPublicHttpsUrl("https://127.0.0.1"), false);
    assert.equal(isPublicHttpsUrl("no es una url"), false);
  });

  it("toMercadoPagoDate usa UTC-3", () => {
    assert.equal(toMercadoPagoDate(new Date("2026-01-01T02:00:00.000Z")), "2025-12-31T23:00:00.000-03:00");
  });
});

describe("estado de pago", () => {
  it("traduce los estados de Mercado Pago a los propios", () => {
    assert.equal(mapPaymentStatus("approved"), "approved");
    assert.equal(mapPaymentStatus("rejected"), "rejected");
    assert.equal(mapPaymentStatus("cancelled"), "cancelled");
    assert.equal(mapPaymentStatus("refunded"), "refunded");
    assert.equal(mapPaymentStatus("charged_back"), "refunded");
    for (const s of ["pending", "in_process", "in_mediation", "authorized", "algo_nuevo", undefined, null]) {
      assert.equal(mapPaymentStatus(s), "pending", `${s} debe quedar pendiente`);
    }
  });
});
