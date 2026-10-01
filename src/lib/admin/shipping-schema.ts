/** Lectura y validación del formulario de envíos (pura: se prueba sin base de datos). */

export type ShippingInput = {
  defaultCost: number;
  /** null = sin promoción de envío gratis. */
  freeFrom: number | null;
  /** Solo los departamentos con tarifa propia; el resto usa la general. */
  rates: Record<string, number>;
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

/**
 * `get(name)` devuelve el texto de cada campo: `defaultCost`, `freeFrom` y `rate:<departamento>`.
 * Un monto vacío en un departamento significa "usa el costo general".
 */
export function parseShippingForm(get: (name: string) => string, departments: readonly string[]): ShippingParse {
  const errors: Record<string, string> = {};

  const def = parseAmount(get("defaultCost"), "Costo general");
  if (def.error) errors.defaultCost = def.error;
  else if (def.value === null) errors.defaultCost = "Costo general: ingresá un monto (0 si el envío es gratis).";

  const free = parseAmount(get("freeFrom"), "Envío gratis desde");
  if (free.error) errors.freeFrom = free.error;
  else if (free.value === 0) errors.freeFrom = "Envío gratis desde: ingresá un monto mayor a 0, o dejalo vacío.";

  const rates: Record<string, number> = {};
  for (const dept of departments) {
    const rate = parseAmount(get(`rate:${dept}`), dept);
    if (rate.error) errors[`rate:${dept}`] = rate.error;
    else if (rate.value !== null) rates[dept] = rate.value;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { defaultCost: def.value!, freeFrom: free.value, rates } };
}
