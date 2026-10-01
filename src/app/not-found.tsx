import Link from "next/link";

/** 404 para direcciones que no existen en ninguna parte del sitio (el de la tienda vive en (shop)/not-found.tsx). */
export default function GlobalNotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-5 py-32 text-center">
      <Link href="/" className="font-serif text-2xl font-light uppercase tracking-[0.32em]">
        Maitena
      </Link>
      <p className="mt-12 text-[11px] uppercase tracking-[0.4em] text-stone">Error 404</p>
      <h1 className="mt-6 font-serif text-5xl font-light leading-tight md:text-6xl">Esta página no existe</h1>
      <Link
        href="/catalogo"
        className="mt-12 inline-flex h-14 items-center bg-ink px-8 text-[11px] uppercase tracking-[0.28em] text-paper"
      >
        Ver colección
      </Link>
    </main>
  );
}
