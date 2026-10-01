import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartSync } from "@/components/cart/cart-sync";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ShippingBanner } from "@/components/layout/shipping-banner";

/** Estructura de la tienda pública (el panel /admin tiene la suya). */
export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* Para quien navega con teclado o lector de pantalla: salta el menú y va directo al contenido. */}
      <a
        href="#contenido"
        className="fixed left-3 top-3 z-[60] -translate-y-24 bg-paper px-5 py-3 text-[11px] uppercase tracking-[0.2em] text-ink shadow-lg transition-transform focus:translate-y-0"
      >
        Saltar al contenido
      </a>
      {/* Cartel y encabezado se quedan fijos juntos al hacer scroll. */}
      <div className="sticky top-0 z-40">
        <ShippingBanner />
        <Header />
      </div>
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <Footer />
      <CartDrawer />
      <CartSync />
    </>
  );
}
