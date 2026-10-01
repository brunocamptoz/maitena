"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/auth";
import { fieldErrors, productFromForm, productSchema } from "@/lib/admin/product-schema";

const BUCKET = "product-images";
const uuid = z.string().uuid();

export type ProductFormState = { ok?: boolean; message?: string; errors?: Record<string, string> };
export type ActionResult = { error?: string };

/** Que la tienda pública (cacheada) y el panel muestren los cambios al instante. */
function refresh(productId?: string) {
  revalidateTag("products", { expire: 0 });
  revalidatePath("/admin/productos");
  if (productId) revalidatePath(`/admin/productos/${productId}`);
}

function publicUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** Crea (sin id) o actualiza (con id) un producto. Al crear, sigue en la página del producto para cargar fotos. */
export async function saveProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const { db } = await requireAdminAction();

  const rawId = formData.get("id");
  const id = typeof rawId === "string" && rawId ? rawId : null;
  if (id && !uuid.safeParse(id).success) return { message: "Producto inválido." };

  const parsed = productSchema.safeParse(productFromForm(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Revisá los campos marcados." };
  const values = parsed.data;

  if (!id) {
    const { data, error } = await db.from("products").insert(values).select("id").single();
    if (error) return failure(error);
    refresh();
    redirect(`/admin/productos/${data.id}?creado=1`);
  }

  const { error } = await db.from("products").update(values).eq("id", id);
  if (error) return failure(error);
  refresh(id);
  return { ok: true, message: "Cambios guardados." };
}

function failure(error: { code?: string; message: string }): ProductFormState {
  if (error.code === "23505") {
    return { errors: { slug: "Ya existe otro producto con esa dirección. Elegí otra." }, message: "Revisá los campos marcados." };
  }
  console.error("[admin/products] error de base de datos:", error.code, error.message);
  return { message: "No se pudo guardar. Intentá de nuevo." };
}

/** Publicar u ocultar sin borrar nada. */
export async function setProductActive(productId: string, active: boolean): Promise<ActionResult> {
  const { db } = await requireAdminAction();
  if (!uuid.safeParse(productId).success) return { error: "Producto inválido." };
  const { error } = await db.from("products").update({ active }).eq("id", productId);
  if (error) return { error: "No se pudo actualizar el producto." };
  refresh(productId);
  return {};
}

/** Archivar: sale de la tienda y del listado normal, pero se conserva (las ventas lo referencian). */
export async function setProductArchived(productId: string, archived: boolean): Promise<ActionResult> {
  const { db } = await requireAdminAction();
  if (!uuid.safeParse(productId).success) return { error: "Producto inválido." };
  const { error } = await db
    .from("products")
    .update(archived ? { archived_at: new Date().toISOString(), active: false } : { archived_at: null })
    .eq("id", productId);
  if (error) return { error: "No se pudo actualizar el producto." };
  refresh(productId);
  return {};
}

/**
 * Borra un producto que nunca se vendió (y sus fotos). Si tiene ventas la base lo rechaza (FK) y se
 * sugiere archivarlo: así un pedido viejo nunca pierde el detalle de lo que se compró.
 */
export async function deleteProduct(productId: string): Promise<ActionResult> {
  const { db } = await requireAdminAction();
  if (!uuid.safeParse(productId).success) return { error: "Producto inválido." };

  const { data: images } = await db.from("product_images").select("storage_path").eq("product_id", productId);
  const paths = (images ?? []).map((i) => i.storage_path).filter((p): p is string => !!p);

  const { error } = await db.from("products").delete().eq("id", productId);
  if (error) {
    if (error.code === "23503") {
      return { error: "Este producto ya tiene ventas, no se puede borrar. Archivalo para sacarlo de la tienda." };
    }
    console.error("[admin/products] borrar:", error.code, error.message);
    return { error: "No se pudo borrar el producto." };
  }
  if (paths.length > 0) await db.storage.from(BUCKET).remove(paths);
  refresh();
  return {};
}

// ---------------------------------------------------------------------------
// Fotografías. El archivo se sube directo desde el navegador a Storage; acá solo se registra en la base.
// ---------------------------------------------------------------------------

async function imagesOf(db: Awaited<ReturnType<typeof requireAdminAction>>["db"], productId: string) {
  const { data, error } = await db
    .from("product_images")
    .select("id, product_id, image_url, storage_path, alt, position")
    .eq("product_id", productId)
    .order("position");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Reescribe las posiciones 0..n-1 (0 = foto principal) con una sola sentencia: la unicidad se verifica al final. */
async function writeOrder(
  db: Awaited<ReturnType<typeof requireAdminAction>>["db"],
  rows: Awaited<ReturnType<typeof imagesOf>>,
) {
  if (rows.length === 0) return null;
  const { error } = await db.from("product_images").upsert(rows.map((r, position) => ({ ...r, position })), { onConflict: "id" });
  return error;
}

export async function registerProductImage(productId: string, path: string): Promise<ActionResult> {
  const { db } = await requireAdminAction();
  if (!uuid.safeParse(productId).success) return { error: "Producto inválido." };
  // La ruta debe quedar dentro de la carpeta del producto; la URL la arma el servidor, nunca el cliente.
  if (!path.startsWith(`${productId}/`) || path.includes("..") || path.length > 200) {
    return { error: "Ruta de imagen inválida." };
  }

  const existing = await imagesOf(db, productId);
  const { error } = await db.from("product_images").insert({
    product_id: productId,
    image_url: publicUrl(path),
    storage_path: path,
    position: existing.length,
  });
  if (error) {
    console.error("[admin/images] registrar:", error.code, error.message);
    return { error: "La foto se subió pero no se pudo registrar. Intentá de nuevo." };
  }
  refresh(productId);
  return {};
}

export async function deleteProductImage(imageId: string): Promise<ActionResult> {
  const { db } = await requireAdminAction();
  if (!uuid.safeParse(imageId).success) return { error: "Foto inválida." };

  const { data: image } = await db.from("product_images").select("product_id, storage_path").eq("id", imageId).maybeSingle();
  if (!image) return { error: "La foto ya no existe." };

  const { error } = await db.from("product_images").delete().eq("id", imageId);
  if (error) return { error: "No se pudo borrar la foto." };
  if (image.storage_path) await db.storage.from(BUCKET).remove([image.storage_path]);

  const werr = await writeOrder(db, await imagesOf(db, image.product_id));
  if (werr) console.error("[admin/images] reordenar tras borrar:", werr.message);
  refresh(image.product_id);
  return {};
}

/** Mueve una foto una posición (-1 = antes, +1 = después). Mover la 2.ª a la 1.ª la hace principal. */
export async function moveProductImage(imageId: string, delta: -1 | 1): Promise<ActionResult> {
  const { db } = await requireAdminAction();
  if (!uuid.safeParse(imageId).success || (delta !== -1 && delta !== 1)) return { error: "Datos inválidos." };

  const { data: image } = await db.from("product_images").select("product_id").eq("id", imageId).maybeSingle();
  if (!image) return { error: "La foto ya no existe." };

  const rows = await imagesOf(db, image.product_id);
  const from = rows.findIndex((r) => r.id === imageId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= rows.length) return {};
  [rows[from], rows[to]] = [rows[to], rows[from]];

  const error = await writeOrder(db, rows);
  if (error) return { error: "No se pudo reordenar las fotos." };
  refresh(image.product_id);
  return {};
}

export async function setPrimaryImage(imageId: string): Promise<ActionResult> {
  const { db } = await requireAdminAction();
  if (!uuid.safeParse(imageId).success) return { error: "Foto inválida." };

  const { data: image } = await db.from("product_images").select("product_id").eq("id", imageId).maybeSingle();
  if (!image) return { error: "La foto ya no existe." };

  const rows = await imagesOf(db, image.product_id);
  const target = rows.find((r) => r.id === imageId);
  if (!target) return {};
  const error = await writeOrder(db, [target, ...rows.filter((r) => r.id !== imageId)]);
  if (error) return { error: "No se pudo cambiar la foto principal." };
  refresh(image.product_id);
  return {};
}

/** La foto nueva ya está subida: reemplaza a la anterior en la misma posición y se borra el archivo viejo. */
export async function replaceProductImage(imageId: string, newPath: string): Promise<ActionResult> {
  const { db } = await requireAdminAction();
  if (!uuid.safeParse(imageId).success) return { error: "Foto inválida." };

  const { data: image } = await db.from("product_images").select("product_id, storage_path").eq("id", imageId).maybeSingle();
  if (!image) return { error: "La foto ya no existe." };
  if (!newPath.startsWith(`${image.product_id}/`) || newPath.includes("..") || newPath.length > 200) {
    return { error: "Ruta de imagen inválida." };
  }

  const { error } = await db
    .from("product_images")
    .update({ image_url: publicUrl(newPath), storage_path: newPath })
    .eq("id", imageId);
  if (error) return { error: "No se pudo reemplazar la foto." };
  if (image.storage_path) await db.storage.from(BUCKET).remove([image.storage_path]);
  refresh(image.product_id);
  return {};
}
