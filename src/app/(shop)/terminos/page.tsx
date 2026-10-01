import type { Metadata } from "next";
import { LegalPage, L, Owner, Section, StoreEmail } from "@/components/legal/legal-page";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones para comprar en Maitena Joyas: precios, pagos, envíos, cambios y devoluciones.",
  alternates: { canonical: "/terminos" },
};

/*
 * BORRADOR para revisión de un abogado antes del lanzamiento (ver README → "Checklist antes de lanzar").
 * Base normativa: Ley 17.250 de Relaciones de Consumo (art. 16, derecho de arrepentimiento en ventas a
 * distancia; arts. 28-31, contratos de adhesión y cláusulas abusivas) y Ley 18.331 de protección de datos.
 * No incluye datos que no están definidos (razón social, RUT, domicilio, plazos): salen de config/legal.ts.
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Términos y condiciones"
      intro={
        <>
          Estas condiciones regulan las compras que hacés en {site.name} a través de este sitio. Te pedimos que las
          leas antes de comprar: al finalizar tu compra las aceptás.
        </>
      }
    >
      <Section title="1. Quiénes somos">
        <p>
          La tienda {site.name} es operada por <Owner />. Podés comunicarte con nosotros por los medios que figuran en la
          página de <L href="/contacto">contacto</L>.
        </p>
      </Section>

      <Section title="2. Qué vendemos y cómo se muestra">
        <p>
          Vendemos joyas y accesorios de plata. Las fotografías y descripciones buscan mostrar el producto con la mayor
          fidelidad posible; pueden existir pequeñas diferencias de color o tono según la pantalla desde la que lo veas.
        </p>
        <p>
          Cada producto tiene unidades limitadas. La disponibilidad que ves en el sitio es la vigente al momento de tu
          consulta.
        </p>
      </Section>

      <Section title="3. Precios y moneda">
        <p>
          Los precios están expresados en <strong>pesos uruguayos</strong>. El costo de envío se calcula al finalizar la
          compra y se muestra, junto con el total, antes de que pagues. El total que ves antes de pagar es el que se
          cobra.
        </p>
        <p>
          Si detectamos un error evidente en un precio o en la disponibilidad de un producto, te lo comunicamos y podés
          elegir cancelar tu pedido con reintegro total de lo pagado.
        </p>
      </Section>

      <Section title="4. Cómo comprar">
        <ul>
          <li>No necesitás crear una cuenta: comprás como invitado.</li>
          <li>
            Agregás productos al carrito, completás tus datos de contacto y de entrega (que deben ser verdaderos y
            completos) y pasás al pago.
          </li>
          <li>
            Mientras completás el pago, reservamos las unidades de tu pedido por un tiempo limitado. Si el pago no se
            completa, el pedido se cancela y las unidades vuelven a estar disponibles.
          </li>
          <li>
            Tu compra queda <strong>confirmada cuando Mercado Pago aprueba el pago</strong>. Ahí te enviamos un email de
            confirmación. Hasta entonces el pedido no está confirmado.
          </li>
        </ul>
      </Section>

      <Section title="5. Medios de pago">
        <p>
          Los pagos se realizan a través de <strong>Mercado Pago</strong>, con los medios que esa plataforma ofrezca al
          momento de pagar. Nosotros no vemos ni guardamos los datos de tu tarjeta: los recibe directamente Mercado
          Pago, que se rige por sus propios términos y políticas.
        </p>
      </Section>

      <Section title="6. Envíos">
        <p>
          Enviamos a todo Uruguay. Las condiciones, el costo y el seguimiento están en la página de{" "}
          <L href="/envios">envíos</L>, que forma parte de estos términos.
        </p>
      </Section>

      <Section title="7. Arrepentimiento, cambios, devoluciones y garantía">
        <p>
          Al tratarse de una venta a distancia, tenés derecho a arrepentirte dentro de los <strong>cinco días hábiles</strong>{" "}
          contados desde la compra o desde la entrega del producto, en los términos del artículo 16 de la Ley 17.250.
          También te amparan las garantías que establece esa ley para productos con defectos. El detalle y cómo ejercer
          estos derechos está en <L href="/cambios-y-devoluciones">cambios y devoluciones</L>.
        </p>
      </Section>

      <Section title="8. Propiedad intelectual">
        <p>
          La marca {site.name}, el logo, las fotografías, los textos y el diseño de este sitio pertenecen a su titular o
          se usan con autorización. No pueden copiarse ni utilizarse con fines comerciales sin permiso por escrito.
        </p>
      </Section>

      <Section title="9. Datos personales">
        <p>
          Tratamos tus datos conforme a la Ley 18.331, como explicamos en nuestra{" "}
          <L href="/privacidad">política de privacidad</L>.
        </p>
      </Section>

      <Section title="10. Responsabilidad y disponibilidad del sitio">
        <p>
          Hacemos lo posible para que el sitio funcione de forma continua, pero puede haber interrupciones por
          mantenimiento o por causas ajenas a nosotros. Nada de lo dispuesto en estos términos limita las
          responsabilidades que la ley nos impone como proveedores ni los derechos que la ley te reconoce como
          consumidor.
        </p>
      </Section>

      <Section title="11. Cambios en estos términos">
        <p>
          Podemos actualizar estos términos. La versión vigente es la publicada en esta página, con su fecha de
          actualización, y se aplica a las compras realizadas a partir de esa fecha. Tu compra se rige por los términos
          vigentes cuando la hiciste.
        </p>
      </Section>

      <Section title="12. Ley aplicable y reclamos">
        <p>
          Estos términos se rigen por las leyes de la República Oriental del Uruguay y, en especial, por la Ley 17.250
          de Relaciones de Consumo. Ante cualquier diferencia, te pedimos que nos escribas primero a <StoreEmail /> para
          buscar una solución. También podés presentar tu reclamo ante el Área de Defensa del Consumidor del Ministerio
          de Economía y Finanzas.
        </p>
      </Section>
    </LegalPage>
  );
}
