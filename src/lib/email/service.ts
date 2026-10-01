import "server-only";
import { site } from "@/config/site";
import { serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { loadOrderForEmail } from "@/lib/email/load-order";
import { createResendMailer } from "@/lib/email/mailer";
import { notifyOrderPaid as notifyPaid, notifyOrderShipped as notifyShipped, type NotifyDeps } from "@/lib/email/notify";

/** Arma las dependencias reales: base de datos, Resend y los datos de la tienda. */
function realDeps(): NotifyDeps {
  const db = createServiceClient();
  const apiKey = serverEnv("RESEND_API_KEY");
  const from = serverEnv("EMAIL_FROM");

  return {
    db,
    loadOrder: (orderId) => loadOrderForEmail(db as never, orderId),
    mailer: apiKey && from ? createResendMailer({ apiKey, from }) : null,
    ctx: { siteName: site.name, siteUrl: site.url, contact: site.contact },
    adminEmail: serverEnv("ADMIN_NOTIFICATION_EMAIL"),
    redirectTo: serverEnv("EMAIL_REDIRECT_TO"),
    log: (level, message, meta) => {
      const line = `[email] ${message}`;
      if (level === "error") console.error(line, meta ?? "");
      else if (level === "warn") console.warn(line, meta ?? "");
      else console.log(line, meta ?? "");
    },
  };
}

/**
 * Pedido pagado → confirmación al comprador + aviso de venta al administrador. Nunca lanza: un problema de
 * email no puede romper la confirmación del pago (queda registrado y se reintenta).
 */
export async function notifyOrderPaid(orderId: string) {
  try {
    return await notifyPaid(orderId, realDeps());
  } catch (error) {
    console.error("[email] No se pudieron enviar los emails del pedido:", error);
    return null;
  }
}

/** Pedido despachado → email de seguimiento al comprador. */
export async function notifyOrderShipped(orderId: string) {
  try {
    return await notifyShipped(orderId, realDeps());
  } catch (error) {
    console.error("[email] No se pudo enviar el email de envío:", error);
    return null;
  }
}
