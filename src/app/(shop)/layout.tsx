import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartSync } from "@/components/cart/cart-sync";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ShippingBanner } from "@/components/layout/shipping-banner";

/** Estructura de la tienda pública (el panel /admin tiene la suya). */
export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <ShippingBanner />
      <Header />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <Footer />
      <CartDrawer />
      <CartSync />
    </>
  );
}
