"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createCheckout, quoteShipping } from "@/app/actions/checkout";
import { OrderSummary } from "@/components/checkout/order-summary";
import { SelectField, TextAreaField, TextField } from "@/components/checkout/fields";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonStyles } from "@/components/ui/button";
import { selectSubtotal, useCartStore } from "@/lib/cart/store";
import { refreshCart } from "@/lib/cart/sync";
import { CHECKOUT_DRAFT_KEY } from "@/lib/checkout/draft-key";
import { customerSchema, toFieldErrors } from "@/lib/checkout/schema";
import type { ShippingQuote } from "@/lib/checkout/types";
import { formatPrice } from "@/lib/format";
import { DEPARTMENTS } from "@/lib/uruguay";

const FIELDS = [
  "name",
  "lastName",
  "email",
  "phone",
  "department",
  "city",
  "address",
  "doorNumber",
  "apartment",
  "postalCode",
  "notes",
] as const;

type FormValues = Record<(typeof FIELDS)[number], string>;

const EMPTY: FormValues = Object.fromEntries(FIELDS.map((f) => [f, ""])) as FormValues;
const DRAFT_KEY = CHECKOUT_DRAFT_KEY;

/** Los datos ingresados se conservan mientras dure la pestaña (por si se vuelve atrás desde Mercado Pago). */
function readDraft(): FormValues {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return EMPTY;
    const out = { ...EMPTY };
    for (const f of FIELDS) if (typeof parsed[f] === "string") out[f] = parsed[f];
    return out;
  } catch {
    return EMPTY;
  }
}

type Banner = { message: string; toCart?: boolean };

export function CheckoutForm() {
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore(selectSubtotal);

  const usable = useMemo(() => lines.filter((l) => !l.status), [lines]);
  const blocked = lines.some((l) => l.status);
  const itemsKey = JSON.stringify(usable.map((l) => ({ productId: l.productId, quantity: l.quantity })));

  const [values, setValues] = useState<FormValues>(readDraft);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<Banner | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tick, setTick] = useState(0);
  const [quoteState, setQuoteState] = useState<{ key: string; result: ShippingQuote } | null>(null);

  // Precios y stock al día antes de cobrar.
  useEffect(() => {
    void refreshCart();
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
  }, [values]);

  // Al volver con "atrás" desde Mercado Pago la página puede reaparecer bloqueada.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setSubmitting(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  // Costo de envío según el departamento (lo calcula el servidor).
  const department = values.department;
  const quoteKey = department && usable.length > 0 ? `${department}|${itemsKey}|${tick}` : null;
  useEffect(() => {
    if (!quoteKey) return;
    let cancelled = false;
    quoteShipping({ department, items: JSON.parse(itemsKey) })
      .then((result) => !cancelled && setQuoteState({ key: quoteKey, result }))
      .catch(
        () =>
          !cancelled &&
          setQuoteState({
            key: quoteKey,
            result: { ok: false, message: "No pudimos calcular el envío. Probá de nuevo en unos minutos." },
          }),
      );
    return () => {
      cancelled = true;
    };
  }, [quoteKey, department, itemsKey]);

  const quote = quoteKey && quoteState?.key === quoteKey ? quoteState.result : null;
  const quoting = quoteKey !== null && quote === null;
  const ready = quote?.ok ? quote : null;
  const total = ready ? ready.total : subtotal;
  // El botón solo se bloquea por motivos que el comprador no puede corregir en el formulario.
  const payDisabled = submitting || blocked || (!!ready && !ready.configured);

  const set = (name: keyof FormValues) => (value: string) => {
    setBanner(null);
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => {
      if (!(name in e)) return e;
      const { [name]: _removed, ...rest } = e;
      void _removed;
      return rest;
    });
  };

  const validate = (name: keyof FormValues) => () => {
    const result = customerSchema.safeParse(values);
    const message = result.success ? undefined : toFieldErrors(result.error)[name];
    setErrors((e) => {
      const next = { ...e };
      if (message) next[name] = message;
      else delete next[name];
      return next;
    });
  };

  const focusFirst = (found: Record<string, string>) => {
    const first = FIELDS.find((f) => f in found);
    if (first) document.getElementById(`field-${first}`)?.focus();
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setBanner(null);

    const parsed = customerSchema.safeParse(values);
    if (!parsed.success) {
      const found = toFieldErrors(parsed.error);
      setErrors(found);
      setBanner({ message: "Revisá los datos marcados en el formulario." });
      focusFirst(found);
      return;
    }
    if (!ready) {
      setBanner({
        message: quoting
          ? "Estamos calculando el envío, un momento y volvé a confirmar."
          : quote && !quote.ok
            ? quote.message
            : "Elegí tu departamento para calcular el envío.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await createCheckout({
        customer: parsed.data,
        items: JSON.parse(itemsKey),
        expectedTotal: ready.total,
        website: honeypot,
      });

      if (result.ok) {
        // A partir de acá el pago se completa en Mercado Pago.
        window.location.assign(result.url);
        return;
      }

      setSubmitting(false);
      setBanner({
        message: result.message,
        toCart: result.code === "insufficient_stock" || result.code === "product_unavailable",
      });
      if (result.fieldErrors) {
        setErrors(result.fieldErrors);
        focusFirst(result.fieldErrors);
      }
      if (result.code === "insufficient_stock" || result.code === "product_unavailable") void refreshCart();
      if (result.code === "price_changed") setTick((t) => t + 1);
    } catch {
      setSubmitting(false);
      setBanner({ message: "No pudimos iniciar el pago. Revisá tu conexión e intentá de nuevo." });
    }
  }

  const summary = <OrderSummary lines={usable} subtotal={subtotal} quote={quote} quoting={quoting} />;

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-8 md:px-10 md:pb-36 md:pt-12">
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: "Carrito", href: "/carrito" },
          { label: "Finalizar compra" },
        ]}
      />
      <h1 className="mb-10 mt-10 font-serif text-5xl font-light leading-none md:mb-14 md:mt-14 md:text-7xl">
        Finalizar compra
      </h1>

      {blocked && (
        <div role="alert" className="mb-8 border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
          Hay productos en tu carrito que ya no están disponibles.{" "}
          <Link href="/carrito" className="underline underline-offset-4">
            Revisá tu carrito
          </Link>{" "}
          para continuar.
        </div>
      )}

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-24">
        {/* Resumen: colapsable arriba en mobile, columna fija en desktop */}
        <div className="lg:sticky lg:top-28 lg:order-2">
          <details className="group border border-line lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="text-[11px] uppercase tracking-[0.24em]">Resumen del pedido</span>
              <span className="font-serif text-2xl tabular-nums">{formatPrice(total)}</span>
            </summary>
            <div className="border-t border-line p-5">{summary}</div>
          </details>
          <aside aria-label="Resumen del pedido" className="hidden border border-line p-8 lg:block">
            <h2 className="mb-6 font-serif text-2xl font-light">Tu pedido</h2>
            {summary}
          </aside>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-12 lg:order-1">
          <fieldset className="space-y-5">
            <legend className="mb-6 font-serif text-3xl font-light">Contacto</legend>
            <p className="-mt-3 text-sm text-stone">
              Comprás sin crear cuenta. Te enviamos la confirmación y el seguimiento a tu email.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="name" label="Nombre" value={values.name} onChange={set("name")} onBlur={validate("name")} error={errors.name} autoComplete="given-name" />
              <TextField name="lastName" label="Apellido" value={values.lastName} onChange={set("lastName")} onBlur={validate("lastName")} error={errors.lastName} autoComplete="family-name" />
            </div>
            <TextField name="email" label="Email" type="email" inputMode="email" value={values.email} onChange={set("email")} onBlur={validate("email")} error={errors.email} autoComplete="email" />
            <TextField name="phone" label="Teléfono" type="tel" inputMode="tel" value={values.phone} onChange={set("phone")} onBlur={validate("phone")} error={errors.phone} autoComplete="tel" placeholder="099 123 456" hint="Para coordinar la entrega." />
          </fieldset>

          <fieldset className="space-y-5">
            <legend className="mb-6 font-serif text-3xl font-light">Envío</legend>
            <p className="-mt-3 text-sm text-stone">Enviamos a todo Uruguay.</p>
            <SelectField name="department" label="Departamento" value={values.department} onChange={set("department")} onBlur={validate("department")} error={errors.department} options={DEPARTMENTS} placeholder="Elegí tu departamento" autoComplete="address-level1" />
            <TextField name="city" label="Ciudad / Localidad" value={values.city} onChange={set("city")} onBlur={validate("city")} error={errors.city} autoComplete="address-level2" />
            <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <TextField name="address" label="Calle" value={values.address} onChange={set("address")} onBlur={validate("address")} error={errors.address} autoComplete="address-line1" />
              <TextField name="doorNumber" label="Número de puerta" value={values.doorNumber} onChange={set("doorNumber")} onBlur={validate("doorNumber")} error={errors.doorNumber} autoComplete="off" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="apartment" label="Apartamento" optional value={values.apartment} onChange={set("apartment")} onBlur={validate("apartment")} error={errors.apartment} autoComplete="address-line2" />
              <TextField name="postalCode" label="Código postal" optional inputMode="numeric" maxLength={5} value={values.postalCode} onChange={set("postalCode")} onBlur={validate("postalCode")} error={errors.postalCode} autoComplete="postal-code" />
            </div>
            <TextAreaField name="notes" label="Notas para la entrega" optional maxLength={500} value={values.notes} onChange={set("notes")} onBlur={validate("notes")} error={errors.notes} placeholder="Ej.: timbre, horario, dejar con portería…" />
          </fieldset>

          {/* Campo trampa: las personas no lo ven; los bots suelen completarlo. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              No completar
              <input name="hp_ref" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </label>
          </div>

          <div className="space-y-4">
            {banner && (
              <div role="alert" className="border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
                {banner.message}{" "}
                {banner.toCart && (
                  <Link href="/carrito" className="underline underline-offset-4">
                    Volver al carrito
                  </Link>
                )}
              </div>
            )}
            {quote && !quote.ok && (
              <p role="status" className="text-sm text-error">
                {quote.message}
              </p>
            )}
            {ready && !ready.configured && (
              <p role="status" className="border border-line px-4 py-3 text-sm text-stone">
                Estamos terminando de configurar los envíos y todavía no podemos tomar pedidos. Escribinos y coordinamos tu compra.
              </p>
            )}

            <button type="submit" disabled={payDisabled} aria-busy={submitting} className={buttonStyles({ full: true })}>
              {submitting ? "Redirigiendo a Mercado Pago…" : ready ? `Pagar ${formatPrice(ready.total)} con Mercado Pago` : "Pagar con Mercado Pago"}
            </button>

            <p className="text-center text-xs leading-relaxed text-stone">
              Vas a completar el pago en Mercado Pago. Nosotros no vemos ni guardamos los datos de tu tarjeta.
            </p>
            <p className="text-center text-xs leading-relaxed text-stone">
              Al continuar aceptás los{" "}
              <Link href="/terminos" className="underline underline-offset-4">
                Términos y condiciones
              </Link>{" "}
              y la{" "}
              <Link href="/privacidad" className="underline underline-offset-4">
                Política de privacidad
              </Link>
              .
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
