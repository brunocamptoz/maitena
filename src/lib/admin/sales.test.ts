import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatMoney } from "../format.ts";
import { feeTargets, syncPaymentFees } from "../mercadopago/fee-sync.ts";
import { extractFees, feeFields, needsFeeCheck, readFees } from "../mercadopago/fees.ts";
import {
  countsAsSale,
  isMonthKey,
  monthKey,
  monthLabel,
  monthRange,
  monthStrip,
  monthsBetween,
  shiftMonth,
  summarizeSales,
} from "./sales.ts";

describe("meses en hora de Montevideo", () => {
  it("una compra de las 23:30 del 30/9 en Uruguay cuenta en septiembre aunque en UTC ya sea octubre", () => {
    assert.equal(monthKey("2026-10-01T02:30:00Z"), "2026-09");
    assert.equal(monthKey("2026-10-01T03:00:00Z"), "2026-10");
    assert.equal(monthKey("2026-01-01T02:59:59Z"), "2025-12");
  });
  it("shiftMonth cruza de año en ambos sentidos", () => {
    assert.equal(shiftMonth("2026-12", 1), "2027-01");
    assert.equal(shiftMonth("2026-01", -1), "2025-12");
    assert.equal(shiftMonth("2026-09", 0), "2026-09");
    assert.equal(shiftMonth("2026-09", 15), "2027-12");
  });
  it("monthRange da el mes completo con el desfase de Uruguay", () => {
    assert.deepEqual(monthRange("2026-09"), { from: "2026-09-01T00:00:00-03:00", to: "2026-10-01T00:00:00-03:00" });
    assert.deepEqual(monthRange("2026-12"), { from: "2026-12-01T00:00:00-03:00", to: "2027-01-01T00:00:00-03:00" });
  });
  it("los límites del rango coinciden con monthKey (ninguna venta cae en dos meses ni en ninguno)", () => {
    const { from, to } = monthRange("2026-09");
    assert.equal(monthKey(from), "2026-09");
    assert.equal(monthKey(new Date(Date.parse(to) - 1)), "2026-09");
    assert.equal(monthKey(to), "2026-10");
  });
  it("valida el formato de mes que llega por la URL", () => {
    for (const ok of ["2026-09", "1999-12"]) assert.equal(isMonthKey(ok), true, ok);
    for (const bad of ["2026-13", "2026-00", "26-09", "2026-9", "septiembre", "", null, undefined, 202609]) {
      assert.equal(isMonthKey(bad), false, String(bad));
    }
  });
  it("monthsBetween no saltea meses y monthLabel escribe en español", () => {
    assert.deepEqual(monthsBetween("2026-11", "2027-02"), ["2026-11", "2026-12", "2027-01", "2027-02"]);
    assert.equal(monthLabel("2026-09"), "septiembre 2026");
    assert.equal(monthLabel("2026-09", "short"), "sep 2026");
  });
  it("monthStrip va de la primera venta (o del mes elegido) hasta hoy", () => {
    assert.deepEqual(monthStrip({ firstSale: "2026-08-15T12:00:00Z", current: "2026-10", selected: "2026-10" }), ["2026-08", "2026-09", "2026-10"]);
    assert.deepEqual(monthStrip({ firstSale: null, current: "2026-10", selected: "2026-10" }), ["2026-10"]);
    assert.deepEqual(monthStrip({ firstSale: "2026-09-10T12:00:00Z", current: "2026-10", selected: "2026-07" }), ["2026-07", "2026-08", "2026-09", "2026-10"]);
  });
});

describe("resumen de ventas del mes", () => {
  const sale = (total: number, fee: number | null, orderStatus = "paid") => ({
    total,
    orderStatus,
    fee,
    net: fee === null ? null : Math.round((total - fee) * 100) / 100,
  });

  it("suma cobrado, comisión y neto", () => {
    const s = summarizeSales([sale(1000, 60), sale(2000, 120.5)]);
    assert.deepEqual(s, { count: 2, gross: 3000, fee: 180.5, net: 2819.5, unknown: 0, cancelled: 0 });
  });
  it("no mezcla errores de coma flotante en los centavos", () => {
    const s = summarizeSales([sale(1, 0.06), sale(1, 0.06), sale(1, 0.06)]);
    assert.equal(s.fee, 0.18);
    assert.equal(s.net, 2.82);
  });
  it("los pedidos cancelados no cuentan como venta y se informan aparte", () => {
    const s = summarizeSales([sale(1000, 60), sale(5000, 300, "cancelled")]);
    assert.equal(s.count, 1);
    assert.equal(s.gross, 1000);
    assert.equal(s.cancelled, 1);
    assert.equal(countsAsSale({ orderStatus: "cancelled" }), false);
    assert.equal(countsAsSale({ orderStatus: "shipped" }), true);
  });
  it("cuenta aparte las ventas cuya comisión todavía no se conoce, sin inventarla", () => {
    const s = summarizeSales([sale(1000, 60), sale(2000, null)]);
    assert.equal(s.unknown, 1);
    assert.equal(s.gross, 3000);
    assert.equal(s.fee, 60);
    assert.equal(s.net, 940);
  });
  it("sin ventas, todo en cero", () => {
    assert.deepEqual(summarizeSales([]), { count: 0, gross: 0, fee: 0, net: 0, unknown: 0, cancelled: 0 });
  });
});

describe("comisión de Mercado Pago", () => {
  it("usa lo que informa Mercado Pago (pago real de $1: comisión 0,06, neto 0,94)", () => {
    const fees = extractFees({
      transaction_amount: 1,
      fee_details: [{ amount: 0.06, fee_payer: "collector", type: "mercadopago_fee" }],
      transaction_details: { net_received_amount: 0.94 },
    });
    assert.deepEqual(fees, { fee: 0.06, net: 0.94 });
  });
  it("si no viene el neto, suma solo las comisiones a cargo del vendedor", () => {
    const fees = extractFees({
      transaction_amount: 1000,
      fee_details: [
        { amount: 49.9, fee_payer: "collector", type: "mercadopago_fee" },
        { amount: 80, fee_payer: "payer", type: "financing_fee" },
      ],
    });
    assert.deepEqual(fees, { fee: 49.9, net: 950.1 });
  });
  it("el neto manda sobre el detalle de comisiones (incluye cualquier otro descuento)", () => {
    const fees = extractFees({
      transaction_amount: 1000,
      fee_details: [{ amount: 40, fee_payer: "collector" }],
      transaction_details: { net_received_amount: 930 },
    });
    assert.deepEqual(fees, { fee: 70, net: 930 });
  });
  it("devuelve null (desconocida) cuando Mercado Pago no informó nada, en vez de suponer 0", () => {
    assert.equal(extractFees({ transaction_amount: 1000 }), null);
    assert.equal(extractFees({ transaction_amount: 1000, fee_details: [], transaction_details: {} }), null);
    assert.equal(extractFees({ transaction_amount: 1000, transaction_details: { net_received_amount: 0 } }), null);
    assert.equal(extractFees({}), null);
  });
  it("descarta datos incoherentes (neto mayor que lo cobrado)", () => {
    assert.equal(extractFees({ transaction_amount: 1000, transaction_details: { net_received_amount: 1500 } }), null);
  });
  it("lo guardado solo contiene importes, y se puede volver a leer", () => {
    const fields = feeFields({ fee: 0.06, net: 0.94 });
    assert.deepEqual(fields, { fee_amount: 0.06, net_received_amount: 0.94 });
    assert.deepEqual(readFees(fields), { fee: 0.06, net: 0.94 });
    assert.deepEqual(feeFields(null), {});
    assert.equal(readFees({}), null);
    assert.equal(readFees(null), null);
    assert.equal(readFees({ fee_amount: "x", net_received_amount: 1 }), null);
  });
  it("solo se consulta a Mercado Pago lo que falta y no se insiste cada pocos segundos", () => {
    const now = Date.parse("2026-10-01T12:00:00Z");
    assert.equal(needsFeeCheck({ fee_amount: 1, net_received_amount: 9 }, now), false);
    assert.equal(needsFeeCheck({}, now), true);
    assert.equal(needsFeeCheck(null, now), true);
    assert.equal(needsFeeCheck({ fees_checked_at: "2026-10-01T11:45:00Z" }, now), false);
    assert.equal(needsFeeCheck({ fees_checked_at: "2026-10-01T11:20:00Z" }, now), true);
    assert.equal(needsFeeCheck({ fees_checked_at: "fecha rota" }, now), true);
  });
});

describe("formatMoney", () => {
  it("sin centavos cuando son enteros y con coma cuando hacen falta", () => {
    assert.equal(formatMoney(1490), "$ 1.490");
    assert.equal(formatMoney(0.94), "$ 0,94");
    assert.equal(formatMoney(1234567.5), "$ 1.234.567,50");
    assert.equal(formatMoney(0), "$ 0");
    assert.equal(formatMoney(0.06), "$ 0,06");
    assert.equal(formatMoney(2819.5), "$ 2.819,50");
  });
  it("redondea al centavo y maneja negativos", () => {
    assert.equal(formatMoney(10.004), "$ 10");
    assert.equal(formatMoney(10.005 + 0.0001), "$ 10,01");
    assert.equal(formatMoney(-5), "-$ 5");
    assert.equal(formatMoney(-0.001), "$ 0");
  });
});

describe("sincronización de comisiones", () => {
  const approved = (id: string, raw: unknown = {}) => ({ id, provider_payment_id: `10${id}`, status: "approved", raw });

  it("elige solo pagos aprobados, con id de Mercado Pago, sin comisión y no consultados hace poco", () => {
    const now = Date.parse("2026-10-01T12:00:00Z");
    const targets = feeTargets(
      [
        approved("1"),
        approved("2", { fee_amount: 1, net_received_amount: 9 }),
        approved("3", { fees_checked_at: "2026-10-01T11:50:00Z" }),
        { id: "4", provider_payment_id: "105", status: "rejected", raw: {} },
        { id: "5", provider_payment_id: "zz-check-abc", status: "approved", raw: {} },
        approved("6", { fees_checked_at: "2026-10-01T10:00:00Z" }),
      ],
      now,
    );
    assert.deepEqual(targets.map((t) => t.id), ["1", "6"]);
  });

  it("guarda comisión y neto reales junto con la hora de la consulta, sin perder lo que ya había", async () => {
    const saved: Record<string, Record<string, unknown>> = {};
    const result = await syncPaymentFees([approved("1", { status: "approved", live_mode: true })], {
      now: "2026-10-01T12:00:00.000Z",
      fetchPayment: async () => ({
        transaction_amount: 1,
        fee_details: [{ amount: 0.06, fee_payer: "collector" }],
        transaction_details: { net_received_amount: 0.94 },
      }),
      save: async (id, raw) => ((saved[id] = raw), true),
    });
    assert.deepEqual(result, { updated: 1, failed: 0, checked: 1 });
    assert.deepEqual(saved["1"], {
      status: "approved",
      live_mode: true,
      fee_amount: 0.06,
      net_received_amount: 0.94,
      fees_checked_at: "2026-10-01T12:00:00.000Z",
    });
  });

  it("si Mercado Pago no conoce el pago solo anota la consulta (no inventa una comisión)", async () => {
    const saved: Record<string, unknown>[] = [];
    const result = await syncPaymentFees([approved("1")], {
      now: "2026-10-01T12:00:00.000Z",
      fetchPayment: async () => null,
      save: async (_id, raw) => (saved.push(raw), true),
    });
    assert.deepEqual(result, { updated: 0, failed: 0, checked: 1 });
    assert.deepEqual(saved, [{ fees_checked_at: "2026-10-01T12:00:00.000Z" }]);
  });

  it("si Mercado Pago falla no marca el pago como consultado y sigue con los demás", async () => {
    const saved: string[] = [];
    const result = await syncPaymentFees([approved("1"), approved("2")], {
      now: "2026-10-01T12:00:00.000Z",
      fetchPayment: async (id) => {
        if (id === "101") throw new Error("timeout");
        return { transaction_amount: 100, transaction_details: { net_received_amount: 95 } };
      },
      save: async (id) => (saved.push(id), true),
    });
    assert.deepEqual(result, { updated: 1, failed: 1, checked: 2 });
    assert.deepEqual(saved, ["2"]);
  });

  it("cuenta como fallo un guardado que no se pudo hacer y respeta el máximo por tanda", async () => {
    const calls: string[] = [];
    const result = await syncPaymentFees([approved("1"), approved("2"), approved("3")], {
      now: "2026-10-01T12:00:00.000Z",
      batch: 2,
      fetchPayment: async (id) => (calls.push(id), { transaction_amount: 100, transaction_details: { net_received_amount: 95 } }),
      save: async () => false,
    });
    assert.deepEqual(calls, ["101", "102"]);
    assert.deepEqual(result, { updated: 0, failed: 2, checked: 2 });
  });
});
