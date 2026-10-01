import type { Metadata } from "next";
import { LegalPage, L, Owner, Section, StoreEmail } from "@/components/legal/legal-page";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos personales recogemos al comprar, para qué los usamos y cuáles son tus derechos.",
  alternates: { canonical: "/privacidad" },
};

/*
 * BORRADOR para revisión de un abogado antes del lanzamiento (ver README → "Checklist antes de lanzar").
 * Base normativa: Ley 18.331 de Protección de Datos Personales (arts. 5, 9, 10, 13, 14, 15, 23, 28-29).
 * Refleja lo que el sitio hace HOY: sin cuentas de usuario, sin analíticas ni publicidad, carrito en el navegador,
 * proveedores: Mercado Pago (pagos), Supabase (base de datos), Vercel (alojamiento) y Resend (emails).
 * Pendiente fuera del código: inscribir la base de datos en la URCDP (Ley 18.331, arts. 28-29).
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      intro="Te explicamos qué datos personales usamos cuando comprás en nuestra tienda, para qué y qué derechos tenés sobre ellos."
    >
      <Section title="1. Responsable">
        <p>
          El responsable del tratamiento de tus datos es <Owner />. Para cualquier consulta sobre esta política o sobre
          tus datos, escribinos a <StoreEmail />.
        </p>
      </Section>

      <Section title="2. Qué datos recogemos">
        <p>
          No hay cuentas de usuario: solo recogemos los datos que nos das cuando comprás o nos escribís.
        </p>
        <ul>
          <li>
            <strong>Datos de la compra:</strong> nombre, apellido, email, teléfono y datos de entrega (departamento,
            ciudad, dirección, número de puerta, apartamento, código postal e indicaciones para el envío).
          </li>
          <li>
            <strong>Datos del pedido:</strong> productos, montos, estado del pedido y del pago, y el identificador del
            pago en Mercado Pago. <strong>No vemos ni guardamos los datos de tu tarjeta</strong>: los recibe Mercado Pago.
          </li>
          <li>
            <strong>Tus mensajes:</strong> lo que nos escribas por email o por redes.
          </li>
          <li>
            <strong>Datos técnicos mínimos</strong> que generan los servidores al visitar el sitio (por ejemplo,
            registros de errores y de acceso).
          </li>
        </ul>
      </Section>

      <Section title="3. Para qué los usamos">
        <ul>
          <li>Procesar tu compra, confirmar el pago y entregarte el pedido.</li>
          <li>
            Enviarte los emails de tu pedido: confirmación de compra y aviso de envío con el código de seguimiento.
          </li>
          <li>Atender tus consultas, cambios, devoluciones y reclamos.</li>
          <li>Cumplir obligaciones legales, contables y tributarias.</li>
        </ul>
        <p>
          No usamos tus datos para enviarte publicidad ni los compartimos con terceros con fines comerciales. Los datos
          que nos das son necesarios para poder venderte y enviarte el producto; sin ellos no podemos completar la
          compra.
        </p>
      </Section>

      <Section title="4. Tu consentimiento">
        <p>
          Al finalizar la compra aceptás estos términos y esta política, y consentís el tratamiento de tus datos para
          las finalidades indicadas, en los términos de la Ley 18.331. Esos datos son necesarios para cumplir el
          contrato de compra que celebrás con nosotros.
        </p>
      </Section>

      <Section title="5. Con quién compartimos tus datos">
        <p>Solo con quienes necesitamos para cumplir tu compra, y únicamente los datos necesarios:</p>
        <ul>
          <li>
            <strong>Mercado Pago:</strong> procesa el pago. Se rige por sus propias políticas.
          </li>
          <li>
            <strong>Empresas de transporte:</strong> reciben tu nombre, teléfono y dirección para entregarte el pedido.
          </li>
          <li>
            <strong>Proveedores tecnológicos</strong> que procesan datos por cuenta nuestra: Supabase (base de datos),
            Vercel (alojamiento del sitio) y Resend (envío de emails).
          </li>
          <li>Autoridades, cuando la ley nos lo exija.</li>
        </ul>
      </Section>

      <Section title="6. Transferencias fuera de Uruguay">
        <p>
          Algunos de esos proveedores tecnológicos pueden almacenar o procesar datos en servidores ubicados fuera de
          Uruguay. Lo hacemos únicamente para prestarte el servicio y con proveedores que aplican medidas de seguridad;
          al aceptar esta política consentís esa transferencia, conforme al artículo 23 de la Ley 18.331.
        </p>
      </Section>

      <Section title="7. Cuánto tiempo los conservamos">
        <p>
          Conservamos tus datos durante el tiempo necesario para cumplir con tu compra, atender garantías y reclamos, y
          cumplir las obligaciones legales que nos alcanzan. Después los eliminamos o los anonimizamos.
        </p>
      </Section>

      <Section title="8. Seguridad">
        <p>
          Adoptamos medidas técnicas y organizativas razonables para proteger tus datos contra accesos no autorizados,
          pérdida o alteración: el sitio funciona sobre conexión segura (HTTPS), el acceso a la información de los
          pedidos está restringido a quienes administran la tienda, y mantenemos reserva sobre tus datos.
        </p>
      </Section>

      <Section title="9. Tus derechos">
        <p>
          Tenés derecho a <strong>acceder</strong> a tus datos (de forma gratuita, a intervalos no menores a seis meses),
          y a pedir su <strong>rectificación, actualización, inclusión o supresión</strong>, según la Ley 18.331. Para
          ejercerlos, escribinos a <StoreEmail /> indicando tu nombre y tu número de pedido: respondemos dentro de los
          cinco días hábiles.
        </p>
        <p>
          Si considerás que no atendimos bien tu pedido, podés presentar tu reclamo ante la{" "}
          <L href="https://www.gub.uy/unidad-reguladora-control-datos-personales">
            Unidad Reguladora y de Control de Datos Personales (URCDP)
          </L>
          .
        </p>
      </Section>

      <Section title="10. Cookies y almacenamiento en tu navegador">
        <p>
          {site.name} <strong>no usa cookies de seguimiento, de publicidad ni herramientas de analítica</strong>. Para que
          la tienda funcione guardamos en tu navegador el contenido de tu carrito y, mientras completás la compra, los
          datos que vas cargando en el formulario (se borran al pagar). Podés eliminarlos desde la configuración de tu
          navegador.
        </p>
      </Section>

      <Section title="11. Cambios en esta política">
        <p>
          Si cambiamos esta política publicaremos la nueva versión en esta página, con su fecha de actualización. Si el
          cambio es importante, te lo haremos saber.
        </p>
      </Section>
    </LegalPage>
  );
}
