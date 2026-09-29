/**
 * Datos de la marca. Todo lo que dice `null` es información que todavía no
 * tenemos: NO se muestra en el sitio hasta que se complete acá.
 */
export const site = {
  name: "Maitena Joyas",
  shortName: "Maitena",
  tagline: "Joyas y accesorios de plata",
  description:
    "Maitena Joyas: anillos, pulseras, cadenas y aros de plata. Envíos a todo Uruguay.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  currency: "UYU",
  locale: "es_UY",

  // TODO(cliente): completar con datos reales.
  contact: {
    email: null as string | null,
    whatsapp: null as string | null, // solo dígitos con código de país, ej. 598XXXXXXXX
    instagram: null as string | null, // solo el usuario, sin @
    address: null as string | null,
  },
} as const;

export const nav = [
  { href: "/categoria/anillos", label: "Anillos" },
  { href: "/categoria/pulseras", label: "Pulseras" },
  { href: "/categoria/cadenas", label: "Cadenas" },
  { href: "/categoria/aros", label: "Aros" },
] as const;
