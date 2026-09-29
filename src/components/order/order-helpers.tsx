"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getPaymentRetryUrl } from "@/app/actions/checkout";
import { buttonStyles } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart/store";
import { CHECKOUT_DRAFT_KEY } from "@/lib/checkout/draft-key";

/**
 * Mientras el pago se confirma, vuelve a leer el pedido cada pocos segundos: el aviso de Mercado Pago
 * puede tardar. Se detiene solo a los 2 minutos.
 */
export function OrderPoller({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      router.refresh();
      if (tries >= 30) clearInterval(id);
    }, 4000);
    return () => clearInterval(id);
  }, [active, router]);

  return null;
}

/** Una vez pagado, el carrito y los datos del formulario ya no hacen falta. */
export function ClearCartOnPaid() {
  const hydrated = useCartStore((s) => s.hydrated);

  useEffect(() => {
    // Recién después de leer el carrito guardado: si no, la lectura lo volvería a traer.
    if (!hydrated) return;
    useCartStore.getState().clear();
    try {
      sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
    } catch {
      /* noop */
    }
  }, [hydrated]);

  return null;
}

export function RetryPaymentButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      const result = await getPaymentRetryUrl(token);
      if (result.ok) {
        window.location.assign(result.url);
        return;
      }
      setError(result.message);
    } catch {
      setError("No pudimos retomar el pago. Revisá tu conexión e intentá de nuevo.");
    }
    setBusy(false);
  }

  return (
    <div>
      <button type="button" onClick={retry} disabled={busy} className={buttonStyles()}>
        {busy ? "Un momento…" : "Volver a intentar el pago"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
