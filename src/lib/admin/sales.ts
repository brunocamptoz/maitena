/** Cálculos de la sección Ventas (puros, sin base de datos, para poder probarlos). */

const TZ = "America/Montevideo";
/** Uruguay no usa horario de verano desde 2015: el desfase con UTC es fijo. */
const UY_OFFSET = "-03:00";

const keyFormat = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit" });

/** Mes (en hora de Montevideo) de un instante, como "2026-09". */
export function monthKey(when: string | number | Date): string {
  const parts = keyFormat.formatToParts(new Date(when));
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${year}-${month}`;
}

/** Mes actual en hora de Montevideo (función aparte para no llamar a Date.now() dentro de un componente). */
export const currentMonthKey = (now = Date.now()) => monthKey(now);

export const isMonthKey = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** "2026-09" + 1 → "2026-10"; también cruza de año. */
export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  const index = year * 12 + (month - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Límites del mes en hora de Montevideo, listos para filtrar `paid_at >= from and < to`. */
export function monthRange(key: string) {
  return { from: `${key}-01T00:00:00${UY_OFFSET}`, to: `${shiftMonth(key, 1)}-01T00:00:00${UY_OFFSET}` };
}

export function monthsBetween(first: string, last: string): string[] {
  const out: string[] = [];
  for (let key = first; key <= last; key = shiftMonth(key, 1)) out.push(key);
  return out;
}

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "septiembre 2026" (nombres propios y no Intl: servidor y navegador escriben exactamente lo mismo). */
export function monthLabel(key: string, style: "long" | "short" = "long") {
  const [year, month] = key.split("-").map(Number);
  const name = MONTH_NAMES[month - 1];
  return style === "short" ? `${name.slice(0, 3)} ${year}` : `${name} ${year}`;
}

export type SaleInput = {
  total: number;
  orderStatus: string;
  /** null = Mercado Pago todavía no informó la comisión. */
  fee: number | null;
  net: number | null;
};

/** Un pedido pagado que después se canceló no es una venta (queda pendiente reintegrar el dinero). */
export const countsAsSale = (sale: Pick<SaleInput, "orderStatus">) => sale.orderStatus !== "cancelled";

const round2 = (n: number) => Math.round(n * 100) / 100;

export function summarizeSales(sales: SaleInput[]) {
  let count = 0;
  let gross = 0;
  let fee = 0;
  let net = 0;
  let unknown = 0;
  let cancelled = 0;
  for (const sale of sales) {
    if (!countsAsSale(sale)) {
      cancelled++;
      continue;
    }
    count++;
    gross += sale.total;
    if (sale.fee === null || sale.net === null) unknown++;
    else {
      fee += sale.fee;
      net += sale.net;
    }
  }
  return { count, gross, fee: round2(fee), net: round2(net), unknown, cancelled };
}

/** Meses para el selector: desde la primera venta (o el seleccionado) hasta hoy, sin saltear ninguno. */
export function monthStrip(opts: { firstSale: string | null; current: string; selected: string }) {
  const first = [opts.firstSale ? monthKey(opts.firstSale) : opts.current, opts.selected].sort()[0];
  const last = [opts.current, opts.selected].sort().at(-1) as string;
  return monthsBetween(first, last);
}
