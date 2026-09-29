import { syncCart } from "@/app/actions/cart";
import { useCartStore } from "@/lib/cart/store";

let inFlight: Promise<void> | null = null;

/** Pide al servidor el precio/stock actuales de lo que hay en el carrito y lo aplica. */
export function refreshCart() {
  if (inFlight) return inFlight;
  const { lines, applyServerData } = useCartStore.getState();
  if (lines.length === 0) return Promise.resolve();

  inFlight = syncCart(
    lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
  )
    .then(applyServerData)
    .catch(() => {
      /* sin conexión: se conserva lo que había */
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
