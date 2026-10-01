import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-32 text-center md:py-44">
      <p className="text-[11px] uppercase tracking-[0.4em] text-stone">Error 404</p>
      <h1 className="mt-6 font-serif text-5xl font-light leading-tight md:text-7xl">
        Esta página no existe
      </h1>
      <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-stone">
        Puede que el enlace haya cambiado o que la pieza ya no esté disponible.
      </p>
      <div className="mt-12 flex flex-wrap justify-center gap-4">
        <Link href="/catalogo" className={buttonStyles()}>
          Ver colección
        </Link>
        <Link href="/" className={buttonStyles({ variant: "outline" })}>
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
