// Verifica la conexión con Mercado Pago SIN mostrar nunca el token.
//
//   npm run mp:check
//
// Comprueba: token aceptado, país de la cuenta, medios de pago disponibles (y que el efectivo queda excluido),
// permiso para consultar pagos, y que Mercado Pago acepta la preferencia que arma la tienda (la misma
// función que usa el checkout). Crear una preferencia no cobra nada y vence a los 30 minutos.
import { randomUUID } from "node:crypto";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { PAYMENTS } from "../src/config/payments.ts";
import { buildPreferenceBody } from "../src/lib/mercadopago/preference.ts";

const token = process.env.MERCADOPAGO_ACCESS_TOKEN ?? "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

let passed = 0;
let failed = 0;
const ok = (name, cond, extra = "") => {
  if (cond) passed++;
  else failed++;
  console.log(`  ${cond ? "✓" : "✗ FALLA"} ${name}${!cond && extra ? `  →  ${extra}` : ""}`);
};
const info = (text) => console.log(`  • ${text}`);

console.log("\n1. Token");
ok("hay un token cargado en .env.local", token.length > 0, "MERCADOPAGO_ACCESS_TOKEN está vacío");
if (!token) process.exit(1);
ok("sin espacios ni comillas", !/\s|["']/.test(token));
info(`tipo: ${token.split("-")[0]}-… (${token.length} caracteres)`);

const api = async (path) => {
  const res = await fetch(`https://api.mercadopago.com${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
};

console.log("\n2. Cuenta");
const me = await api("/users/me");
ok("Mercado Pago acepta el token", me.status === 200, `HTTP ${me.status} ${me.body?.message ?? ""}`);
if (me.status !== 200) {
  console.log("\nSin un token válido no se puede seguir. Revisá que copiaste el Access Token completo.\n");
  process.exit(1);
}
ok("la cuenta es de Uruguay (MLU)", me.body.site_id === "MLU", `site_id = ${me.body.site_id}`);
info(`país: ${me.body.country_id ?? "?"} · moneda: ${me.body.site_id === "MLU" ? "UYU" : "?"}`);

console.log("\n3. Medios de pago disponibles");
const methods = await api("/v1/payment_methods");
ok("se pueden listar", methods.status === 200 && Array.isArray(methods.body), `HTTP ${methods.status}`);
if (Array.isArray(methods.body)) {
  const byType = {};
  for (const m of methods.body) {
    if (m.status !== "active") continue;
    (byType[m.payment_type_id] ??= []).push(m.id);
  }
  for (const [type, ids] of Object.entries(byType)) {
    const excluded = PAYMENTS.excludedPaymentTypes.includes(type);
    info(`${type}${excluded ? "  (EXCLUIDO en la tienda)" : ""}: ${ids.join(", ")}`);
  }
  const cash = methods.body.filter((m) => m.status === "active" && /abitab|redpagos/i.test(m.id));
  ok(
    "Abitab/RedPagos (efectivo) quedan cubiertos por la exclusión configurada",
    cash.every((m) => PAYMENTS.excludedPaymentTypes.includes(m.payment_type_id)),
    cash.map((m) => `${m.id}=${m.payment_type_id}`).join(", "),
  );
}

console.log("\n4. Permisos de la API");
const config = new MercadoPagoConfig({ accessToken: token, options: { timeout: 10_000 } });
try {
  const found = await new Payment(config).search({ options: { external_reference: `zz-${randomUUID()}`, limit: 1 } });
  ok("puede consultar pagos (lo usa el webhook y la página del pedido)", Array.isArray(found.results));
} catch (e) {
  ok("puede consultar pagos", false, `${e.status ?? ""} ${e.message}`);
}

console.log("\n5. La preferencia que arma la tienda");
const base = {
  orderId: randomUUID(),
  orderNumber: 0,
  publicToken: randomUUID(),
  items: [{ productId: "check-1", name: "Producto de prueba (mp:check)", quantity: 2, unitPrice: 1490 }],
  shippingCost: 200,
  shippingLabel: "Envío a Salto",
  customer: { name: "Prueba", lastName: "Automática", email: "check@example.com" },
  now: new Date(),
  reservedUntil: new Date(Date.now() + 30 * 60_000),
};

for (const [label, url] of [
  [`con la dirección configurada (${new URL(siteUrl).host})`, siteUrl],
  ["con una dirección pública (agrega regreso a la tienda y webhook)", "https://maitena-check.example"],
]) {
  try {
    const body = buildPreferenceBody({ ...base, siteUrl: url }, PAYMENTS);
    const created = await new Preference(config).create({ body, requestOptions: { idempotencyKey: randomUUID() } });
    const link = created.init_point ? new URL(created.init_point) : null;
    ok(`Mercado Pago acepta la preferencia ${label}`, !!created.id && !!link);
    if (link) info(`enlace de pago: ${link.host}${link.pathname}`);
  } catch (e) {
    ok(`Mercado Pago acepta la preferencia ${label}`, false, `${e.status ?? ""} ${e.message} ${JSON.stringify(e.causes ?? e.cause ?? "")}`.slice(0, 400));
  }
}

console.log(`\nResultado: ${passed} ✓  ${failed} ✗\n`);
process.exitCode = failed ? 1 : 0;
