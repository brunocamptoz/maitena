// Comprueba que el webhook PUBLICADO acepta avisos firmados con tus claves secretas de Mercado Pago.
//
//   npm run webhook:check -- https://tu-sitio.vercel.app
//
// Necesita MERCADOPAGO_WEBHOOK_SECRET también en tu .env.local, con la MISMA clave (o claves separadas
// por coma: modo de prueba y modo productivo) que cargaste en Vercel. Firma un aviso de prueba con cada
// una y lo envía al sitio. Nunca muestra las claves.
//   · 200 → esa clave coincide con la de Vercel y el webhook funciona.
//   · 401 → esa clave NO está cargada en Vercel (typo, otra clave, u otro modo).
//   · 500 webhook_not_configured → en Vercel falta la variable (o falta redeploy).
import { createHmac, randomUUID } from "node:crypto";

const base = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
const secrets = (process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!/^https:\/\//.test(base)) {
  console.error("Indicá la dirección pública del sitio. Ej.: npm run webhook:check -- https://maitena.vercel.app");
  process.exit(1);
}
if (secrets.length === 0) {
  console.error("Falta MERCADOPAGO_WEBHOOK_SECRET en tu .env.local (copiá la misma clave que cargaste en Vercel).");
  process.exit(1);
}

console.log(`\nSitio: ${base}`);
secrets.forEach((s, i) => console.log(`Clave local ${i + 1}: ${s.length} caracteres (Mercado Pago suele dar una de 64)`));

const post = async (secret) => {
  const dataId = "999999999999"; // un pago que no existe: el sitio debe ignorarlo con 200
  const requestId = randomUUID();
  const ts = String(Date.now());
  const v1 = createHmac("sha256", secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
  const res = await fetch(`${base}/api/webhooks/mercadopago?data.id=${dataId}&type=payment`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId },
    body: JSON.stringify({ action: "payment.updated", type: "payment", data: { id: dataId } }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const results = [];
for (const [i, secret] of secrets.entries()) {
  const r = await post(secret);
  results.push(r);
  console.log(`\nAviso firmado con la clave ${i + 1} → HTTP ${r.status} ${JSON.stringify(r.body)}`);
}
const forged = await post("0".repeat(64));
console.log(`Aviso con clave falsa            → HTTP ${forged.status} ${JSON.stringify(forged.body)}`);

console.log("");
const accepted = results.filter((r) => r.status === 200).length;
if (results.some((r) => r.status === 500 && r.body?.error === "webhook_not_configured")) {
  console.log("✗ En Vercel falta MERCADOPAGO_WEBHOOK_SECRET (o falta hacer Redeploy después de cargarla).");
} else if (accepted > 0 && forged.status === 401) {
  results.forEach((r, i) =>
    console.log(
      r.status === 200
        ? `✓ La clave ${i + 1} está cargada en Vercel y el webhook la acepta.`
        : `✗ La clave ${i + 1} NO está cargada en Vercel (HTTP ${r.status}).`,
    ),
  );
  console.log("  Vercel acepta avisos con las claves marcadas ✓ y rechaza los falsos.");
} else if (results.some((r) => r.status === 500)) {
  console.log("✗ El aviso pasó la firma pero falló la consulta a Mercado Pago: revisá MERCADOPAGO_ACCESS_TOKEN en Vercel.");
} else if (results.every((r) => r.status === 401)) {
  console.log("✗ Vercel rechazó todas las claves de tu .env.local: la clave cargada allá es otra.");
  console.log("  En Mercado Pago (Webhooks) copiá la 'Clave secreta' de cada modo (prueba y producción), sin espacios,");
  console.log("  cargalas en Vercel separadas por coma y hacé Redeploy.");
} else {
  console.log("✗ Respuesta inesperada. ¿Es la dirección correcta y el sitio ya está desplegado?");
}
console.log("");
process.exit(accepted > 0 && forged.status === 401 && accepted === results.length ? 0 : 1);
