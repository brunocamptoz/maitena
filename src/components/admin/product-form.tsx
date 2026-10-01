"use client";

import { useActionState, useState } from "react";
import { saveProduct, type ProductFormState } from "@/app/admin/(panel)/productos/actions";
import { buttonStyles } from "@/components/ui/button";
import { CATEGORY_SLUGS } from "@/lib/categories";
import { CATEGORY_LABEL } from "@/lib/admin/labels";
import { slugify } from "@/lib/admin/product-schema";
import { cn } from "@/lib/cn";

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number | null;
  stock: number | null;
  stockReserved: number;
  active: boolean;
};

const input =
  "h-12 w-full border border-ink/25 bg-transparent px-4 text-[15px] focus:border-ink focus:outline-none aria-[invalid=true]:border-error";
const label = "mb-2 block text-[10px] uppercase tracking-[0.22em]";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="mt-1.5 text-xs text-error">
      {message}
    </p>
  ) : null;
}

export function ProductForm({ initial, siteUrl }: { initial: ProductFormValues; siteUrl: string }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(saveProduct, {});
  const isNew = !initial.id;

  // Controlados: en React 19 un <form action> vacía los campos sin control al terminar, y se perdería lo escrito.
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [description, setDescription] = useState(initial.description);
  const [category, setCategory] = useState(initial.category);
  const [price, setPrice] = useState(initial.price?.toString() ?? "");
  const [stock, setStock] = useState(initial.stock?.toString() ?? "");
  const [active, setActive] = useState(initial.active);

  const errors = state.errors ?? {};
  const shownSlug = slugTouched ? slug : slugify(name);

  return (
    <form action={action} className="max-w-2xl space-y-7" noValidate>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <div>
        <label htmlFor="name" className={label}>
          Nombre
        </label>
        <input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          required
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          className={input}
        />
        <FieldError id="name-error" message={errors.name} />
      </div>

      <div>
        <label htmlFor="description" className={label}>
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          maxLength={5000}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "description-error" : undefined}
          className={cn(input, "h-auto py-3 leading-relaxed")}
        />
        <FieldError id="description-error" message={errors.description} />
      </div>

      <div className="grid gap-7 sm:grid-cols-3">
        <div>
          <label htmlFor="category" className={label}>
            Categoría
          </label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            aria-invalid={!!errors.category}
            className={input}
          >
            <option value="" disabled>
              Elegí una
            </option>
            {CATEGORY_SLUGS.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
          <FieldError id="category-error" message={errors.category} />
        </div>

        <div>
          <label htmlFor="price" className={label}>
            Precio (UYU)
          </label>
          <input
            id="price"
            name="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="1890"
            required
            aria-invalid={!!errors.price}
            aria-describedby={errors.price ? "price-error" : undefined}
            className={input}
          />
          <FieldError id="price-error" message={errors.price} />
        </div>

        <div>
          <label htmlFor="stock" className={label}>
            Stock
          </label>
          <input
            id="stock"
            name="stock"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="5"
            required
            aria-invalid={!!errors.stock}
            aria-describedby={errors.stock ? "stock-error" : "stock-hint"}
            className={input}
          />
          <FieldError id="stock-error" message={errors.stock} />
          {!errors.stock && initial.stockReserved > 0 && (
            <p id="stock-hint" className="mt-1.5 text-xs text-stone">
              {initial.stockReserved} reservada{initial.stockReserved === 1 ? "" : "s"} por compras en curso.
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="slug" className={label}>
          Dirección en la tienda
        </label>
        <div className="flex items-stretch">
          <span className="hidden items-center border border-r-0 border-ink/25 px-3 text-xs text-stone sm:flex">
            {siteUrl.replace(/^https?:\/\//, "")}/productos/
          </span>
          <input
            id="slug"
            name="slug"
            value={shownSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!errors.slug}
            aria-describedby={errors.slug ? "slug-error" : "slug-hint"}
            className={input}
          />
        </div>
        <FieldError id="slug-error" message={errors.slug} />
        {!errors.slug && (
          <p id="slug-hint" className="mt-1.5 text-xs text-stone">
            {isNew
              ? "Se arma sola con el nombre. Podés cambiarla."
              : "Si la cambiás, los enlaces anteriores a este producto dejan de funcionar."}
          </p>
        )}
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="mt-1 size-4 accent-ink"
        />
        <span>
          <span className="block text-sm">Publicado en la tienda</span>
          <span className="block text-xs text-stone">
            Destildalo para ocultarlo sin borrarlo. {isNew && "Conviene cargar las fotos antes de publicarlo."}
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={buttonStyles({ size: "md" })}>
          {pending ? "Guardando…" : isNew ? "Crear producto" : "Guardar cambios"}
        </button>
        <p role={state.ok ? "status" : "alert"} className={cn("text-sm", state.ok ? "text-ink" : "text-error")}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
