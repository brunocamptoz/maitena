import type { Metadata } from "next";
import { CartPageView } from "@/components/cart/cart-page-view";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = {
  title: "Carrito",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-8 md:px-10 md:pb-36 md:pt-12">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Carrito" }]} />
      <h1 className="mb-12 mt-10 font-serif text-5xl font-light leading-none md:mb-16 md:mt-14 md:text-7xl">
        Carrito
      </h1>
      <CartPageView />
    </div>
  );
}
