import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import { processPayment, type Db, type MpPayment } from "./process.ts";

export type WebhookDeps = {
  /** "Clave secreta" de Webhooks de la aplicación (Tus integraciones → Webhooks). */
  secret: string | undefined;
  /** Consulta el pago a la API de Mercado Pago; null si no existe. */
  fetchPayment: (id: string) => Promise<MpPayment | null>;
  db: Db;
  /** Se llama UNA vez cuando un pedido pasa a pagado (invalidar caché, emails, etc.). */
  onPaid?: (orderId: string) => Promise<void>;
  log?: (level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) => void;
};

export type WebhookRequest = {
  url: string;
  headers: { get(name: string): string | null };
  body: unknown;
};

export type WebhookResponse = { status: number; body: Record<string, unknown> };

/**
 * Receptor de notificaciones de Mercado Pago.
 *
 *   1. Verifica la firma (x-signature, HMAC-SHA256) → una notificación falsificada devuelve 401.
 *   2. NO confía en el contenido de la notificación: consulta el pago real a la API de Mercado Pago.
 *   3. Aplica el pago con `apply_payment` (idempotente: los reintentos de MP no duplican nada).
 *
 * Códigos: 200 = recibido (o irrelevante: MP no debe reintentar) · 401 = firma inválida ·
 * 500 = fallo transitorio nuestro (MP reintenta a los 15 min, 30 min, 6 h, …).
 */
export async function handleWebhook(req: WebhookRequest, deps: WebhookDeps): Promise<WebhookResponse> {
  const log = deps.log ?? (() => {});
  // Un espacio o salto de línea de más al copiar la clave rompe toda validación: se limpia.
  const secret = deps.secret?.trim();

  if (!secret) {
    log("error", "Falta MERCADOPAGO_WEBHOOK_SECRET: no se pueden validar notificaciones.");
    return { status: 500, body: { error: "webhook_not_configured" } };
  }

  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id");

  try {
    WebhookSignatureValidator.validate({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId,
      secret,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      // Solo datos de diagnóstico NO sensibles (nunca la clave ni la firma): alcanzan para distinguir
      // una clave equivocada (SignatureMismatch + largo inesperado) de un aviso mal formado.
      log("warn", "Notificación rechazada: firma inválida", {
        reason: error.reason,
        requestId: error.requestId,
        hasDataId: dataId !== null,
        hasRequestId: req.headers.get("x-request-id") !== null,
        secretLength: secret.length,
        type: url.searchParams.get("type"),
      });
      return { status: 401, body: { error: "invalid_signature" } };
    }
    throw error;
  }

  const body = typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
  const type = url.searchParams.get("type") ?? (typeof body.type === "string" ? body.type : null);
  if (type !== "payment") {
    return { status: 200, body: { ignored: "not_a_payment_event" } };
  }

  if (!dataId || !/^\d{1,20}$/.test(dataId)) {
    return { status: 200, body: { ignored: "invalid_payment_id" } };
  }

  let payment: MpPayment | null;
  try {
    payment = await deps.fetchPayment(dataId);
  } catch (error) {
    log("error", "No se pudo consultar el pago a Mercado Pago", { paymentId: dataId, error: String(error) });
    return { status: 500, body: { error: "payment_lookup_failed" } };
  }

  // Ej.: las notificaciones de prueba que dispara el panel usan ids que no existen.
  if (!payment) {
    log("info", "Notificación de un pago inexistente (¿simulación?)", { paymentId: dataId });
    return { status: 200, body: { ignored: "payment_not_found" } };
  }

  let outcome;
  try {
    outcome = await processPayment(deps.db, payment);
  } catch (error) {
    log("error", "No se pudo aplicar el pago", { paymentId: dataId, error: String(error) });
    return { status: 500, body: { error: "apply_failed" } };
  }

  if (outcome.kind === "ignored") {
    log("warn", "Pago ignorado", { paymentId: dataId, reason: outcome.reason });
    return { status: 200, body: { ignored: outcome.reason } };
  }

  if (outcome.needsAttention) {
    log("warn", "Pedido que requiere atención", {
      orderId: outcome.orderId,
      reason: outcome.attentionReason,
    });
  }

  if (outcome.becamePaid && deps.onPaid) {
    try {
      await deps.onPaid(outcome.orderId);
    } catch (error) {
      // El pago ya quedó registrado: un fallo acá (p. ej. de emails) no debe hacer que MP reintente.
      log("error", "Falló la acción posterior al pago", { orderId: outcome.orderId, error: String(error) });
    }
  }

  return {
    status: 200,
    body: { ok: true, order_status: outcome.orderStatus, became_paid: outcome.becamePaid },
  };
}
