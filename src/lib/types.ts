import type { CategorySlug } from "@/lib/categories";

export type ProductImage = {
  url: string;
  alt: string;
};

/**
 * Producto tal como lo ve la tienda pública.
 * `stock` es el stock DISPONIBLE (stock físico menos unidades reservadas en checkouts en curso).
 */
export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Pesos uruguayos, enteros. */
  price: number;
  category: CategorySlug;
  stock: number;
  images: ProductImage[];
  createdAt: string;
  isDemo: boolean;
};

/** Datos mínimos para dibujar una tarjeta de producto (se envían al navegador). */
export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: CategorySlug;
  stock: number;
  isNew: boolean;
  isDemo: boolean;
  /** Primera y segunda fotografía (la segunda se muestra al pasar el mouse). */
  images: ProductImage[];
  /** Orden de publicación (timestamp) para ordenar por novedades. */
  createdAt: number;
};

/** Lo que el carrito necesita saber de un producto. */
export type SyncedProduct = {
  slug: string;
  name: string;
  price: number;
  stock: number;
  category: CategorySlug;
  image: string | null;
};
