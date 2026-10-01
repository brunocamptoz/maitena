import { formatPrice } from "@/lib/format";
import { getFreeShippingFrom } from "@/lib/store-settings";

/**
 * Cartel de ancho completo sobre el encabezado: "Envío gratis a partir de $ X". El monto es el que se guarda en
 * el panel (Envíos → Envío gratis desde); si no hay promoción configurada no se muestra nada.
 */
export async function ShippingBanner() {
  const from = await getFreeShippingFrom();
  if (from === null) return null;

  return (
    <div className="bg-silver text-ink">
      <p className="mx-auto max-w-7xl px-5 py-2.5 text-center text-[10px] uppercase tracking-[0.24em] md:px-10 md:text-[11px]">
        Envío gratis a partir de <strong className="font-medium">{formatPrice(from)}</strong>
      </p>
    </div>
  );
}
