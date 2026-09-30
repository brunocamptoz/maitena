// Comprueba que el webhook PUBLICADO acepta avisos firmados con tu clave secreta de Mercado Pago.
//
//   npm run webhook:check -- https://tu-sitio.vercel.app
//
// Necesita MERCADOPAGO_WEBHOOK_SECRET también en tu .env.local (la misma clave que cargaste en Vercel).
// Firma un aviso de prueba con esa clave y lo envía al sitio. Nunca muestra la clave.
//   · 200 → la clave de Vercel coincide con la tuya y el webhook funciona.
//   · 401 → la clave de Vercel es DISTINTA (typo, espacio de más o es otra clave).
//   · 500 webhook_not_configured → en Vercel falta la variable (o falta redeploy).
import { createHmac, randomUUID } from "node:crypto";

const base = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
const secret = (process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "").trim();

if (!/^https:\/\//.test(base)) {
  console.error("Indicá la dirección pública del sitio. Ej.: npm run webhook:check -- https://maitena.vercel.app");
  process.exit(1);
}
if (!secret) {
  console.error("Falta MERCADOPAGO_WEBHOOK_SECRET en tu .env.local (copiá la misma clave que cargaste en Vercel).");
  process.exit(1);
}

console.log(`\nSitio: ${base}`);
console.log(`Clave local: ${secret.length} caracteres (Mercado Pago suele dar una de 64)`);

const post = async (signature) => {
  const dataId = "999999999999"; // un pago que no existe: el sitio debe ignorarlo con 200
  const requestId = randomUUID();
  const ts = String(Date.now());
  const v1 =
    signature ?? createHmac("sha256", secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
  const res = await fetch(`${base}/api/webhooks/mercadopago?data.id=${dataId}&type=payment`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId },
    body: JSON.stringify({ action: "payment.updated", type: "payment", data: { id: dataId } }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const signed = await post();
const forged = await post("0".repeat(64));

console.log(`\n1. Aviso firmado con tu clave  → HTTP ${signed.status} ${JSON.stringify(signed.body)}`);
console.log(`2. Aviso con firma falsa       → HTTP ${forged.status} ${JSON.stringify(forged.body)}`);

console.log("");
if (signed.status === 200 && forged.status === 401) {
  console.log("✓ Todo bien: el sitio acepta avisos firmados con tu clave y rechaza los falsos.");
} else if (signed.status === 401) {
  console.log("✗ El sitio rechazó un aviso firmado con la clave de tu .env.local: la clave cargada en Vercel es distinta.");
  console.log("  Copiá de nuevo la 'Clave secreta' del panel de Webhooks de Mercado Pago (sin espacios) a Vercel y hacé Redeploy.");
} else if (signed.status === 500 && signed.body?.error === "webhook_not_configured") {
  console.log("✗ En Vercel falta MERCADOPAGO_WEBHOOK_SECRET (o falta hacer Redeploy después de cargarla).");
} else if (signed.status === 500) {
  console.log("✗ El aviso pasó la firma pero falló la consulta a Mercado Pago: revisá MERCADOPAGO_ACCESS_TOKEN en Vercel.");
} else {
  console.log("✗ Respuesta inesperada. ¿Es la dirección correcta y el sitio ya está desplegado?");
}
console.log("");
process.exit(signed.status === 200 && forged.status === 401 ? 0 : 1);
