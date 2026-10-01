import { site } from "@/config/site";
import { adminSaleEmail, confirmationEmail, shippedEmail } from "@/lib/email/templates";
import type { EmailOrder } from "@/lib/email/types";

export const dynamic = "force-dynamic";

/**
 * Vista previa de los emails con datos de ejemplo. SOLO en desarrollo: en producción responde 404.
 *   /api/dev/emails/confirmacion   · /api/dev/emails/venta   · /api/dev/emails/envio
 *   (agregar ?format=text para ver la versión en texto plano)
 */
const sample: EmailOrder = {
  id: "00000000-0000-4000-8000-000000000000",
  orderNumber: 1042,
  publicToken: "00000000-0000-4000-8000-000000000001",
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
  notes: "Timbre roto, por favor llamar al llegar.",
  subtotal: 3680,
  shippingCost: 250,
  total: 3930,
  createdAt: new Date().toISOString(),
  paidAt: new Date().toISOString(),
  tracking: { company: "DAC", number: "UY123456789", url: "https://www.dac.com.uy/" },
  needsAttention: false,
  attentionReason: null,
  items: [
    { name: "Anillo Solitario", quantity: 2, unitPrice: 1490, subtotal: 2980 },
    { name: "Aros Botón", quantity: 1, unitPrice: 700, subtotal: 700 },
  ],
};

export async function GET(request: Request, { params }: RouteContext<"/api/dev/emails/[template]">) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });

  const { template } = await params;
  const ctx = { siteName: site.name, siteUrl: site.url, contact: site.contact };

  const email =
    template === "confirmacion"
      ? confirmationEmail(sample, ctx)
      : template === "venta"
        ? adminSaleEmail(sample, ctx)
        : template === "envio"
          ? shippedEmail({ ...sample, orderStatus: "shipped" }, ctx)
          : null;
  if (!email) return new Response("Plantillas: confirmacion, venta, envio", { status: 404 });

  const text = new URL(request.url).searchParams.get("format") === "text";
  return new Response(text ? `Asunto: ${email.subject}\n\n${email.text}` : email.html, {
    headers: { "content-type": text ? "text/plain; charset=utf-8" : "text/html; charset=utf-8" },
  });
}
