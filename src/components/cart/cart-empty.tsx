import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { categories } from "@/lib/categories";

export function CartEmpty({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <ShoppingBag size={34} strokeWidth={0.75} aria-hidden="true" className="text-stone" />
      <p className="mt-6 font-serif text-3xl font-light">Tu carrito está vacío</p>
      <p className="mt-3 max-w-xs text-[15px] text-stone">
        Cuando agregues piezas las vas a ver acá.
      </p>
      <Link
        href="/catalogo"
        onClick={onNavigate}
        className={buttonStyles({ className: "mt-10" })}
      >
        Explorar colección
      </Link>
      <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
        {categories.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/categoria/${c.slug}`}
              onClick={onNavigate}
              className="text-[11px] uppercase tracking-[0.2em] text-stone transition-colors hover:text-ink"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
