import Image from "next/image";
import Link from "next/link";
import { nav, site } from "@/config/site";

const info = [
  { href: "/envios", label: "Envíos" },
  { href: "/cambios-y-devoluciones", label: "Cambios y devoluciones" },
  { href: "/contacto", label: "Contacto" },
];
const legal = [
  { href: "/privacidad", label: "Privacidad" },
  { href: "/terminos", label: "Términos y condiciones" },
];

const col = "text-sm text-paper/60 transition-colors hover:text-paper";
const heading = "mb-5 text-[10px] uppercase tracking-[0.3em] text-paper/55";

export function Footer() {
  const { instagram, whatsapp, email } = site.contact;
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-16 md:px-10 md:pt-24">
        <div className="grid gap-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Image
              src="/brand/logo-square.png"
              alt={site.name}
              width={220}
              height={216}
              className="-ml-4 h-auto w-44 mix-blend-screen"
            />
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-paper/50">
              {site.tagline}. Envíos a todo Uruguay.
            </p>
          </div>

          <div>
            <h2 className={heading}>Tienda</h2>
            <ul className="space-y-3">
              {nav.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} className={col}>
                    {i.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/catalogo" className={col}>
                  Ver todo
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className={heading}>Ayuda</h2>
            <ul className="space-y-3">
              {info.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} className={col}>
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={heading}>Seguinos</h2>
            <ul className="space-y-3">
              {instagram && (
                <li>
                  <a
                    href={`https://instagram.com/${instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={col}
                  >
                    Instagram
                  </a>
                </li>
              )}
              {whatsapp && (
                <li>
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={col}
                  >
                    WhatsApp
                  </a>
                </li>
              )}
              {email && (
                <li>
                  <a href={`mailto:${email}`} className={col}>
                    {email}
                  </a>
                </li>
              )}
              {!instagram && !whatsapp && !email && (
                <li>
                  <Link href="/contacto" className={col}>
                    Contacto
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-paper/10 pt-6 text-xs text-paper/55 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. Todos los derechos reservados.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legal.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="transition-colors hover:text-paper">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
