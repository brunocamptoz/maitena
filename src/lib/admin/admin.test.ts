import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canCancel,
  canDeliver,
  canEditTracking,
  canPrepare,
  canShip,
  eventLabel,
  trackingSchema,
  whatsappLink,
} from "./order-rules.ts";
import { productFromForm, productSchema, slugify, validateImageFile } from "./product-schema.ts";
import { parseShippingForm } from "./shipping-schema.ts";
import { daysAgoIso, salesSummary, stockAlerts } from "./stats.ts";

const form = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
};

describe("slugify", () => {
  it("quita tildes, mayúsculas y símbolos", () => {
    assert.equal(slugify("Anillo Sol Naciente"), "anillo-sol-naciente");
    assert.equal(slugify("  Aros Botón — 925  "), "aros-boton-925");
    assert.equal(slugify("Cadena Ñandú & Luna"), "cadena-nandu-y-luna");
  });
  it("no deja guiones ni al principio ni al final y respeta el máximo", () => {
    assert.equal(slugify("---hola---"), "hola");
    const long = slugify("a".repeat(300));
    assert.ok(long.length <= 140);
  });
  it("devuelve vacío si no queda nada utilizable", () => {
    assert.equal(slugify("!!!"), "");
  });
});

describe("productSchema", () => {
  const base = {
    name: "  Anillo Luna ",
    slug: "",
    description: " Plata 925. ",
    category: "anillos",
    price: "1890",
    stock: "4",
    active: true,
  };

  it("acepta datos válidos, recorta y genera la dirección desde el nombre", () => {
    const r = productSchema.safeParse(base);
    assert.ok(r.success);
    assert.deepEqual(r.data, {
      name: "Anillo Luna",
      slug: "anillo-luna",
      description: "Plata 925.",
      category: "anillos",
      price: 1890,
      stock: 4,
      active: true,
    });
  });

  it("respeta una dirección escrita a mano (y la pasa a minúsculas)", () => {
    const r = productSchema.safeParse({ ...base, slug: "Mi-Anillo" });
    assert.ok(r.success);
    assert.equal(r.data.slug, "mi-anillo");
  });

  it("rechaza una dirección con caracteres inválidos", () => {
    for (const slug of ["con espacios", "tilde-é", "doble--guion", "-borde", "borde-"]) {
      const r = productSchema.safeParse({ ...base, slug });
      assert.equal(r.success, false, slug);
    }
  });

  it("rechaza precios y stock que no son enteros no negativos", () => {
    for (const price of ["", "abc", "-5", "12.5", "1,5", "99999999"]) {
      assert.equal(productSchema.safeParse({ ...base, price }).success, false, `precio ${price}`);
    }
    for (const stock of ["", "-1", "2.5", "x", "9999999"]) {
      assert.equal(productSchema.safeParse({ ...base, stock }).success, false, `stock ${stock}`);
    }
  });

  it("acepta precio 0 y stock 0", () => {
    assert.ok(productSchema.safeParse({ ...base, price: "0", stock: "0" }).success);
  });

  it("rechaza nombre vacío, categoría desconocida y textos demasiado largos", () => {
    assert.equal(productSchema.safeParse({ ...base, name: "   " }).success, false);
    assert.equal(productSchema.safeParse({ ...base, category: "relojes" }).success, false);
    assert.equal(productSchema.safeParse({ ...base, name: "x".repeat(121) }).success, false);
    assert.equal(productSchema.safeParse({ ...base, description: "x".repeat(5001) }).success, false);
  });

  it("productFromForm lee el checkbox como booleano y tolera campos ausentes", () => {
    const on = productFromForm(form({ name: "A", active: "on" }));
    assert.equal(on.active, true);
    assert.equal(on.price, "");
    assert.equal(productFromForm(form({ name: "A" })).active, false);
  });
});

describe("validateImageFile", () => {
  it("acepta JPG/PNG/WebP/AVIF de hasta 5 MB", () => {
    assert.equal(validateImageFile({ type: "image/jpeg", size: 1000 }), null);
    assert.equal(validateImageFile({ type: "image/webp", size: 5 * 1024 * 1024 }), null);
  });
  it("rechaza SVG, otros tipos, vacíos y archivos pesados", () => {
    assert.ok(validateImageFile({ type: "image/svg+xml", size: 100 }));
    assert.ok(validateImageFile({ type: "application/pdf", size: 100 }));
    assert.ok(validateImageFile({ type: "image/png", size: 0 }));
    assert.ok(validateImageFile({ type: "image/png", size: 5 * 1024 * 1024 + 1 }));
  });
});

describe("reglas del flujo de pedidos", () => {
  it("solo se prepara un pedido recién pagado", () => {
    assert.equal(canPrepare("paid"), true);
    for (const s of ["awaiting_payment", "preparing", "shipped", "delivered", "cancelled"]) {
      assert.equal(canPrepare(s), false, s);
    }
  });
  it("se despacha desde pagado o preparando, nunca sin pago", () => {
    assert.equal(canShip("paid"), true);
    assert.equal(canShip("preparing"), true);
    for (const s of ["awaiting_payment", "shipped", "delivered", "cancelled"]) assert.equal(canShip(s), false, s);
  });
  it("solo se entrega lo enviado y solo se corrige el seguimiento de lo enviado", () => {
    assert.equal(canDeliver("shipped"), true);
    assert.equal(canDeliver("paid"), false);
    assert.equal(canEditTracking("shipped"), true);
    assert.equal(canEditTracking("delivered"), false);
  });
  it("no se cancela un pedido ya enviado, entregado o cancelado", () => {
    for (const s of ["awaiting_payment", "paid", "preparing"]) assert.equal(canCancel(s), true, s);
    for (const s of ["shipped", "delivered", "cancelled"]) assert.equal(canCancel(s), false, s);
  });
  it("etiqueta los eventos conocidos y deja pasar los desconocidos", () => {
    assert.equal(eventLabel("shipped"), "Pedido enviado");
    assert.equal(eventLabel("algo_nuevo"), "algo_nuevo");
  });
});

describe("trackingSchema", () => {
  it("exige empresa; código y enlace son opcionales", () => {
    const r = trackingSchema.safeParse({ company: " DAC ", number: "", url: "" });
    assert.ok(r.success);
    assert.deepEqual(r.data, { company: "DAC", number: null, url: null });
    assert.equal(trackingSchema.safeParse({ company: "  ", number: "1", url: "" }).success, false);
  });
  it("solo admite enlaces http(s)", () => {
    assert.ok(trackingSchema.safeParse({ company: "DAC", number: "", url: "https://dac.com.uy/x?y=1" }).success);
    for (const url of ["javascript:alert(1)", "data:text/html,hola", "ftp://x.com", "no es un enlace", "//evil.com"]) {
      assert.equal(trackingSchema.safeParse({ company: "DAC", number: "", url }).success, false, url);
    }
  });
  it("respeta los máximos de la base", () => {
    assert.equal(trackingSchema.safeParse({ company: "x".repeat(81), number: "", url: "" }).success, false);
    assert.equal(trackingSchema.safeParse({ company: "DAC", number: "9".repeat(81), url: "" }).success, false);
  });
});

describe("whatsappLink", () => {
  it("convierte celulares uruguayos al formato internacional", () => {
    assert.equal(whatsappLink("099 123 456"), "https://wa.me/59899123456");
    assert.equal(whatsappLink("+598 99 123 456"), "https://wa.me/59899123456");
    assert.equal(whatsappLink("0059899123456"), "https://wa.me/59899123456");
    assert.equal(whatsappLink("99123456"), "https://wa.me/59899123456");
  });
  it("devuelve null si no parece un teléfono", () => {
    assert.equal(whatsappLink("abc"), null);
    assert.equal(whatsappLink("123"), null);
  });
});

describe("parseShippingForm", () => {
  const depts = ["Montevideo", "Salto"];
  const getter = (values: Record<string, string>) => (name: string) => values[name] ?? "";

  it("lee costo general, envío gratis y tarifas propias", () => {
    const r = parseShippingForm(getter({ defaultCost: "250", freeFrom: "3000", "rate:Salto": "400" }), depts);
    assert.ok(r.ok);
    assert.deepEqual(r.value, { defaultCost: 250, freeFrom: 3000, rates: { Salto: 400 } });
  });
  it("acepta 0 como costo general y sin promoción", () => {
    const r = parseShippingForm(getter({ defaultCost: "0" }), depts);
    assert.ok(r.ok);
    assert.deepEqual(r.value, { defaultCost: 0, freeFrom: null, rates: {} });
  });
  it("exige el costo general y rechaza montos inválidos", () => {
    const r = parseShippingForm(getter({ defaultCost: "", freeFrom: "0", "rate:Salto": "-3" }), depts);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.errors.defaultCost);
      assert.ok(r.errors.freeFrom);
      assert.ok(r.errors["rate:Salto"]);
    }
  });
  it("ignora campos de departamentos que no existen", () => {
    const r = parseShippingForm(getter({ defaultCost: "100", "rate:Narnia": "50" }), depts);
    assert.ok(r.ok);
    assert.deepEqual(r.value.rates, {});
  });
});

describe("estadísticas del resumen", () => {
  const row = (name: string, stock: number, active = true, archived: string | null = null) => ({
    id: name,
    name,
    stock,
    stock_reserved: 0,
    active,
    archived_at: archived,
  });

  it("separa poco stock de agotado e ignora lo oculto o archivado", () => {
    const { low, out } = stockAlerts(
      [row("a", 1), row("b", 3), row("c", 4), row("d", 0), row("e", 1, false), row("f", 0, true, "2026-01-01")],
      3,
    );
    assert.deepEqual(low.map((r) => r.name), ["a", "b"]);
    assert.deepEqual(out.map((r) => r.name), ["d"]);
  });

  it("suma las ventas de los últimos 7 y 30 días", () => {
    const now = Date.parse("2026-09-30T12:00:00Z");
    const ago = (d: number) => new Date(now - d * 86_400_000).toISOString();
    const s = salesSummary(
      [
        { total: 100, paid_at: ago(1) },
        { total: 200, paid_at: ago(6.9) },
        { total: 400, paid_at: ago(20) },
        { total: 800, paid_at: ago(45) },
      ],
      now,
    );
    assert.deepEqual(s.last7, { count: 2, total: 300 });
    assert.deepEqual(s.last30, { count: 3, total: 700 });
  });

  it("daysAgoIso resta días exactos", () => {
    const now = Date.parse("2026-09-30T00:00:00Z");
    assert.equal(daysAgoIso(30, now), "2026-08-31T00:00:00.000Z");
  });
});
