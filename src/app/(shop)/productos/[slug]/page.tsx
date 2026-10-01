import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchase } from "@/components/product/product-purchase";
import { ProductDetails } from "@/components/product/product-details";
import { RelatedProducts } from "@/components/product/related-products";
import { JsonLd } from "@/components/seo/json-ld";
import { site } from "@/config/site";
import { getCategory } from "@/lib/categories";
import { availabilityLabel, formatPrice, getAvailability } from "@/lib/format";
import {
  getProduct,
  getRelatedProducts,
  listProductSlugs,
  toCardData,
} from "@/lib/products";
import { cn } from "@/lib/cn";

export async function generateStaticParams() {
  return (await listProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/productos/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) return {};

  const cover = product.images[0]?.url;
  // Las vistas previas sociales necesitan una imagen raster; las ilustraciones SVG de ejemplo no sirven.
  const ogImages =
    cover && !cover.endsWith(".svg") ? [{ url: cover, alt: product.name }] : undefined;

  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/productos/${product.slug}` },
    // Los productos de demostración no deben indexarse.
    robots: product.isDemo ? { index: false, follow: false } : undefined,
    openGraph: {
      title: product.name,
      description: product.description,
      images: ogImages,
    },
  };
}

export default async function ProductPage(props: PageProps<"/productos/[slug]">) {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const category = getCategory(product.category);
  const related = (await getRelatedProducts(product)).map(toCardData);
  const availability = getAvailability(product.stock);
  const paragraphs = product.description.split(/\n{2,}/);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.id,
    category: category?.name,
    image: product.images.map((i) => new URL(i.url, site.url).toString()),
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "Offer",
      url: `${site.url}/productos/${product.slug}`,
      priceCurrency: site.currency,
      price: product.price,
      availability:
        availability === "sold_out"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-8 md:px-10 md:pb-36 md:pt-12">
      <JsonLd data={jsonLd} />

      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: category?.name ?? "Catálogo", href: `/categoria/${product.category}` },
          { label: product.name },
        ]}
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-x-20 xl:gap-x-28">
        <ProductGallery images={product.images} name={product.name} category={product.category} />

        <div className="lg:sticky lg:top-36 lg:self-start">
          <Link
            href={`/categoria/${product.category}`}
            className="text-[11px] uppercase tracking-[0.4em] text-stone transition-colors hover:text-ink"
          >
            {category?.name}
          </Link>

          <h1 className="mt-4 font-serif text-4xl font-light leading-[1.05] md:text-5xl">
            {product.name}
          </h1>

          <p className="mt-5 text-xl tabular-nums">{formatPrice(product.price)}</p>

          <p className="mt-4 flex items-center gap-3 text-sm">
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                availability === "sold_out" ? "border border-stone" : "bg-ink",
              )}
            />
            <span className={cn(availability === "sold_out" && "text-stone")}>
              {availabilityLabel(product.stock)}
            </span>
          </p>

          <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-stone">
            {paragraphs.map((text, i) => (
              <p key={i}>{text}</p>
            ))}
          </div>

          <div className="mt-10">
            <ProductPurchase
              item={{
                productId: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                image: product.images[0]?.url ?? null,
                category: product.category,
                stock: product.stock,
              }}
            />
          </div>

          {product.isDemo && (
            <p className="mt-6 border border-dashed border-stone/40 px-4 py-3 text-xs leading-relaxed text-stone">
              <strong className="font-medium uppercase tracking-[0.2em] text-ink">Demo</strong>{" "}
              Producto de demostración. Se elimina desde el panel de administración.
            </p>
          )}

          <div className="mt-12">
            <ProductDetails product={product} />
          </div>
        </div>
      </div>

      <RelatedProducts products={related} />
    </div>
  );
}
