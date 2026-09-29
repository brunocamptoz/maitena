import { revalidateTag } from "next/cache";
import { fetchPaymentById, getMercadoPago } from "@/lib/mercadopago/client";
import { handleWebhook } from "@/lib/mercadopago/webhook";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * Aviso de pagos de Mercado Pago (Tus integraciones → Webhooks → evento "Pagos").
 * Es la ÚNICA vía por la que un pedido pasa a pagado: nunca se confía en el regreso del navegador.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const mp = getMercadoPago();

  try {
    const result = await handleWebhook(
      { url: request.url, headers: request.headers, body },
      {
        secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
        fetchPayment: async (id) => {
          if (!mp) throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN");
          return fetchPaymentById(mp, id);
        },
        db: createServiceClient(),
        onPaid: async () => {
          // El stock cambió: las páginas de productos se refrescan con el próximo pedido de visita.
          revalidateTag("products", { expire: 0 });
        },
        log: (level, message, meta) => {
          const line = `[webhook] ${message}`;
          if (level === "error") console.error(line, meta ?? "");
          else if (level === "warn") console.warn(line, meta ?? "");
          else console.log(line, meta ?? "");
        },
      },
    );
    return Response.json(result.body, { status: result.status });
  } catch (error) {
    console.error("[webhook] Error inesperado:", error);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
