import type { MetadataRoute } from "next";
import { site } from "@/config/site";

/** Datos para cuando alguien agrega el sitio a la pantalla de inicio del teléfono. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.shortName,
    description: site.description,
    lang: "es-UY",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#0b0b0b",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
