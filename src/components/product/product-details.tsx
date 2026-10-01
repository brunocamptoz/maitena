import Link from "next/link";
import { Plus } from "lucide-react";
import { legal } from "@/config/legal";
import { getCategory } from "@/lib/categories";
import type { Product } from "@/lib/types";

const link = "text-ink underline underline-offset-4 decoration-ink/30 hover:decoration-ink";

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-t border-line py-5 last:border-b">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] uppercase tracking-[0.24em] [&::-webkit-details-marker]:hidden">
        {title}
        <Plus
          size={15}
          strokeWidth={1.25}
          className="transition-transform duration-300 group-open:rotate-45"
        />
      </summary>
      <div className="mt-4 text-[15px] leading-relaxed text-stone">{children}</div>
    </details>
  );
}

export function ProductDetails({ product }: { product: Product }) {
  const category = getCategory(product.category);

  return (
    <div>
      <Item title="Detalles">
        <dl className="grid grid-cols-[7rem_1fr] gap-y-2">
          <dt>Material</dt>
          <dd className="text-ink">Plata</dd>
          <dt>Categoría</dt>
          <dd className="text-ink">
            <Link href={`/categoria/${product.category}`} className={link}>
              {category?.name}
            </Link>
          </dd>
        </dl>
      </Item>
      <Item title="Envíos">
        Enviamos a todo Uruguay{legal.carrier ? ` por ${legal.carrier}` : ""}. El costo se calcula al finalizar la compra, antes de pagar.{" "}
        <Link href="/envios" className={link}>
          Más información
        </Link>
      </Item>
      <Item title="Cambios y devoluciones">
        Conocé cómo funcionan los cambios y devoluciones en nuestra{" "}
        <Link href="/cambios-y-devoluciones" className={link}>
          política
        </Link>
        .
      </Item>
    </div>
  );
}
