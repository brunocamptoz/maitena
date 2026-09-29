import { z } from "zod";
import { DEPARTMENTS } from "../uruguay.ts";

/**
 * Validación del checkout. Se usa en el navegador (mensajes inmediatos) y otra vez en el servidor
 * (que es la que manda: nunca se confía en lo que envía el cliente).
 */

const required = (label: string, max: number) =>
  z
    .string({ error: `Ingresá ${label}` })
    .trim()
    .min(1, `Ingresá ${label}`)
    .max(max, `Máximo ${max} caracteres`);

const optional = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres`).default("");

/** Teléfono uruguayo o extranjero: entre 8 y 15 dígitos (ej. 099 123 456, +598 99 123 456, 2900 1234). */
export function isValidPhone(value: string) {
  if (!/^[0-9+()\s.-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export const customerSchema = z.object({
  name: required("tu nombre", 80),
  lastName: required("tu apellido", 80),
  email: z
    .string({ error: "Ingresá tu email" })
    .trim()
    .toLowerCase()
    .pipe(z.email("Ingresá un email válido").max(254, "Email demasiado largo")),
  phone: z
    .string({ error: "Ingresá tu teléfono" })
    .trim()
    .refine(isValidPhone, "Ingresá un teléfono válido (ej. 099 123 456)"),
  department: z.enum(DEPARTMENTS, { error: "Elegí tu departamento" }),
  city: required("tu ciudad o localidad", 80),
  address: required("tu calle", 120),
  doorNumber: required("el número de puerta", 20),
  apartment: optional(40),
  postalCode: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{5}$/.test(v), "El código postal tiene 5 números")
    .default(""),
  notes: optional(500),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type CustomerFormValues = z.input<typeof customerSchema>;

export const cartItemsSchema = z
  .array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1).max(99),
    }),
  )
  .min(1, "Tu carrito está vacío")
  .max(50);

export const checkoutInputSchema = z.object({
  customer: customerSchema,
  items: cartItemsSchema,
  /** Total que el comprador VIO en pantalla: si difiere del real, no se cobra (ver createCheckout). */
  expectedTotal: z.number().int().min(0),
  /** Campo trampa para bots: las personas no lo ven, así que debe llegar vacío. */
  website: z.string().max(0).optional().default(""),
});

export const quoteInputSchema = z.object({
  department: z.enum(DEPARTMENTS),
  items: cartItemsSchema,
});

/** { campo: primer mensaje de error } a partir de un error de Zod. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path[0] === "customer" ? issue.path.slice(1) : issue.path;
    const key = String(path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
