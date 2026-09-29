"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { CartEmpty } from "@/components/cart/cart-empty";
import { CartLineItem } from "@/components/cart/cart-line";
import { CartSummary } from "@/components/cart/cart-summary";
import { selectCount, useCartStore } from "@/lib/cart/store";
import { refreshCart } from "@/lib/cart/sync";

/** Carrito lateral. Usa <dialog> nativo: foco atrapado, Esc para cerrar y fondo inerte sin código extra. */
export function CartDrawer() {
  const ref = useRef<HTMLDialogElement>(null);
  const isOpen = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.close);
  const lines = useCartStore((s) => s.lines);
  const hydrated = useCartStore((s) => s.hydrated);
  const count = useCartStore(selectCount);
  const pathname = usePathname();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
      void refreshCart();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Al navegar a otra página, se cierra.
  useEffect(() => {
    close();
  }, [pathname, close]);

  const empty = hydrated && lines.length === 0;

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-labelledby="cart-title"
      onClose={close}
      onClick={(e) => {
        // Un clic sobre el fondo oscuro llega al <dialog> mismo.
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 id="cart-title" className="font-serif text-2xl font-light">
            Carrito
            {count > 0 && <span className="ml-2 text-base text-stone">({count})</span>}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar carrito"
            className="-mr-2 flex h-11 w-11 items-center justify-center"
          >
            <X size={22} strokeWidth={1} />
          </button>
        </div>

        {empty ? (
          <div className="flex-1 overflow-y-auto">
            <CartEmpty onNavigate={close} />
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-6 py-6">
              {lines.map((line) => (
                <CartLineItem key={line.productId} line={line} />
              ))}
            </ul>
            <div className="border-t border-line px-6 pb-6 pt-5">
              <CartSummary onNavigate={close} showContinue={false} />
              <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.2em]">
                <button
                  type="button"
                  onClick={close}
                  className="text-stone underline decoration-line underline-offset-[8px] transition-colors hover:text-ink hover:decoration-ink"
                >
                  Seguir comprando
                </button>
                <Link
                  href="/carrito"
                  onClick={close}
                  className="text-stone underline decoration-line underline-offset-[8px] transition-colors hover:text-ink hover:decoration-ink"
                >
                  Ver carrito
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
