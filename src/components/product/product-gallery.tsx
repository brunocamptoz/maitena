"use client";

import { useRef, useState } from "react";
import { ProductMedia } from "@/components/ui/product-media";
import type { CategorySlug } from "@/lib/categories";
import type { ProductImage } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Mobile/tablet: carrusel con swipe (scroll-snap). Desktop: las fotos apiladas en una composición
 * editorial (la primera a todo el ancho) junto a un panel de información fijo.
 */
export function ProductGallery({
  images,
  name,
  category,
}: {
  images: ProductImage[];
  name: string;
  category: CategorySlug;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = () => {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  // Sin fotos: un único placeholder.
  const list: (ProductImage | null)[] = images.length > 0 ? images : [null];
  const last = list.length - 1;

  return (
    <div className="md:mx-auto md:max-w-lg lg:mx-0 lg:max-w-none">
      <ul
        ref={track}
        onScroll={onScroll}
        aria-label={`Fotografías de ${name}`}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory overflow-x-auto md:mx-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:overflow-visible"
      >
        {list.map((image, i) => {
          const fullWidth = i === 0 || (i === last && last % 2 === 1);
          return (
            <li
              key={image?.url ?? "placeholder"}
              className={cn(
                "relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden bg-line/60 lg:w-auto",
                fullWidth && "lg:col-span-2",
              )}
            >
              <ProductMedia
                src={image?.url}
                alt={image?.alt ?? name}
                category={category}
                sizes={
                  fullWidth
                    ? "(min-width: 1024px) 55vw, 100vw"
                    : "(min-width: 1024px) 28vw, 100vw"
                }
                preload={i === 0}
              />
            </li>
          );
        })}
      </ul>

      {list.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2 lg:hidden">
          {list.map((image, i) => (
            <button
              key={image?.url ?? i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ver fotografía ${i + 1} de ${list.length}`}
              aria-current={i === index}
              className="flex h-6 items-center"
            >
              <span
                className={cn(
                  "block h-px transition-all duration-500",
                  i === index ? "w-8 bg-ink" : "w-5 bg-ink/25",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
