/**
 * Datos del negocio que usan las páginas legales (términos, privacidad, cambios y devoluciones, envíos).
 * Mientras un dato sea `null` NO se muestra: las páginas no inventan nada. Completarlos cuando se tengan
 * (idealmente con el asesoramiento de un abogado; ver "Checklist antes de lanzar" del README).
 */
export const legal = {
  /** Razón social del titular de la tienda (ej.: "Nombre Apellido" o "Maitena Joyas S.A."). */
  businessName: null as string | null,
  /** RUT, si el negocio está inscripto. */
  rut: null as string | null,
  /** Empresa de transporte con la que se despachan los pedidos. Si es null, los textos hablan de "la empresa de transporte" en general. */
  carrier: "DAC" as string | null,
  /** Domicilio legal, tal como debe figurar (la tienda no tiene local abierto al público). */
  address: null as string | null,
  /**
   * Plazo habitual de entrega, en texto libre (ej.: "2 a 5 días hábiles desde que despachamos").
   * Mientras sea null la página de envíos explica el proceso sin prometer un plazo.
   */
  deliveryTime: null as string | null,
  /**
   * Política propia de cambios, en texto libre (ej.: cambios por talle dentro de X días). Es ADICIONAL a los
   * derechos que da la ley. Mientras sea null se invita a escribir para coordinar un cambio.
   */
  exchangePolicy: null as string | null,
} as const;

/** Fecha de la última revisión de los textos legales (se muestra en cada página). */
export const LEGAL_UPDATED = "1 de octubre de 2026";
