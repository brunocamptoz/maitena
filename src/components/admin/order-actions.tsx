"use client";

import { useActionState, useState, useTransition } from "react";
import {
  cancelOrder,
  markDelivered,
  markPreparing,
  resendEmail,
  resolveAttention,
  saveOrderNotes,
  shipOrder,
  updateTracking,
  type OrderActionResult,
} from "@/app/admin/(panel)/pedidos/actions";
import { buttonStyles } from "@/components/ui/button";
import { canCancel, canDeliver, canEditTracking, canPrepare, canShip } from "@/lib/admin/order-rules";
import { cn } from "@/lib/cn";

const input =
  "h-11 w-full border border-ink/25 bg-transparent px-3 text-[15px] focus:border-ink focus:outline-none aria-[invalid=true]:border-error";
const label = "mb-1.5 block text-[10px] uppercase tracking-[0.22em]";

function Feedback({ result }: { result: OrderActionResult | null }) {
  if (!result) return null;
  const text = result.error ?? result.message;
  if (!text) return null;
  return (
    <p role={result.error ? "alert" : "status"} className={cn("text-sm", result.error ? "text-error" : "text-ink")}>
      {text}
    </p>
  );
}

/** Ejecuta una acción puntual (botón) y muestra su resultado. */
function useQuickAction() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<OrderActionResult | null>(null);
  const run = (job: () => Promise<OrderActionResult>) => {
    setResult(null);
    start(async () => setResult(await job()));
  };
  return { pending, result, run };
}

export type OrderActionsProps = {
  orderId: string;
  status: string;
  paymentApproved: boolean;
  tracking: { company: string | null; number: string | null; url: string | null };
  shippingEmailSent: boolean;
};

export function OrderActions({ orderId, status, paymentApproved, tracking, shippingEmailSent }: OrderActionsProps) {
  const { pending, result, run } = useQuickAction();
  const [showShip, setShowShip] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [restock, setRestock] = useState(true);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        {canPrepare(status) && (
          <button type="button" disabled={pending} onClick={() => run(() => markPreparing(orderId))} className={buttonStyles({ variant: "outline", size: "md" })}>
            Empezar a preparar
          </button>
        )}
        {canShip(status) && (
          <button type="button" disabled={pending} onClick={() => setShowShip((v) => !v)} aria-expanded={showShip} className={buttonStyles({ size: "md" })}>
            Agregar tracking
          </button>
        )}
        {canDeliver(status) && (
          <button type="button" disabled={pending} onClick={() => run(() => markDelivered(orderId))} className={buttonStyles({ size: "md" })}>
            Marcar entregado
          </button>
        )}
        {status === "shipped" && (
          <button type="button" disabled={pending} onClick={() => run(() => resendEmail(orderId, "shipping"))} className={buttonStyles({ variant: "outline", size: "md" })}>
            {shippingEmailSent ? "Reenviar email de envío" : "Enviar email de envío"}
          </button>
        )}
        {paymentApproved && status !== "cancelled" && status !== "awaiting_payment" && (
          <button type="button" disabled={pending} onClick={() => run(() => resendEmail(orderId, "confirmation"))} className={buttonStyles({ variant: "text", size: "md" })}>
            Reenviar confirmación
          </button>
        )}
        {canCancel(status) && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setShowCancel((v) => !v)}
            aria-expanded={showCancel}
            className={buttonStyles({ variant: "outline", size: "md", className: "ml-auto border-error text-error hover:bg-error hover:text-paper" })}
          >
            Cancelar pedido
          </button>
        )}
      </div>

      <Feedback result={result} />

      {showShip && canShip(status) && (
        <div className="border border-line bg-paper p-5">
          <p className="mb-4 text-sm text-stone">
            Al guardar, el pedido pasa a <strong className="font-medium text-ink">Enviado</strong> y el cliente recibe un email con estos datos.
          </p>
          <TrackingForm orderId={orderId} mode="ship" initial={tracking} />
        </div>
      )}

      {canEditTracking(status) && (
        <details className="border border-line bg-paper p-5">
          <summary className="cursor-pointer text-[11px] uppercase tracking-[0.22em]">Corregir seguimiento</summary>
          <div className="mt-4">
            <TrackingForm orderId={orderId} mode="edit" initial={tracking} />
          </div>
        </details>
      )}

      {showCancel && canCancel(status) && (
        <div className="space-y-4 border border-error/40 bg-error/5 p-5">
          <p className="text-sm">
            {paymentApproved
              ? "El cliente ya pagó. Cancelar NO devuelve el dinero: después tenés que reintegrarlo desde Mercado Pago."
              : "El pedido todavía no tiene un pago aprobado."}
          </p>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="size-4 accent-ink" />
            Devolver los productos al stock
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => cancelOrder(orderId, restock))}
            className={buttonStyles({ size: "md", className: "bg-error hover:bg-error/85" })}
          >
            {pending ? "Cancelando…" : "Confirmar cancelación"}
          </button>
        </div>
      )}
    </div>
  );
}

function TrackingForm({
  orderId,
  mode,
  initial,
}: {
  orderId: string;
  mode: "ship" | "edit";
  initial: { company: string | null; number: string | null; url: string | null };
}) {
  const [state, action, pending] = useActionState<OrderActionResult, FormData>(mode === "ship" ? shipOrder : updateTracking, {});
  // Controlados: React 19 vacía los campos sin control al terminar la acción.
  const [company, setCompany] = useState(initial.company ?? "");
  const [number, setNumber] = useState(initial.number ?? "");
  const [url, setUrl] = useState(initial.url ?? "");
  const errors = state.errors ?? {};
  const id = `${mode}-${orderId}`;

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="orderId" value={orderId} />
      <div>
        <label htmlFor={`${id}-company`} className={label}>
          Empresa de transporte
        </label>
        <input
          id={`${id}-company`}
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="DAC, Correo Uruguayo, Mirtrans…"
          maxLength={80}
          aria-invalid={!!errors.company}
          className={input}
        />
        {errors.company && <p role="alert" className="mt-1 text-xs text-error">{errors.company}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-number`} className={label}>
            Código de seguimiento <span className="normal-case tracking-normal text-stone">(opcional)</span>
          </label>
          <input id={`${id}-number`} name="number" value={number} onChange={(e) => setNumber(e.target.value)} maxLength={80} autoComplete="off" className={input} />
        </div>
        <div>
          <label htmlFor={`${id}-url`} className={label}>
            Enlace de seguimiento <span className="normal-case tracking-normal text-stone">(opcional)</span>
          </label>
          <input
            id={`${id}-url`}
            name="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="url"
            inputMode="url"
            placeholder="https://"
            maxLength={500}
            aria-invalid={!!errors.url}
            className={input}
          />
          {errors.url && <p role="alert" className="mt-1 text-xs text-error">{errors.url}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={buttonStyles({ size: "md" })}>
          {pending ? "Guardando…" : mode === "ship" ? "Marcar como enviado" : "Guardar seguimiento"}
        </button>
        <Feedback result={state} />
      </div>
    </form>
  );
}

export function NotesForm({ orderId, initial }: { orderId: string; initial: string }) {
  const [state, action, pending] = useActionState<OrderActionResult, FormData>(saveOrderNotes, {});
  const [notes, setNotes] = useState(initial);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <label htmlFor="admin-notes" className="sr-only">
        Notas internas
      </label>
      <textarea
        id="admin-notes"
        name="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Solo las ves vos: aclaraciones, acuerdos con el cliente, etc."
        className={cn(input, "h-auto py-3 leading-relaxed")}
      />
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={buttonStyles({ variant: "outline", size: "md" })}>
          {pending ? "Guardando…" : "Guardar notas"}
        </button>
        <Feedback result={state.ok || state.error ? state : null} />
      </div>
    </form>
  );
}

export function ResolveAttentionButton({ orderId }: { orderId: string }) {
  const { pending, result, run } = useQuickAction();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={pending} onClick={() => run(() => resolveAttention(orderId))} className={buttonStyles({ variant: "outline", size: "md" })}>
        {pending ? "Guardando…" : "Marcar como resuelto"}
      </button>
      <Feedback result={result?.error ? result : null} />
    </div>
  );
}
