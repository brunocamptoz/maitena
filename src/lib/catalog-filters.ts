import type { ProductCardData } from "@/lib/types";

export type SortKey = "nuevos" | "precio-asc" | "precio-desc";

export type Filters = {
  sort: SortKey;
  onlyAvailable: boolean;
  min: number | null;
  max: number | null;
};

export const DEFAULT_FILTERS: Filters = {
  sort: "nuevos",
  onlyAvailable: false,
  min: null,
  max: null,
};

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "nuevos", label: "Novedades" },
  { value: "precio-asc", label: "Menor precio" },
  { value: "precio-desc", label: "Mayor precio" },
];

const toPrice = (v: string | null) => {
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function parseFilters(params: URLSearchParams): Filters {
  const sort = params.get("orden");
  return {
    sort: sort === "precio-asc" || sort === "precio-desc" ? sort : "nuevos",
    onlyAvailable: params.get("disponibles") === "1",
    min: toPrice(params.get("desde")),
    max: toPrice(params.get("hasta")),
  };
}

export function serializeFilters(f: Filters) {
  const p = new URLSearchParams();
  if (f.sort !== "nuevos") p.set("orden", f.sort);
  if (f.onlyAvailable) p.set("disponibles", "1");
  if (f.min !== null) p.set("desde", String(f.min));
  if (f.max !== null) p.set("hasta", String(f.max));
  return p.toString();
}

export function hasActiveFilters(f: Filters) {
  return f.onlyAvailable || f.min !== null || f.max !== null;
}

export function applyFilters(products: ProductCardData[], f: Filters) {
  const list = products.filter(
    (p) =>
      (!f.onlyAvailable || p.stock > 0) &&
      (f.min === null || p.price >= f.min) &&
      (f.max === null || p.price <= f.max),
  );
  const sorted = [...list];
  if (f.sort === "precio-asc") sorted.sort((a, b) => a.price - b.price);
  else if (f.sort === "precio-desc") sorted.sort((a, b) => b.price - a.price);
  else sorted.sort((a, b) => b.createdAt - a.createdAt);
  return sorted;
}
