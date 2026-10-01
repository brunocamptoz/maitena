import type { Metadata } from "next";
import { LegalPage, L, Section, StoreEmail } from "@/components/legal/legal-page";
import { legal } from "@/config/legal";

export const metadata: Metadata = {
  title: "Cambios y devoluciones",
  description: "Tus derechos como consumidor y cómo pedir una devolución, un cambio o la garantía de un producto.",
  alternates: { canonical: "/cambios-y-devoluciones" },
};

export default function ReturnsPage() {
  return (
    <LegalPage
      title="Cambios y devoluciones"
      intro="Queremos que estés conforme con tu compra. Acá te explicamos tus derechos y cómo ejercerlos."
    >
      <Section title="Derecho de arrepentimiento: 5 días hábiles">
        <p>
          Como la compra se hace por internet, tenés derecho a <strong>arrepentirte</strong> y dejar sin efecto el
          contrato dentro de los <strong>cinco días hábiles</strong> contados desde la compra o desde que recibís el
          producto, a tu sola opción y sin responsabilidad alguna de tu parte. Es un derecho que te reconoce el
          artículo 16 de la <L href="https://www.impo.com.uy/bases/leyes/17250-2000">Ley 17.250 de Relaciones de Consumo</L>.
        </p>
        <p>
          Para ejercerlo, comunicanos tu decisión por un medio que deje constancia: escribinos a <StoreEmail /> con tu
          nombre y tu número de pedido.
        </p>
      </Section>

      <Section title="Cómo hacemos la devolución">
        <ul>
          <li>Después de tu aviso te indicamos por email cómo y dónde entregar el producto.</li>
          <li>
            Para poder revisarlo y reintegrarte el dinero, necesitamos que el producto vuelva en las mismas condiciones
            en que lo recibiste, con su empaque.
          </li>
          <li>
            Una vez recibido, te devolvemos el dinero por el mismo medio de pago, a través de Mercado Pago. El plazo en
            que se acredita depende de Mercado Pago y de tu medio de pago.
          </li>
        </ul>
      </Section>

      <Section title="Cambios">
        {legal.exchangePolicy ? (
          <p>{legal.exchangePolicy}</p>
        ) : (
          <p>
            Si querés cambiar un producto, escribinos a <StoreEmail /> con tu número de pedido y vemos cómo hacerlo.
          </p>
        )}
      </Section>

      <Section title="Productos con defectos o distintos a lo que compraste">
        <p>
          Si tu producto llegó con un defecto o no es el que compraste, escribinos lo antes posible con tu número de
          pedido y fotos. Tenés los derechos de garantía que establece la Ley 17.250, y nos hacemos cargo según
          corresponda.
        </p>
      </Section>

      <Section title="Si necesitás cancelar un pedido">
        <p>
          Si todavía no despachamos tu pedido y querés cancelarlo, escribinos cuanto antes y lo gestionamos. Cuando el
          pedido ya fue enviado, aplica lo explicado más arriba.
        </p>
      </Section>

      <Section title="Si no estás conforme">
        <p>
          Podés presentar tu reclamo ante el Área de Defensa del Consumidor del Ministerio de Economía y Finanzas. Antes,
          nos gustaría poder resolverlo con vos: <L href="/contacto">escribinos</L>.
        </p>
      </Section>
    </LegalPage>
  );
}
