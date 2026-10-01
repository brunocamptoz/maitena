"use server";

import { requireAdminAction } from "@/lib/admin/auth";
import { isMonthKey, monthRange } from "@/lib/admin/sales";
import { fetchPaymentById, getMercadoPago } from "@/lib/mercadopago/client";
import { feeTargets, syncPaymentFees, type FeeTarget } from "@/lib/mercadopago/fee-sync";
import { createServiceClient } from "@/lib/supabase/service";

export type SyncFeesResult = { updated: number; error?: string };

/**
 * Pide a Mercado Pago la comisión de los cobros del mes que todavía no la tienen guardada (pagos anteriores
 * a esta sección, o cuya comisión se informó tarde) y la guarda. Los pagos nuevos la traen del webhook.
 * El servidor decide qué pagos consultar: el navegador solo indica el mes.
 */
export async function syncFees(month: string): Promise<SyncFeesResult> {
  const { db } = await requireAdminAction();
  if (!isMonthKey(month)) return { updated: 0, error: "Mes inválido." };

  const mp = getMercadoPago();
  if (!mp) return { updated: 0, error: "Mercado Pago no está configurado." };

  const { from, to } = monthRange(month);
  const { data: orders, error } = await db
    .from("orders")
    .select("payments ( id, provider_payment_id, status, raw )")
    .eq("payment_status", "approved")
    .neq("order_status", "cancelled")
    .gte("paid_at", from)
    .lt("paid_at", to);
  if (error) return { updated: 0, error: "No se pudieron leer los pagos." };

  const targets = feeTargets((orders ?? []).flatMap((o) => o.payments as FeeTarget[]));
  if (targets.length === 0) return { updated: 0 };

  const service = createServiceClient();
  const { updated, failed } = await syncPaymentFees(targets, {
    now: new Date().toISOString(),
    fetchPayment: (id) => fetchPaymentById(mp, id),
    save: async (paymentId, raw) => {
      const { error: saveError } = await service.from("payments").update({ raw }).eq("id", paymentId);
      if (saveError) console.error("[admin/sales] no se pudo guardar la comisión:", saveError.code, saveError.message);
      return !saveError;
    },
  });

  return failed > 0 ? { updated, error: "No se pudieron consultar algunas comisiones." } : { updated };
}
