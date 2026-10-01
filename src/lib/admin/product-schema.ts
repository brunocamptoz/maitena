import { z } from "zod";
import { CATEGORY_SLUGS } from "../categories.ts";

/** Reglas del formulario de productos (puras: se prueban sin base de datos). */

/** "Anillo Sol Naciente" → "anillo-sol-naciente" (sin tildes, solo a–z, 0–9 y guiones). */
export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140)
    .replace(/-+$/g, "");
}

const intField = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Ingresá ${label}.`)
    .regex(/^\d+$/, `${label[0].toUpperCase()}${label.slice(1)} debe ser un número entero, sin puntos ni signos.`)
    .transform(Number)
    .pipe(z.number().max(max, `${label[0].toUpperCase()}${label.slice(1)} es demasiado alto.`));

export const productSchema = z
  .object({
    name: z.string().trim().min(1, "Ingresá el nombre.").max(120, "El nombre es demasiado largo (máximo 120)."),
    slug: z.string().trim().toLowerCase(),
    description: z.string().trim().max(5000, "La descripción es demasiado larga (máximo 5000)."),
    category: z.enum(CATEGORY_SLUGS, "Elegí una categoría."),
    price: intField("el precio", 10_000_000),
    stock: intField("el stock", 100_000),
    active: z.boolean(),
  })
  .transform((v) => ({ ...v, slug: v.slug || slugify(v.name) }))
  .refine((v) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.slug) && v.slug.length <= 140, {
    path: ["slug"],
    message: "La dirección solo puede tener letras sin tilde, números y guiones (ej: anillo-sol).",
  });

export type ProductInput = z.output<typeof productSchema>;

/** Convierte lo que llega del <form> (todo texto) al objeto que valida el esquema. */
export function productFromForm(formData: FormData) {
  const text = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  return {
    name: text("name"),
    slug: text("slug"),
    description: text("description"),
    category: text("category"),
    price: text("price"),
    stock: text("stock"),
    active: formData.get("active") === "on",
  };
}

/** Primer mensaje de error por campo, para mostrarlo bajo cada input. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** Tipos y tamaño que acepta el bucket (se valida también en el navegador, pero el bucket manda). */
export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function validateImageFile(file: { type: string; size: number }) {
  if (!(IMAGE_MIME as readonly string[]).includes(file.type)) return "Solo se aceptan fotos JPG, PNG, WebP o AVIF.";
  if (file.size > IMAGE_MAX_BYTES) return "La foto pesa más de 5 MB. Reducila e intentá de nuevo.";
  if (file.size === 0) return "El archivo está vacío.";
  return null;
}
