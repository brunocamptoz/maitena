import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/catalog/catalog-view";
import { CATEGORY_SLUGS, getCategory } from "@/lib/categories";
import { listProducts, toCardData } from "@/lib/products";

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/categoria/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const category = getCategory(slug);
  if (!category) return {};

  return {
    title: category.name,
    description: `${category.name} de plata de Maitena Joyas. Envíos a todo Uruguay.`,
    alternates: { canonical: `/categoria/${category.slug}` },
  };
}

export default async function CategoryPage(props: PageProps<"/categoria/[slug]">) {
  const { slug } = await props.params;
  const category = getCategory(slug);
  if (!category) notFound();

  const products = (await listProducts({ category: category.slug })).map(toCardData);

  return (
    <CatalogView
      title={category.name}
      eyebrow="Colección"
      category={category.slug}
      products={products}
    />
  );
}
