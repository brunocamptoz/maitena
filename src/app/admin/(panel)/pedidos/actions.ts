"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/auth";
import { canCancel, trackingFromForm, trackingSchema } from "@/lib/admin/order-rules";
import { notifyOrderPaid, notifyOrderShipped } from "@/lib/email/service";
import type { EmailOutcome } from "@/lib/email/notify";
import { createServiceClient } from "@/lib/supabase/service";

export type OrderActionResult = { ok?: boolean; error?: string; message?: string; errors?: Record<string, string> };

const uuid = z.string().uuid();
const BAD_ID: OrderActionResult = { error: "Pedido inválido." };
const STALE: OrderActionResult = { error: "El pedido cambió de estado mientras tanto. Recargá la página para ver el estado actual." };

function refresh(orderId: string) {
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
}

/**
 * Los estados de un pedido NO los puede tocar el panel con los permisos del admin (la base se lo impide a
 * propósito): los cambia el servidor, después de verificar que quien llama es administrador. La condición
 * `order_status in (…)` evita pisar un cambio simultáneo (doble clic, dos administradores a la vez).
 */
async function transition(
  orderId: string,
  adminId: string,
  from: readonly string[],
  patch: Record<string, unknown>,
  event: { type: string; detail?: Record<string, unknown> },
): Promise<boolean> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .in("order_status", [...from])
    .select("id");
  if (error) {
    console.error("[admin/orders] transición:", error.code, error.message);
    throw new Error("No se pudo actualizar el pedido.");
  }
  if (!data || data.length === 0) return false;
  await service.from("order_events").insert({ order_id: orderId, type: event.type, detail: event.detail ?? {}, actor: adminId });
  return true;
}

export async function markPreparing(orderId: string): Promise<OrderActionResult> {
  const { user } = await requireAdminAction();
  if (!uuid.safeParse(orderId).success) return BAD_ID;
  try {
    const done = await transition(orderId, user.id, ["paid"], { order_status: "preparing" }, { type: "preparing" });
    if (!done) return STALE;
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh(orderId);
  return { ok: true, message: "Pedido en preparación." };
}

export async function markDelivered(orderId: string): Promise<OrderActionResult> {
  const { user } = await requireAdminAction();
  if (!uuid.safeParse(orderId).success) return BAD_ID;
  try {
    const done = await transition(orderId, user.id, ["shipped"], { order_status: "delivered" }, { type: "delivered" });
    if (!done) return STALE;
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh(orderId);
  return { ok: true, message: "Pedido marcado como entregado." };
}

function emailMessage(outcome: EmailOutcome | null): string {
  switch (outcome) {
    case "sent":
      return "Le enviamos el email de seguimiento al cliente.";
    case "already_sent":
      return "El cliente ya había recibido el email de envío.";
    case "not_configured":
      return "No se envió ningún email porque el servicio de correo no está configurado.";
    case "no_recipient":
      return "No se envió el email: el pedido no tiene dirección de correo.";
    default:
      return "No se pudo enviar el email al cliente. Podés reintentarlo con “Reenviar email de envío”.";
  }
}

/** "Agregar tracking": guarda empresa/código/enlace, marca el pedido como enviado y avisa al cliente (una sola vez). */
export async function shipOrder(_prev: OrderActionResult, formData: FormData): Promise<OrderActionResult> {
  const { user } = await requireAdminAction();
  const orderId = String(formData.get("orderId") ?? "");
  if (!uuid.safeParse(orderId).success) return BAD_ID;

  const parsed = trackingSchema.safeParse(trackingFromForm(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
    return { errors, error: "Revisá los campos marcados." };
  }
  const t = parsed.data;

  try {
    const done = await transition(
      orderId,
      user.id,
      ["paid", "preparing"],
      { order_status: "shipped", tracking_company: t.company, tracking_number: t.number, tracking_url: t.url },
      { type: "shipped", detail: { company: t.company, number: t.number, url: t.url } },
    );
    if (!done) return STALE;
  } catch (e) {
    return { error: (e as Error).message };
  }

  const outcome = await notifyOrderShipped(orderId);
  refresh(orderId);
  return { ok: true, message: `Pedido marcado como enviado. ${emailMessage(outcome)}` };
}

/** Corrige un error de tipeo en el seguimiento. No reenvía el email solo: el panel ofrece “Reenviar”. */
export async function updateTracking(_prev: OrderActionResult, formData: FormData): Promise<OrderActionResult> {
  const { user } = await requireAdminAction();
  const orderId = String(formData.get("orderId") ?? "");
  if (!uuid.safeParse(orderId).success) return BAD_ID;

  const parsed = trackingSchema.safeParse(trackingFromForm(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
    return { errors, error: "Revisá los campos marcados." };
  }
  const t = parsed.data;

  try {
    const done = await transition(
      orderId,
      user.id,
      ["shipped"],
      { tracking_company: t.company, tracking_number: t.number, tracking_url: t.url },
      { type: "tracking_updated", detail: { company: t.company, number: t.number, url: t.url } },
    );
    if (!done) return STALE;
  } catch (e) {
    return { error: (e as Error).message };
  }
  refresh(orderId);
  return { ok: true, message: "Seguimiento actualizado. Si querés que el cliente reciba los datos corregidos, reenviá el email." };
}

/** Cancela un pedido que todavía no salió. Con `restock` las unidades vuelven al stock. */
export async function cancelOrder(orderId: string, restock: boolean): Promise<OrderActionResult> {
  const { user, db } = await requireAdminAction();
  if (!uuid.safeParse(orderId).success) return BAD_ID;

  const { data: order } = await db.from("orders").select("order_status, payment_status").eq("id", orderId).maybeSingle();
  if (!order) return { error: "El pedido no existe." };
  if (!canCancel(order.order_status)) return { error: "Un pedido ya enviado o cancelado no se puede cancelar desde acá." };

  const service = createServiceClient();
  const { error } = await service.rpc("cancel_order", { p_order_id: orderId, p_restock: restock, p_reason: "admin" });
  if (error) {
    console.error("[admin/orders] cancelar:", error.code, error.message);
    return { error: "No se pudo cancelar el pedido." };
  }
  await service.from("order_events").insert({
    order_id: orderId,
    type: "admin_action",
    detail: { action: "cancel", restock },
    actor: user.id,
  });

  revalidateTag("products", { expire: 0 });
  refresh(orderId);
  return {
    ok: true,
    message:
      order.payment_status === "approved"
        ? "Pedido cancelado. El cliente ya había pagado: recordá reintegrar el dinero desde Mercado Pago."
        : "Pedido cancelado.",
  };
}

export async function saveOrderNotes(_prev: OrderActionResult, formData: FormData): Promise<OrderActionResult> {
  const { db } = await requireAdminAction();
  const orderId = String(formData.get("orderId") ?? "");
  if (!uuid.safeParse(orderId).success) return BAD_ID;

  const notes = z.string().trim().max(2000, "Las notas son demasiado largas (máximo 2000).").safeParse(formData.get("notes") ?? "");
  if (!notes.success) return { error: notes.error.issues[0].message };

  const { error } = await db.from("orders").update({ admin_notes: notes.data || null }).eq("id", orderId);
  if (error) return { error: "No se pudieron guardar las notas." };
  refresh(orderId);
  return { ok: true, message: "Notas guardadas." };
}

/** El administrador ya revisó el aviso (cobro duplicado, monto distinto, etc.). */
export async function resolveAttention(orderId: string): Promise<OrderActionResult> {
  const { user, db } = await requireAdminAction();
  if (!uuid.safeParse(orderId).success) return BAD_ID;

  const { error } = await db.from("orders").update({ needs_attention: false, attention_reason: null }).eq("id", orderId);
  if (error) return { error: "No se pudo actualizar el pedido." };
  await createServiceClient()
    .from("order_events")
    .insert({ order_id: orderId, type: "attention_resolved", actor: user.id });
  refresh(orderId);
  return { ok: true };
}

/** Reenvía el email de confirmación o de envío (por si el cliente no lo recibió o se corrigieron datos). */
export async function resendEmail(orderId: string, kind: "confirmation" | "shipping"): Promise<OrderActionResult> {
  const { user, db } = await requireAdminAction();
  if (!uuid.safeParse(orderId).success) return BAD_ID;
  if (kind !== "confirmation" && kind !== "shipping") return { error: "Tipo de email inválido." };

  const { data: order } = await db.from("orders").select("order_status, payment_status").eq("id", orderId).maybeSingle();
  if (!order) return { error: "El pedido no existe." };

  // Solo tiene sentido reenviar lo que corresponde al estado actual (así no se libera una marca para nada).
  if (kind === "shipping" && order.order_status !== "shipped") {
    return { error: "El email de envío solo se reenvía mientras el pedido figura como enviado." };
  }
  if (kind === "confirmation" && !(order.payment_status === "approved" && order.order_status !== "cancelled")) {
    return { error: "El email de confirmación solo se reenvía en pedidos pagados." };
  }

  const service = createServiceClient();
  const released = await service.rpc("unclaim_order_email", { p_order_id: orderId, p_kind: kind });
  if (released.error) return { error: "No se pudo preparar el reenvío." };

  const outcome =
    kind === "shipping" ? await notifyOrderShipped(orderId) : (await notifyOrderPaid(orderId))?.confirmation ?? null;

  await service.from("order_events").insert({ order_id: orderId, type: "email_resent", detail: { kind, outcome }, actor: user.id });
  refresh(orderId);

  if (outcome === "sent") return { ok: true, message: "Email reenviado." };
  if (outcome === "not_configured") return { error: "El servicio de correo no está configurado." };
  return { error: "No se pudo reenviar el email. Probá de nuevo en unos minutos." };
}
