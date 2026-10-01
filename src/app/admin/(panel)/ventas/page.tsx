import type { Metadata } from "next";
import Link from "next/link";
import { FeeSync } from "@/components/admin/fee-sync";
import { MonthStrip } from "@/components/admin/month-strip";
import { Badge, EmptyState, PageHeader, StatCard } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { formatSaleDate } from "@/lib/admin/labels";
import {
  countsAsSale,
  currentMonthKey,
  isMonthKey,
  monthLabel,
  monthRange,
  monthStrip,
  summarizeSales,
} from "@/lib/admin/sales";
import { cn } from "@/lib/cn";
import { formatMoney, formatPrice } from "@/lib/format";
import { needsFeeCheck, readFees } from "@/lib/mercadopago/fees";

export const metadata: Metadata = { title: "Ventas" };
export const dynamic = "force-dynamic";

/** Tope de filas por mes que se traen de la base (el servidor de datos limita a 1000 por consulta). */
const MAX_ROWS = 1000;

const th = "px-3 py-3 text-left text-[10px] font-normal uppercase tracking-[0.2em] text-stone";
const num = "px-3 py-4 text-right tabular-nums whitespace-nowrap";

export default async function SalesPage(props: PageProps<"/admin/ventas">) {
  const { db } = await requireAdmin();
  const sp = await props.searchParams;

  const current = currentMonthKey();
  const asked = typeof sp.mes === "string" ? sp.mes : "";
  // Un mes inválido o futuro no tiene sentido: se vuelve al actual.
  const selected = isMonthKey(asked) && asked <= current ? asked : current;
  const { from, to } = monthRange(selected);

  const [first, month] = await Promise.all([
    db
      .from("orders")
      .select("paid_at")
      .eq("payment_status", "approved")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: true })
      .limit(1),
    db
      .from("orders")
      .select(
        "id, order_number, customer_name, customer_last_name, total, order_status, paid_at, payments ( status, raw )",
        { count: "exact" },
      )
      .eq("payment_status", "approved")
      .gte("paid_at", from)
      .lt("paid_at", to)
      .order("paid_at", { ascending: false })
      .range(0, MAX_ROWS - 1),
  ]);

  const months = monthStrip({ firstSale: first.data?.[0]?.paid_at ?? null, current, selected });

  const rows = (month.data ?? []).map((o) => {
    const payment = o.payments.find((p) => p.status === "approved");
    const fees = readFees(payment?.raw);
    return {
      id: o.id as string,
      number: o.order_number as number,
      customer: `${o.customer_name} ${o.customer_last_name}`.trim(),
      paidAt: o.paid_at as string,
      total: o.total as number,
      orderStatus: o.order_status as string,
      fee: fees?.fee ?? null,
      net: fees?.net ?? null,
      checkFees: !!payment && needsFeeCheck(payment.raw),
    };
  });

  const summary = summarizeSales(rows);
  const pending = rows.filter((r) => countsAsSale(r) && r.fee === null && r.checkFees).length;
  const truncated = (month.count ?? rows.length) > rows.length;

  return (
    <>
      <PageHeader title="Ventas" />

      <MonthStrip months={months} selected={selected} />
      <FeeSync key={selected} month={selected} pending={pending} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          label="Ventas"
          value={summary.count}
          hint={summary.cancelled > 0 ? `${summary.cancelled} cancelada${summary.cancelled === 1 ? "" : "s"} no se cuenta${summary.cancelled === 1 ? "" : "n"}` : monthLabel(selected)}
        />
        <StatCard label="Total cobrado" value={formatPrice(summary.gross)} />
        <StatCard label="Comisión de Mercado Pago" value={formatMoney(summary.fee)} />
        <StatCard
          label="Total neto"
          value={formatMoney(summary.net)}
          hint={summary.unknown > 0 ? `Faltan ${summary.unknown} venta${summary.unknown === 1 ? "" : "s"} sin comisión informada` : "Cobrado menos comisión"}
        />
      </div>

      <div className="mt-8">
        {rows.length === 0 ? (
          <EmptyState title={`Sin ventas en ${monthLabel(selected)}`}>
            Cuando alguien pague, aparece acá. Podés ver otros meses con la tira de arriba.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto border-y border-line">
            <table className="w-full min-w-[20rem] text-sm">
              <caption className="sr-only">Ventas de {monthLabel(selected)}</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className={th}>
                    Fecha y hora
                  </th>
                  <th scope="col" className={cn(th, "hidden md:table-cell")}>
                    Pedido
                  </th>
                  <th scope="col" className={cn(th, "text-right")}>
                    Monto
                  </th>
                  <th scope="col" className={cn(th, "hidden text-right md:table-cell")}>
                    Comisión MP
                  </th>
                  <th scope="col" className={cn(th, "text-right")}>
                    Monto neto
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const when = formatSaleDate(r.paidAt);
                  const cancelled = !countsAsSale(r);
                  return (
                    <tr key={r.id} className={cn(cancelled && "text-stone")}>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className="block tabular-nums">{when.date}</span>
                        <span className="block text-xs tabular-nums text-stone">{when.time}</span>
                      </td>
                      <td className="hidden px-3 py-4 md:table-cell">
                        <Link href={`/admin/pedidos/${r.id}`} className="font-medium underline-offset-4 hover:underline">
                          #{r.number}
                        </Link>
                        <span className="block max-w-56 truncate text-xs text-stone">{r.customer}</span>
                      </td>
                      <td className={cn(num, cancelled && "line-through")}>
                        {formatPrice(r.total)}
                        {cancelled && (
                          <span className="mt-1 block no-underline">
                            <Badge tone="muted">Cancelado</Badge>
                          </span>
                        )}
                      </td>
                      <td className={cn(num, "hidden md:table-cell")}>
                        {cancelled || r.fee === null ? "—" : `-${formatMoney(r.fee)}`}
                      </td>
                      <td className={cn(num, "font-medium")}>{cancelled || r.net === null ? "—" : formatMoney(r.net)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-ink">
                  <td className="px-3 py-4 text-[10px] uppercase tracking-[0.2em]" colSpan={1}>
                    Total del mes
                  </td>
                  <td className="hidden md:table-cell" />
                  <td className={cn(num, "font-medium")}>{formatPrice(summary.gross)}</td>
                  <td className={cn(num, "hidden md:table-cell")}>-{formatMoney(summary.fee)}</td>
                  <td className={cn(num, "font-medium")}>{formatMoney(summary.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {truncated && (
          <p className="mt-3 text-xs text-stone">
            Se muestran las {rows.length} ventas más recientes del mes; hay más.
          </p>
        )}
        <p className="mt-4 max-w-2xl text-xs leading-relaxed text-stone">
          Fecha y hora del pago, en hora de Uruguay. La comisión es la que informa Mercado Pago en cada cobro; puede
          variar según el medio de pago y el plazo de acreditación. Los pedidos cancelados no suman.
        </p>
      </div>
    </>
  );
}
