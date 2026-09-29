import Image from "next/image";
import type { CategorySlug } from "@/lib/categories";
import { CategoryGlyph } from "@/components/ui/category-glyph";
import { cn } from "@/lib/cn";

/**
 * Fotografía de producto que llena a su contenedor (que debe ser `relative` y tener proporción).
 * Si el producto todavía no tiene fotos muestra un placeholder neutro.
 */
export function ProductMedia({
  src,
  alt,
  category,
  sizes,
  preload = false,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  category: CategorySlug;
  sizes: string;
  preload?: boolean;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#ece8e1] to-[#d3cec5] text-ink/30",
          className,
        )}
      >
        <CategoryGlyph slug={category} className="h-1/2 w-1/2" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      className={cn("object-cover", className)}
    />
  );
}
