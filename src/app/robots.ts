import type { MetadataRoute } from "next";
import { site } from "@/config/site";

/**
 * Qué pueden indexar los buscadores. Quedan fuera el panel, las rutas internas y las páginas privadas del
 * proceso de compra (carrito, checkout y el seguimiento de cada pedido). Los despliegues de prueba (previews
 * de Vercel) no se indexan nunca.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/checkout", "/carrito", "/pedido/"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
