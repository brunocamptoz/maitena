import Link from "next/link";
import { categories, type CategorySlug } from "@/lib/categories";
import { cn } from "@/lib/cn";

/** Navegación entre categorías (Todo + todas las de `categories`). */
export function CategoryNav({ active }: { active: CategorySlug | null }) {
  const items = [
    { href: "/catalogo", label: "Todo", current: active === null },
    ...categories.map((c) => ({
      href: `/categoria/${c.slug}`,
      label: c.name,
      current: active === c.slug,
    })),
  ];

  return (
    <nav
      aria-label="Categorías"
      className="no-scrollbar -mx-5 overflow-x-auto px-5 md:mx-0 md:px-0"
    >
      <ul className="flex min-w-max gap-8 border-b border-line">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={cn(
                "-mb-px block border-b py-4 text-[11px] uppercase tracking-[0.24em] transition-colors",
                item.current
                  ? "border-ink text-ink"
                  : "border-transparent text-stone hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
