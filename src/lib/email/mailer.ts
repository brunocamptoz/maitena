import { Resend } from "resend";
import type { Mailer } from "./types.ts";

/**
 * Envío con Resend (https://resend.com). Las credenciales viven solo en el servidor (variables de entorno);
 * nunca se envía un email desde el navegador.
 */
export function createResendMailer(config: { apiKey: string; from: string }): Mailer {
  const resend = new Resend(config.apiKey);

  return async (email) => {
    try {
      const { data, error } = await resend.emails.send(
        {
          from: config.from,
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          replyTo: email.replyTo,
        },
        { idempotencyKey: email.idempotencyKey },
      );
      if (error) return { ok: false, error: `${error.name}: ${error.message}` };
      return { ok: true, id: data?.id };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  };
}
