import { Reveal } from "@/components/ui/reveal";
import { legal } from "@/config/legal";

/** Solo información ya definida: envíos dentro de Uruguay (por DAC) y pago con Mercado Pago. */
const items = [
  {
    emoji: "📦",
    title: "Envíos a todo Uruguay",
    text: `Ingresás tu dirección y te despachamos tu pedido${legal.carrier ? ` por ${legal.carrier}` : ""}.`,
  },
  {
    emoji: "💳",
    title: "Pago seguro",
    text: "Pagás de la forma que más te guste, a través de Mercado Pago.",
  },
  {
    emoji: "📬",
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
            {/* El emoji es decorativo: el título ya dice lo mismo. */}
            <span aria-hidden="true" className="block text-3xl leading-none">
              {item.emoji}
            </span>
            <span className="mt-5 block text-[10px] uppercase tracking-[0.35em] text-stone">
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
