import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkoutInputSchema, customerSchema, isValidPhone, toFieldErrors } from "./schema.ts";
import { computeShipping } from "./shipping.ts";

const valid = {
  name: " Ana ",
  lastName: "Pérez",
  email: "  ANA@Example.com ",
  phone: "099 123 456",
  department: "Montevideo",
  city: "Montevideo",
  address: "18 de Julio",
  doorNumber: "1234",
};

describe("validación del checkout", () => {
  it("acepta datos válidos y los normaliza (trim, email en minúsculas, opcionales vacíos)", () => {
    const r = customerSchema.safeParse(valid);
    assert.ok(r.success);
    assert.equal(r.data.name, "Ana");
    assert.equal(r.data.email, "ana@example.com");
    assert.equal(r.data.apartment, "");
    assert.equal(r.data.postalCode, "");
  });

  it("exige departamento de la lista de Uruguay", () => {
    assert.ok(!customerSchema.safeParse({ ...valid, department: "Narnia" }).success);
    assert.ok(!customerSchema.safeParse({ ...valid, department: "" }).success);
    for (const d of ["Artigas", "Treinta y Tres", "Paysandú", "Río Negro", "San José", "Tacuarembó"]) {
      assert.ok(customerSchema.safeParse({ ...valid, department: d }).success, d);
    }
  });

  it("valida el email", () => {
    for (const email of ["", "sin-arroba", "a@b", "a b@c.com"]) {
      assert.ok(!customerSchema.safeParse({ ...valid, email }).success, email);
    }
  });

  it("valida teléfonos (uruguayos y con código de país)", () => {
    for (const ok of ["099 123 456", "099123456", "+598 99 123 456", "2900 1234", "(02) 900-1234"]) {
      assert.ok(isValidPhone(ok), ok);
    }
    for (const bad of ["", "123", "abcdefgh", "12345", "099 12"]) {
      assert.ok(!isValidPhone(bad), bad);
    }
  });

  it("código postal opcional de 5 dígitos", () => {
    assert.ok(customerSchema.safeParse({ ...valid, postalCode: "11000" }).success);
    assert.ok(customerSchema.safeParse({ ...valid, postalCode: "" }).success);
    assert.ok(!customerSchema.safeParse({ ...valid, postalCode: "1100" }).success);
    assert.ok(!customerSchema.safeParse({ ...valid, postalCode: "abcde" }).success);
  });

  it("limita el largo de los campos", () => {
    assert.ok(!customerSchema.safeParse({ ...valid, notes: "x".repeat(501) }).success);
    assert.ok(!customerSchema.safeParse({ ...valid, name: "x".repeat(81) }).success);
  });

  it("los campos obligatorios vacíos dan mensajes por campo", () => {
    const r = checkoutInputSchema.safeParse({
      customer: { ...valid, name: "", city: "", doorNumber: "" },
      items: [{ productId: "0b7c1f0e-5d3a-4c39-9b0e-5c1b6f6f8a11", quantity: 1 }],
      expectedTotal: 1000,
    });
    assert.ok(!r.success);
    const errors = toFieldErrors(r.error);
    assert.ok(errors.name && errors.city && errors.doorNumber);
    assert.ok(!errors.email);
  });

  it("el carrito: ids UUID, cantidades 1–99, al menos un producto", () => {
    const base = { customer: valid, expectedTotal: 0 };
    const item = { productId: "0b7c1f0e-5d3a-4c39-9b0e-5c1b6f6f8a11", quantity: 1 };
    assert.ok(checkoutInputSchema.safeParse({ ...base, items: [item] }).success);
    assert.ok(!checkoutInputSchema.safeParse({ ...base, items: [] }).success);
    assert.ok(!checkoutInputSchema.safeParse({ ...base, items: [{ ...item, quantity: 0 }] }).success);
    assert.ok(!checkoutInputSchema.safeParse({ ...base, items: [{ ...item, quantity: 100 }] }).success);
    assert.ok(!checkoutInputSchema.safeParse({ ...base, items: [{ ...item, quantity: 1.5 }] }).success);
    assert.ok(!checkoutInputSchema.safeParse({ ...base, items: [{ productId: "demo-anillo", quantity: 1 }] }).success);
  });

  it("el campo trampa para bots debe llegar vacío en las personas", () => {
    const item = { productId: "0b7c1f0e-5d3a-4c39-9b0e-5c1b6f6f8a11", quantity: 1 };
    const ok = checkoutInputSchema.safeParse({ customer: valid, items: [item], expectedTotal: 0 });
    assert.ok(ok.success && ok.data.website === "");
    assert.ok(!checkoutInputSchema.safeParse({ customer: valid, items: [item], expectedTotal: 0, website: "http://spam" }).success);
  });
});

describe("costo de envío", () => {
  const base = { subtotal: 3000, defaultCost: 300, rateCost: null, freeFrom: null };
  it("usa la tarifa del departamento si existe, si no la general", () => {
    assert.equal(computeShipping({ ...base, rateCost: 150 }), 150);
    assert.equal(computeShipping(base), 300);
    assert.equal(computeShipping({ ...base, rateCost: 0 }), 0);
  });
  it("envío gratis desde el monto configurado (inclusive)", () => {
    assert.equal(computeShipping({ ...base, freeFrom: 3000 }), 0);
    assert.equal(computeShipping({ ...base, freeFrom: 3001 }), 300);
    assert.equal(computeShipping({ ...base, rateCost: 150, freeFrom: 2000 }), 0);
  });
});
