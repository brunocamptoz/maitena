import { createHmac, timingSafeEqual } from "node:crypto";
import { InvalidWebhookSignatureError, SignatureFailureReason, WebhookSignatureValidator } from "mercadopago";

export type SignatureInput = {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
};

export type SignatureResult =
  | { valid: true; secretIndex: number }
  | {
      valid: false;
      reason: string;
      /** Solo datos NO sensibles (nunca claves ni firmas): sirven para entender por qué falló. */
      diagnostics: {
        secretsTried: number;
        secretLengths: number[];
        hasDataId: boolean;
        hasRequestId: boolean;
        tsDigits: number | null;
        /** Si la firma coincide con otro armado del texto firmado, cuál (null = ninguno: clave equivocada). */
        matchedVariant: string | null;
      };
    };

/**
 * Las claves secretas de Mercado Pago pueden ser DOS a la vez (modo de prueba y modo productivo) o
 * estar en rotación. Se aceptan varias separadas por coma, ej.: "clavePrueba,claveProduccion".
 */
export function parseSecrets(raw: string | undefined | null): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseHeader(header: string | null) {
  let ts: string | null = null;
  let v1: string | null = null;
  for (const part of (header ?? "").split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    const value = part.slice(eq + 1).trim();
    if (key === "ts") ts = value;
    if (key === "v1") v1 = value;
  }
  return { ts, v1 };
}

const equalHex = (a: string, b: string) => {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Otras formas de armar el texto firmado, para distinguir "clave equivocada" de "formato distinto". */
function manifestVariants({ dataId, xRequestId }: SignatureInput, ts: string) {
  const id = dataId ?? "";
  const rid = xRequestId ?? "";
  const seconds = ts.length > 10 ? ts.slice(0, 10) : ts;
  return {
    estandar: `id:${id};request-id:${rid};ts:${ts};`,
    "sin-request-id": `id:${id};ts:${ts};`,
    "sin-id": `request-id:${rid};ts:${ts};`,
    "id-en-minusculas": `id:${id.toLowerCase()};request-id:${rid};ts:${ts};`,
    "ts-en-segundos": `id:${id};request-id:${rid};ts:${seconds};`,
  } as Record<string, string>;
}

/**
 * Verifica la firma `x-signature` de un aviso de Mercado Pago contra una o varias claves.
 * Usa el validador oficial del SDK (comparación en tiempo constante); si ninguna clave coincide devuelve
 * el motivo y un diagnóstico sin datos sensibles.
 */
export function verifySignature(input: SignatureInput, secrets: string[]): SignatureResult {
  let reason: string = SignatureFailureReason.SignatureMismatch;

  for (const [secretIndex, secret] of secrets.entries()) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: input.xSignature,
        xRequestId: input.xRequestId,
        dataId: input.dataId,
        secret,
      });
      return { valid: true, secretIndex };
    } catch (error) {
      if (!(error instanceof InvalidWebhookSignatureError)) throw error;
      reason = error.reason;
      // Encabezado ausente o mal formado: no depende de la clave, no tiene sentido probar otras.
      if (error.reason !== SignatureFailureReason.SignatureMismatch) break;
    }
  }

  const { ts, v1 } = parseHeader(input.xSignature);
  let matchedVariant: string | null = null;
  if (ts && v1) {
    search: for (const secret of secrets) {
      for (const [name, manifest] of Object.entries(manifestVariants(input, ts))) {
        if (equalHex(createHmac("sha256", secret).update(manifest).digest("hex"), v1)) {
          matchedVariant = name;
          break search;
        }
      }
    }
  }

  return {
    valid: false,
    reason,
    diagnostics: {
      secretsTried: secrets.length,
      secretLengths: secrets.map((s) => s.length),
      hasDataId: input.dataId !== null,
      hasRequestId: input.xRequestId !== null,
      tsDigits: ts ? ts.length : null,
      matchedVariant,
    },
  };
}
