/**
 * Costo de envío: tarifa del departamento, o la general si no tiene una propia; gratis desde el monto
 * configurado. Es el MISMO cálculo que hace la función SQL `create_order` (que es la que manda al
 * cobrar): esto solo sirve para mostrar el costo antes de pagar.
 */
export function computeShipping(input: {
  subtotal: number;
  defaultCost: number;
  /** Tarifa propia del departamento (null si no tiene). */
  rateCost: number | null;
  /** Envío gratis desde este subtotal (null = sin promoción). */
  freeFrom: number | null;
}) {
  if (input.freeFrom !== null && input.subtotal >= input.freeFrom) return 0;
  return input.rateCost ?? input.defaultCost;
}

/**
 * ¿Se puede cobrar? Mientras el negocio no cargue sus costos de envío no se vende (así no se regala el
 * envío por olvido). En desarrollo se puede saltear con ALLOW_UNCONFIGURED_SHIPPING=true.
 */
export function shippingIsSellable(configured: boolean) {
  if (configured) return true;
  return process.env.NODE_ENV !== "production" && process.env.ALLOW_UNCONFIGURED_SHIPPING === "true";
}
