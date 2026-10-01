"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { syncFees } from "@/app/admin/(panel)/ventas/actions";

/**
 * Si hay ventas del mes sin la comisión guardada, la pide a Mercado Pago (una vez por visita) y recarga la
 * lista. Se hace desde el navegador para que la página abra al instante en vez de esperar a Mercado Pago.
 */
export function FeeSync({ month, pending }: { month: string; pending: number }) {
  const router = useRouter();
  const started = useRef(false);
  const [state, setState] = useState<"working" | "done" | "error">(pending > 0 ? "working" : "done");

  useEffect(() => {
    if (pending <= 0 || started.current) return;
    started.current = true;
    syncFees(month)
      .then((result) => setState(result.error ? "error" : "done"))
      .catch(() => setState("error"))
      .finally(() => router.refresh());
  }, [month, pending, router]);

  if (state === "working") {
    return (
      <p role="status" className="mb-6 text-sm text-stone">
        Consultando las comisiones a Mercado Pago…
      </p>
    );
  }
  if (state === "error") {
    return (
      <p role="alert" className="mb-6 text-sm text-error">
        No se pudieron consultar todas las comisiones a Mercado Pago. Volvé a abrir esta página en unos minutos.
      </p>
    );
  }
  return null;
}
