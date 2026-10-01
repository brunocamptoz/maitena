import { LOW_STOCK_THRESHOLD } from "../config/shop.ts";

/**
 * Precio en pesos uruguayos: "$ 1.490".
 * Formateo manual (no Intl) para que servidor y navegador produzcan exactamente el mismo texto.
 */
export function formatPrice(amount: number) {
  const n = Math.round(amount);
  const sign = n < 0 ? "-" : "";
  return `${sign}$ ${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export type Availability = "in_stock" | "low_stock" | "sold_out";

export function getAvailability(stock: number): Availability {
  if (stock <= 0) return "sold_out";
  if (stock <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
}

export function availabilityLabel(stock: number) {
  switch (getAvailability(stock)) {
    case "sold_out":
      return "Agotado";
    case "low_stock":
      return stock === 1 ? "Última unidad" : `Últimas ${stock} unidades`;
    default:
      return "Disponible";
  }
}
