/** Cálculos del resumen (puros, sin base de datos, para poder probarlos). */

export type StockRow = {
  id: string;
  name: string;
  stock: number;
  stock_reserved: number;
  active: boolean;
  archived_at: string | null;
};

/**
 * Productos publicados con poco stock (queda al menos 1 y hasta `threshold`) y agotados (0).
 * Los ocultos o archivados no cuentan: no se venden, no hace falta avisar.
 */
export function stockAlerts(rows: StockRow[], threshold: number) {
  const live = rows.filter((r) => r.active && !r.archived_at);
  return {
    low: live.filter((r) => r.stock > 0 && r.stock <= threshold).sort((a, b) => a.stock - b.stock),
    out: live.filter((r) => r.stock <= 0),
  };
}

/** Fecha ISO de hace `days` días (el panel pide solo las ventas del último mes). */
export function daysAgoIso(days: number, now = Date.now()) {
  return new Date(now - days * 86_400_000).toISOString();
}

export type SaleRow = { total: number; paid_at: string };

/** Ventas (pedidos pagados) de los últimos 7 y 30 días. */
export function salesSummary(rows: SaleRow[], now = Date.now()) {
  const day = 86_400_000;
  const within = (days: number) => rows.filter((r) => now - Date.parse(r.paid_at) <= days * day);
  const sum = (list: SaleRow[]) => list.reduce((acc, r) => acc + r.total, 0);
  const d7 = within(7);
  const d30 = within(30);
  return {
    last7: { count: d7.length, total: sum(d7) },
    last30: { count: d30.length, total: sum(d30) },
  };
}
