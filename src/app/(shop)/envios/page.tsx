import type { Metadata } from "next";
import { LegalPage, L, Section, StoreEmail } from "@/components/legal/legal-page";
import { legal } from "@/config/legal";
import { formatPrice } from "@/lib/format";
import { getFreeShippingFrom } from "@/lib/store-settings";

export const metadata: Metadata = {
  title: "Envíos",
  description: "Cómo enviamos tus pedidos a todo Uruguay: costo, seguimiento y entrega.",
  alternates: { canonical: "/envios" },
};

export default async function ShippingPage() {
  const freeFrom = await getFreeShippingFrom();
  const carrier = legal.carrier;

  return (
    <LegalPage title="Envíos" intro="Enviamos a todo Uruguay. Esto es lo que tenés que saber antes de comprar.">
      <Section title="Dónde enviamos">
        <p>
          Hacemos envíos a todos los departamentos de Uruguay{carrier ? <> a través de <strong>{carrier}</strong></> : null}. Por ahora no enviamos al exterior. Elegís tu
          departamento y cargás tu dirección al finalizar la compra.
        </p>
      </Section>

      <Section title="Costo de envío">
        <p>
          El costo del envío se calcula al finalizar la compra y lo ves <strong>antes de pagar</strong>, junto con el
          total de tu pedido. No hay cargos que se agreguen después.
        </p>
        {freeFrom !== null && (
          <p>
            <strong>Envío gratis en compras desde {formatPrice(freeFrom)}</strong> (se calcula sobre el valor de los
            productos).
          </p>
        )}
      </Section>

      <Section title="Cómo se prepara y se envía tu pedido">
        <ul>
          <li>Cuando Mercado Pago aprueba tu pago, te llega por email la confirmación de tu pedido.</li>
          <li>
            {carrier
              ? `Cuando lo despachamos con ${carrier} te enviamos otro email con el código de seguimiento y, si lo tiene, un enlace para seguir el envío.`
              : "Cuando lo despachamos te enviamos otro email con la empresa de transporte, el código de seguimiento y, si lo tiene, un enlace para seguir el envío."}
          </li>
          <li>
            Podés ver el estado de tu pedido en cualquier momento desde el enlace que figura en esos emails.
          </li>
        </ul>
      </Section>

      <Section title="Plazo de entrega">
        {legal.deliveryTime ? (
          <p>{legal.deliveryTime}</p>
        ) : (
          <p>
            El plazo de entrega depende de {carrier ?? "la empresa de transporte"} y de tu departamento. Te avisamos por email en
            cuanto tu pedido sale.
          </p>
        )}
      </Section>

      <Section title="Tu dirección y tus datos de contacto">
        <p>
          Revisá bien la dirección, el número de puerta y tu teléfono antes de pagar: los usa {carrier ?? "la empresa de transporte"}{" "}
          para entregarte el pedido. Si te equivocaste en algún dato, escribinos <strong>lo antes posible</strong> a{" "}
          <StoreEmail />. Si el pedido ya salió, no siempre se puede cambiar la dirección.
        </p>
      </Section>

      <Section title="Cuando recibís tu pedido">
        <p>
          Revisá el paquete al recibirlo. Si llega dañado o no es lo que compraste, escribinos enseguida con fotos y tu
          número de pedido. Más información en <L href="/cambios-y-devoluciones">Cambios y devoluciones</L>.
        </p>
        <p>
          ¿Dudas sobre un envío? Mirá nuestros <L href="/contacto">datos de contacto</L>.
        </p>
      </Section>
    </LegalPage>
  );
}
