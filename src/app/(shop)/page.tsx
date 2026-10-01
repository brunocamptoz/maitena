import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { CategoryShowcase } from "@/components/home/category-showcase";
import { NewArrivals } from "@/components/home/new-arrivals";
import { Assurances } from "@/components/home/assurances";
import { JsonLd } from "@/components/seo/json-ld";
import { site } from "@/config/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  const { email, instagram } = site.contact;

  // Datos de la marca para buscadores: solo lo que el negocio ya definió (lo que sea null no se incluye).
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    logo: `${site.url}/brand/logo-square.png`,
    description: site.description,
    areaServed: "UY",
    ...(email && { email }),
    ...(instagram && { sameAs: [`https://instagram.com/${instagram}`] }),
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    inLanguage: "es-UY",
  };

  return (
    <>
      <JsonLd data={organization} />
      <JsonLd data={website} />
      <Hero />
      <CategoryShowcase />
      <NewArrivals />
      <Assurances />
    </>
  );
}
