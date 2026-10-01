"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonStyles } from "@/components/ui/button";

/** Si una página de la tienda falla, se muestra esto (con la cabecera y el pie intactos) en vez de una pantalla en blanco. */
export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[tienda] error de página:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-5 py-32 text-center md:py-44">
      <p className="text-[11px] uppercase tracking-[0.4em] text-stone">Algo salió mal</p>
      <h1 className="mt-6 font-serif text-5xl font-light leading-none md:text-7xl">No pudimos cargar esta página</h1>
      <p className="mt-8 max-w-md text-[15px] leading-relaxed text-stone">
        Fue un problema nuestro, no tuyo. Probá de nuevo; si sigue pasando, volvé al inicio o escribinos.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <button type="button" onClick={reset} className={buttonStyles({ size: "md" })}>
          Reintentar
        </button>
        <Link href="/" className={buttonStyles({ variant: "outline", size: "md" })}>
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
