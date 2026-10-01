import type { Metadata } from "next";
import { LegalPage, L, Section } from "@/components/legal/legal-page";
import { legal } from "@/config/legal";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Cómo comunicarte con Maitena Joyas por consultas, pedidos, cambios o reclamos.",
  alternates: { canonical: "/contacto" },
};

export default function ContactPage() {
  const { email, instagram, whatsapp } = site.contact;
  const hasChannel = !!(email || instagram || whatsapp);

  return (
    <LegalPage title="Contacto" intro="Escribinos por cualquier consulta sobre un producto, un pedido, un cambio o una devolución.">
      <Section title="Cómo comunicarte">
        {hasChannel ? (
          <ul>
            {email && (
              <li>
                Email: <L href={`mailto:${email}`}>{email}</L>
              </li>
            )}
            {whatsapp && (
              <li>
                WhatsApp: <L href={`https://wa.me/${whatsapp}`}>escribinos por WhatsApp</L>
              </li>
            )}
            {instagram && (
              <li>
                Instagram: <L href={`https://instagram.com/${instagram}`}>@{instagram}</L>
              </li>
            )}
          </ul>
        ) : (
          <p>Estamos terminando de cargar nuestros datos de contacto. Volvé a visitarnos en unos días.</p>
        )}
        <p>
          Para ayudarte más rápido, si tu consulta es sobre una compra, incluí tu <strong>número de pedido</strong> y el
          nombre con el que compraste. Los reclamos y el ejercicio del derecho de arrepentimiento conviene enviarlos por
          email, para que quede constancia.
        </p>
      </Section>

      {(legal.businessName || legal.rut || legal.address) && (
        <Section title="Datos del titular">
          <ul>
            {legal.businessName && <li>{legal.businessName}</li>}
            {legal.rut && <li>RUT: {legal.rut}</li>}
            {legal.address && <li>{legal.address}</li>}
          </ul>
        </Section>
      )}

      <Section title="Más información">
        <ul>
          <li>
            <L href="/envios">Envíos</L>
          </li>
          <li>
            <L href="/cambios-y-devoluciones">Cambios y devoluciones</L>
          </li>
          <li>
            <L href="/privacidad">Política de privacidad</L>
          </li>
          <li>
            <L href="/terminos">Términos y condiciones</L>
          </li>
        </ul>
      </Section>
    </LegalPage>
  );
}
