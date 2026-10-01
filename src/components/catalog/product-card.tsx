import Link from "next/link";
import { ProductMedia } from "@/components/ui/product-media";
import { availabilityLabel, formatPrice, getAvailability } from "@/lib/format";
import type { ProductCardData } from "@/lib/types";
import { cn } from "@/lib/cn";

const tag =
  "bg-paper/90 px-2.5 py-1 text-[9px] uppercase tracking-[0.24em] text-ink backdrop-blur-sm";

export function ProductCard({
  product,
  preload = false,
}: {
  product: ProductCardData;
  preload?: boolean;
}) {
  const availability = getAvailability(product.stock);
  const soldOut = availability === "sold_out";
  const [first, second] = product.images;

  return (
    <article className="group">
      <Link href={`/productos/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-line/60">
          <ProductMedia
            src={first?.url}
            alt={first?.alt ?? product.name}
            category={product.category}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            preload={preload}
            className={cn(
              "transition-[opacity,transform] duration-[900ms] ease-[var(--ease-soft)]",
              soldOut && "opacity-60",
              second ? "group-hover:opacity-0" : "group-hover:scale-[1.03]",
            )}
          />
          {second && (
            <ProductMedia
              src={second.url}
              alt=""
              category={product.category}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className={cn(
                "opacity-0 transition-opacity duration-[900ms] ease-[var(--ease-soft)] group-hover:opacity-100",
                soldOut && "group-hover:opacity-60",
              )}
            />
          )}

          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            {soldOut && <span className={tag}>Agotado</span>}
            {!soldOut && product.isNew && <span className={tag}>Nuevo</span>}
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <h3 className="font-serif text-xl font-normal leading-tight md:text-[22px]">
            <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 group-hover:bg-[length:100%_1px]">
              {product.name}
            </span>
          </h3>
          <p className="flex items-baseline gap-3 text-sm">
            <span className={cn("tabular-nums", soldOut && "text-stone")}>
              {formatPrice(product.price)}
            </span>
            {availability === "low_stock" && (
              <span className="text-xs italic text-stone">
                {availabilityLabel(product.stock)}
              </span>
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="aspect-[4/5] bg-line/70" />
      <div className="mt-4 h-5 w-3/4 bg-line/70" />
      <div className="mt-2 h-4 w-1/3 bg-line/70" />
    </div>
  );
}
