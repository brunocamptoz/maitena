import { Reveal } from "@/components/ui/reveal";

/** Solo información ya definida: envíos dentro de Uruguay y pago con Mercado Pago. */
const items = [
  {
    title: "Envíos a todo Uruguay",
    text: "Elegís tu departamento al finalizar la compra y te avisamos por email cuando tu pedido sale.",
  },
  {
    title: "Pago seguro",
    text: "Pagás con Mercado Pago. Nosotros nunca vemos ni guardamos los datos de tu tarjeta.",
  },
  {
    title: "Seguimiento",
    text: "Recibís la confirmación de tu compra y el código de seguimiento directamente en tu correo.",
  },
];

export function Assurances() {
  return (
    <section className="border-y border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-3 md:gap-16 md:px-10 md:py-24">
        {items.map((item, i) => (
          <Reveal key={item.title} delay={i * 100}>
            <span className="text-[10px] uppercase tracking-[0.35em] text-stone">
              0{i + 1}
            </span>
            <h3 className="mt-4 font-serif text-3xl font-light">{item.title}</h3>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-stone">
              {item.text}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
