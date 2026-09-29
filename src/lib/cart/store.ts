import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MAX_QTY_PER_LINE } from "@/config/shop";
import type { CategorySlug } from "@/lib/categories";
import type { SyncedProduct } from "@/lib/types";

export const CART_STORAGE_KEY = "maitena-cart-v1";

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  /** Precio unitario que se MUESTRA. El checkout siempre recalcula desde la base. */
  price: number;
  image: string | null;
  category: CategorySlug;
  quantity: number;
  /** Stock disponible conocido la última vez que se sincronizó. */
  stock: number;
  /** `unavailable`: agotado o ya no publicado; no suma al total ni permite pagar. */
  status?: "unavailable";
  notice?: string;
};

export type AddItem = Omit<CartLine, "quantity" | "status" | "notice">;

type CartState = {
  lines: CartLine[];
  /** true cuando ya se leyó el carrito guardado en el navegador. */
  hydrated: boolean;
  isOpen: boolean;

  /** Devuelve cuántas unidades se agregaron realmente (respeta el stock). */
  add: (item: AddItem, quantity: number) => number;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  markHydrated: () => void;
  applyServerData: (data: Record<string, SyncedProduct | null>) => void;
};

const clampQty = (q: number, stock: number) =>
  Math.max(0, Math.min(Math.floor(q), stock, MAX_QTY_PER_LINE));

/**
 * No se escribe en localStorage hasta haber LEÍDO el carrito guardado. Sin esta guarda, cualquier
 * cambio de estado previo a la rehidratación (ej. cerrar el drawer al montar) pisaría el carrito real
 * con uno vacío.
 */
let canWrite = false;

const safeStorage = createJSONStorage<{ lines: CartLine[] }>(() => ({
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    if (!canWrite) return;
    try {
      localStorage.setItem(key, value);
    } catch {
      /* almacenamiento bloqueado o lleno: el carrito sigue funcionando en memoria */
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },
}));

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      hydrated: false,
      isOpen: false,

      add: (item, quantity) => {
        const existing = get().lines.find((l) => l.productId === item.productId);
        const current = existing?.quantity ?? 0;
        const next = clampQty(current + quantity, item.stock);
        const added = next - current;
        if (added <= 0) return 0;

        set((s) => ({
          lines: existing
            ? s.lines.map((l) =>
                l.productId === item.productId
                  ? { ...l, ...item, quantity: next, notice: undefined }
                  : l,
              )
            : [...s.lines, { ...item, quantity: next }],
        }));
        return added;
      },

      setQuantity: (productId, quantity) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.productId === productId
              ? {
                  ...l,
                  quantity: Math.max(1, clampQty(quantity, l.stock)),
                  notice: undefined,
                }
              : l,
          ),
        })),

      remove: (productId) =>
        set((s) => ({ lines: s.lines.filter((l) => l.productId !== productId) })),

      clear: () => set({ lines: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      markHydrated: () => set({ hydrated: true }),

      applyServerData: (data) =>
        set((s) => ({
          lines: s.lines.map((line) => {
            // Producto que no vino en la respuesta: no tocar.
            if (!(line.productId in data)) return line;
            const fresh = data[line.productId];

            if (!fresh) {
              return {
                ...line,
                status: "unavailable" as const,
                notice: "Este producto ya no está disponible.",
              };
            }

            const base = {
              ...line,
              slug: fresh.slug,
              name: fresh.name,
              price: fresh.price,
              image: fresh.image,
              category: fresh.category,
              stock: fresh.stock,
            };

            if (fresh.stock <= 0) {
              return {
                ...base,
                status: "unavailable" as const,
                notice: "Agotado por el momento.",
              };
            }

            const { status: _status, ...ok } = base;
            void _status;

            if (line.quantity > fresh.stock) {
              return {
                ...ok,
                quantity: fresh.stock,
                notice: `Ajustamos la cantidad: solo quedan ${fresh.stock}.`,
              };
            }
            if (fresh.price !== line.price) {
              return { ...ok, notice: "El precio de este producto se actualizó." };
            }
            return { ...ok, notice: line.status ? undefined : line.notice };
          }),
        })),
    }),
    {
      name: CART_STORAGE_KEY,
      version: 1,
      storage: safeStorage,
      partialize: (s) => ({ lines: s.lines }),
      // Se rehidrata a mano después del primer render (evita diferencias servidor/cliente).
      skipHydration: true,
      onRehydrateStorage: () => () => {
        canWrite = true;
      },
    },
  ),
);

export const selectCount = (s: CartState) =>
  s.lines.reduce((n, l) => (l.status ? n : n + l.quantity), 0);

export const selectSubtotal = (s: CartState) =>
  s.lines.reduce((sum, l) => (l.status ? sum : sum + l.price * l.quantity), 0);

export const selectHasUnavailable = (s: CartState) =>
  s.lines.some((l) => l.status === "unavailable");
