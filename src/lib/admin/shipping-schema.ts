/** Lectura y validación del formulario de envíos (pura: se prueba sin base de datos). */

export type ShippingInput = {
  defaultCost: number;
  /** null = sin promoción de envío gratis. */
  freeFrom: number | null;
};

export type ShippingParse =
  | { ok: true; value: ShippingInput }
  | { ok: false; errors: Record<string, string> };

const MAX_COST = 1_000_000;

function parseAmount(raw: string, label: string): { value: number | null; error?: string } {
  const text = raw.trim();
  if (text === "") return { value: null };
  if (!/^\d+$/.test(text)) return { value: null, error: `${label}: ingresá un número entero, sin puntos ni signos.` };
  const n = Number(text);
  if (n > MAX_COST) return { value: null, error: `${label}: el monto es demasiado alto.` };
  return { value: n };
}

/** `get(name)` devuelve el texto de cada campo: `defaultCost` y `freeFrom`. */
export function parseShippingForm(get: (name: string) => string): ShippingParse {
  const errors: Record<string, string> = {};

  const def = parseAmount(get("defaultCost"), "Costo de envío");
  if (def.error) errors.defaultCost = def.error;
  else if (def.value === null) errors.defaultCost = "Costo de envío: ingresá un monto (0 si el envío es gratis).";

  const free = parseAmount(get("freeFrom"), "Envío gratis desde");
  if (free.error) errors.freeFrom = free.error;
  else if (free.value === 0) errors.freeFrom = "Envío gratis desde: ingresá un monto mayor a 0, o dejalo vacío.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { defaultCost: def.value!, freeFrom: free.value } };
}
