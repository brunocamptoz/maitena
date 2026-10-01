// Verifica la configuración de emails enviando UN correo de prueba (con datos de ejemplo) a tu casilla.
//
//   npm run email:check            → lo envía a ADMIN_NOTIFICATION_EMAIL
//   npm run email:check -- a@b.com → lo envía a esa dirección
//
// Nunca muestra la API key. Sin dominio verificado, Resend solo entrega a tu email de cuenta.
import { createResendMailer } from "../src/lib/email/mailer.ts";
import { confirmationEmail } from "../src/lib/email/templates.ts";

const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
const from = (process.env.EMAIL_FROM ?? "").trim();
const to = (process.argv[2] ?? process.env.ADMIN_NOTIFICATION_EMAIL ?? "").trim();
const redirect = (process.env.EMAIL_REDIRECT_TO ?? "").trim();
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

let failed = 0;
const ok = (name, cond, extra = "") => {
  if (!cond) failed++;
  console.log(`  ${cond ? "✓" : "✗ FALLA"} ${name}${!cond && extra ? `  →  ${extra}` : ""}`);
};

console.log("\n1. Configuración");
ok("RESEND_API_KEY cargada", apiKey.length > 0, "falta en .env.local");
ok("tiene el formato de una clave de Resend (re_…)", /^re_[A-Za-z0-9_]+$/.test(apiKey), "revisá que sea la clave completa, sin espacios");
ok("EMAIL_FROM cargado", from.length > 0, "ej.: Maitena Joyas <onboarding@resend.dev>");
ok("EMAIL_FROM con formato válido", /^[^<>]+<[^<>@\s]+@[^<>@\s]+>$|^[^<>@\s]+@[^<>@\s]+$/.test(from));
ok("ADMIN_NOTIFICATION_EMAIL (o destinatario) definido", /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to), "falta ADMIN_NOTIFICATION_EMAIL");
console.log(`  • modo prueba (EMAIL_REDIRECT_TO): ${redirect ? "activado → los correos del comprador te llegan a vos" : "desactivado"}`);
if (failed) {
  process.exitCode = 1;
} else {
  console.log("\n2. Envío de prueba");
  const now = new Date().toISOString();
  const rendered = confirmationEmail(
    {
      id: "00000000-0000-4000-8000-000000000000",
      orderNumber: 1,
      publicToken: "00000000-0000-4000-8000-000000000001",
      orderStatus: "paid",
      paymentStatus: "approved",
      customerName: "Prueba",
      customerLastName: "De Email",
      customerEmail: to,
      customerPhone: "099 123 456",
      department: "Montevideo",
      city: "Montevideo",
      address: "18 de Julio",
      doorNumber: "1234",
      apartment: null,
      postalCode: null,
      notes: null,
      subtotal: 1490,
      shippingCost: 0,
      total: 1490,
      createdAt: now,
      paidAt: now,
      tracking: { company: null, number: null, url: null },
      needsAttention: false,
      attentionReason: null,
      items: [{ name: "Anillo Solitario (ejemplo)", quantity: 1, unitPrice: 1490, subtotal: 1490 }],
    },
    { siteName: "Maitena Joyas", siteUrl, contact: { email: null, whatsapp: null, instagram: null } },
  );

  const mailer = createResendMailer({ apiKey, from });
  const result = await mailer({
    to,
    subject: `[PRUEBA] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
    idempotencyKey: `email-check-${Date.now()}`,
  });
  ok(`Resend aceptó el correo para ${to}`, result.ok, result.ok ? "" : result.error);
  if (result.ok) console.log(`  • Revisá tu bandeja (y la carpeta de spam). Id del envío: ${result.id}`);
  if (!result.ok && /testing emails|your own email|domain/i.test(result.error)) {
    console.log("  • Sin dominio verificado Resend solo envía a TU email de cuenta de Resend. Usá ese email.");
  }
  if (!result.ok) process.exitCode = 1;
}
console.log("");
