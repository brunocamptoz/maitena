"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteProduct,
  setProductArchived,
  type ActionResult,
} from "@/app/admin/(panel)/productos/actions";
import { buttonStyles } from "@/components/ui/button";

/** Archivar / restaurar y borrar. Borrar solo funciona si el producto nunca se vendió (lo garantiza la base). */
export function ProductDanger({ productId, archived, name }: { productId: string; archived: boolean; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(job: () => Promise<ActionResult>, after?: () => void) {
    setError(null);
    start(async () => {
      const result = await job();
      if (result.error) setError(result.error);
      else after?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setProductArchived(productId, !archived))}
          className={buttonStyles({ variant: "outline", size: "md" })}
        >
          {archived ? "Restaurar producto" : "Archivar producto"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`¿Borrar “${name}” y sus fotos? Esto no se puede deshacer.`)) {
              run(() => deleteProduct(productId), () => router.push("/admin/productos"));
            }
          }}
          className={buttonStyles({ variant: "outline", size: "md", className: "border-error text-error hover:bg-error hover:text-paper" })}
        >
          Borrar definitivamente
        </button>
      </div>
      <p className="max-w-xl text-xs leading-relaxed text-stone">
        Archivar saca el producto de la tienda y del listado, pero lo conserva: es lo recomendable si ya se vendió. Borrar
        solo es posible si nunca se vendió.
      </p>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
