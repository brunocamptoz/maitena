"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ImagePlus, RefreshCw, Star, Trash2 } from "lucide-react";
import {
  deleteProductImage,
  moveProductImage,
  registerProductImage,
  replaceProductImage,
  setPrimaryImage,
  type ActionResult,
} from "@/app/admin/(panel)/productos/actions";
import { IMAGE_EXT, IMAGE_MIME, validateImageFile } from "@/lib/admin/product-schema";
import { cn } from "@/lib/cn";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export type AdminImage = { id: string; url: string };

const BUCKET = "product-images";
const tool =
  "inline-flex size-9 items-center justify-center border border-line bg-paper text-ink transition-colors hover:border-ink disabled:opacity-40";

/** Sube un archivo directo a Storage (el servidor no recibe la foto) y devuelve la ruta dentro del bucket. */
async function upload(productId: string, file: File): Promise<{ path?: string; error?: string }> {
  const invalid = validateImageFile(file);
  if (invalid) return { error: `${file.name}: ${invalid}` };

  const path = `${productId}/${crypto.randomUUID()}.${IMAGE_EXT[file.type]}`;
  const { error } = await createBrowserSupabase()
    .storage.from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) return { error: `${file.name}: no se pudo subir (${error.message}).` };
  return { path };
}

export function ProductImages({ productId, images }: { productId: string; images: AdminImage[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const addRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState<string | null>(null);

  async function run(job: () => Promise<string[]>) {
    setBusy(true);
    setErrors([]);
    try {
      setErrors(await job());
    } catch {
      setErrors(["Algo salió mal. Revisá tu conexión e intentá de nuevo."]);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  const act = (job: () => Promise<ActionResult>) =>
    run(async () => {
      const r = await job();
      return r.error ? [r.error] : [];
    });

  const onAdd = (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (addRef.current) addRef.current.value = "";
    if (list.length === 0) return;
    // De a una y en orden: así cada foto toma la posición siguiente y la primera queda como principal.
    void run(async () => {
      const problems: string[] = [];
      for (const file of list) {
        const up = await upload(productId, file);
        if (!up.path) {
          problems.push(up.error ?? "No se pudo subir la foto.");
          continue;
        }
        const reg = await registerProductImage(productId, up.path);
        if (reg.error) problems.push(`${file.name}: ${reg.error}`);
      }
      return problems;
    });
  };

  const onReplace = (files: FileList | null) => {
    const file = files?.[0];
    const target = replacing;
    if (replaceRef.current) replaceRef.current.value = "";
    setReplacing(null);
    if (!file || !target) return;
    void run(async () => {
      const up = await upload(productId, file);
      if (!up.path) return [up.error ?? "No se pudo subir la foto."];
      const r = await replaceProductImage(target, up.path);
      return r.error ? [r.error] : [];
    });
  };

  return (
    <div>
      {images.length === 0 ? (
        <p className="mb-5 border border-dashed border-line px-5 py-10 text-center text-sm text-stone">
          Este producto todavía no tiene fotos. En la tienda se ve un recuadro vacío hasta que cargues una.
        </p>
      ) : (
        <ul className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((img, i) => (
            <li key={img.id} className="border border-line bg-white/40 p-2">
              <div className="relative aspect-square overflow-hidden bg-silver/40">
                <Image src={img.url} alt={`Foto ${i + 1}`} fill sizes="(min-width: 640px) 200px, 45vw" className="object-cover" />
                {i === 0 && (
                  <span className="absolute left-2 top-2 bg-ink px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-paper">
                    Principal
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" className={tool} disabled={busy || i === 0} onClick={() => act(() => moveProductImage(img.id, -1))} aria-label={`Mover foto ${i + 1} hacia adelante`} title="Mover antes">
                  <ArrowLeft size={15} strokeWidth={1.5} />
                </button>
                <button type="button" className={tool} disabled={busy || i === images.length - 1} onClick={() => act(() => moveProductImage(img.id, 1))} aria-label={`Mover foto ${i + 1} hacia atrás`} title="Mover después">
                  <ArrowRight size={15} strokeWidth={1.5} />
                </button>
                <button type="button" className={tool} disabled={busy || i === 0} onClick={() => act(() => setPrimaryImage(img.id))} aria-label={`Hacer principal la foto ${i + 1}`} title="Hacer principal">
                  <Star size={15} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  className={tool}
                  disabled={busy}
                  onClick={() => {
                    setReplacing(img.id);
                    replaceRef.current?.click();
                  }}
                  aria-label={`Reemplazar la foto ${i + 1}`}
                  title="Reemplazar"
                >
                  <RefreshCw size={15} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  className={cn(tool, "ml-auto text-error hover:border-error")}
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("¿Borrar esta foto? No se puede deshacer.")) void act(() => deleteProductImage(img.id));
                  }}
                  aria-label={`Borrar la foto ${i + 1}`}
                  title="Borrar"
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={addRef}
        type="file"
        multiple
        accept={IMAGE_MIME.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => onAdd(e.target.files)}
      />
      <input
        ref={replaceRef}
        type="file"
        accept={IMAGE_MIME.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => onReplace(e.target.files)}
      />

      <button
        type="button"
        disabled={busy}
        onClick={() => addRef.current?.click()}
        className="inline-flex h-11 items-center gap-3 border border-ink px-6 text-[11px] uppercase tracking-[0.28em] transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ImagePlus size={15} strokeWidth={1.5} aria-hidden="true" />
        {busy ? "Procesando…" : "Agregar fotos"}
      </button>
      <p className="mt-3 text-xs text-stone">
        JPG, PNG, WebP o AVIF, hasta 5 MB cada una. La primera es la principal; podés reordenarlas con las flechas.
      </p>

      {errors.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 text-sm text-error">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
