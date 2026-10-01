export const CATEGORY_SLUGS = ["anillos", "pulseras", "cadenas", "aros", "dijes"] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export type Category = {
  slug: CategorySlug;
  name: string;
  /** Foto editorial de la categoría. Mientras sea null se muestra el placeholder. */
  image: string | null;
};

export const categories: Category[] = [
  { slug: "anillos", name: "Anillos", image: null },
  { slug: "pulseras", name: "Pulseras", image: null },
  { slug: "cadenas", name: "Cadenas", image: null },
  { slug: "aros", name: "Aros", image: null },
  { slug: "dijes", name: "Dijes", image: null },
];

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}
