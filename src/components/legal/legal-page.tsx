import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { LEGAL_UPDATED, legal } from "@/config/legal";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";

/** Enlace dentro del texto legal. */
export function L({ href, children }: { href: string; children: ReactNode }) {
  const external = /^(https?:|mailto:)/.test(href);
  const cls = "text-ink underline underline-offset-4 decoration-ink/30 hover:decoration-ink";
  return external ? (
    <a href={href} className={cls} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/** Dirección de email de la tienda como enlace (o un texto neutro si todavía no se cargó). */
export function StoreEmail() {
  const email = site.contact.email;
  return email ? <L href={`mailto:${email}`}>{email}</L> : <>nuestro canal de contacto</>;
}

/** Quién es el titular de la tienda: solo con los datos que realmente se cargaron en `config/legal.ts`. */
export function Owner() {
  return (
    <>
      <strong>{legal.businessName ?? site.name}</strong>
      {legal.rut && <> (RUT {legal.rut})</>}
      {legal.address && <>, con domicilio en {legal.address}</>}
    </>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-8">
      <h2 className="font-serif text-2xl font-light leading-snug md:text-3xl">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink/75 [&_strong]:font-medium [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

/**
 * Estructura común de las páginas legales: migas, título, fecha de actualización y secciones.
 * Los textos NO son asesoramiento legal: deben ser revisados por un abogado antes del lanzamiento.
 */
export function LegalPage({
  title,
  intro,
  children,
  className,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-8 md:px-10 md:pb-36 md:pt-12">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: title }]} />
      <div className={cn("mt-10 max-w-3xl md:mt-14", className)}>
        <h1 className="font-serif text-5xl font-light leading-none md:text-7xl">{title}</h1>
        <p className="mt-5 text-[11px] uppercase tracking-[0.24em] text-stone">Actualizado el {LEGAL_UPDATED}</p>
        {intro && <p className="mt-8 text-lg leading-relaxed text-ink/80">{intro}</p>}
        <div className="mt-12 space-y-10 md:mt-16 md:space-y-12">{children}</div>
      </div>
    </div>
  );
}
