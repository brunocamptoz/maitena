import type { CategorySlug } from "@/lib/categories";

/** Trazo lineal minimalista por categoría; se usa hasta tener fotografías. */
export function CategoryGlyph({
  slug,
  className,
}: {
  slug: CategorySlug;
  className?: string;
}) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 0.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {slug === "anillos" && (
        <g {...p}>
          <circle cx="50" cy="60" r="24" />
          <circle cx="50" cy="60" r="20" />
          <path d="M42 33 50 23l8 10-8 8z" />
          <path d="M42 33h16M50 23v18" />
        </g>
      )}
      {slug === "pulseras" && (
        <g {...p}>
          <ellipse cx="50" cy="52" rx="34" ry="20" />
          <ellipse cx="50" cy="52" rx="29" ry="15.5" />
          <circle cx="50" cy="72" r="2.2" />
        </g>
      )}
      {slug === "cadenas" && (
        <g {...p}>
          <path d="M18 24c0 34 18 52 32 52s32-18 32-52" />
          <path d="M24 24c0 30 15 46 26 46s26-16 26-46" />
          <ellipse cx="50" cy="83" rx="4" ry="6" />
        </g>
      )}
      {slug === "aros" && (
        <g {...p}>
          <circle cx="36" cy="46" r="17" />
          <circle cx="36" cy="46" r="14" />
          <circle cx="70" cy="40" r="11" />
          <circle cx="70" cy="40" r="8.5" />
          <path d="M70 61v8M66 69h8" />
        </g>
      )}
      {slug === "dijes" && (
        <g {...p}>
          <circle cx="50" cy="14" r="6" />
          <circle cx="50" cy="14" r="3.8" />
          <path d="M50 20v7" />
          <path d="M50 27c13 13 24 21 24 37a24 24 0 0 1-48 0c0-16 11-24 24-37z" />
          <path d="M50 40c8 8 15 14 15 24a15 15 0 0 1-30 0c0-10 7-16 15-24z" />
        </g>
      )}
    </svg>
  );
}
