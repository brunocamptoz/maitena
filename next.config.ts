import type { NextConfig } from "next";

// Las fotografías subidas desde /admin viven en Supabase Storage (bucket público product-images).
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

/**
 * Encabezados de seguridad para todo el sitio. No incluyen una política CSP estricta a propósito: Next.js
 * inyecta scripts propios en la página y una CSP mal calibrada rompería el sitio; se puede sumar más adelante
 * con nonces si hace falta.
 */
const securityHeaders = [
  // El navegador no debe "adivinar" el tipo de un archivo (evita que un archivo se ejecute como otra cosa).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Al salir a otro sitio solo se envía el dominio, no la dirección completa (que puede llevar el token de un pedido).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nadie puede meter el sitio dentro de otro (clickjacking). El pago de Mercado Pago es una redirección, no un iframe.
  { key: "X-Frame-Options", value: "DENY" },
  // La tienda no usa cámara, micrófono ni ubicación.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/product-images/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
