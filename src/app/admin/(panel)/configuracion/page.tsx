import type { Metadata } from "next";
import { Card, Notice, PageHeader } from "@/components/admin/ui";
import { ShippingForm } from "@/components/admin/shipping-form";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Envíos" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { db } = await requireAdmin();

  const [settings, departments, rates] = await Promise.all([
    db.from("store_settings").select("shipping_default_cost, free_shipping_from, shipping_configured").single(),
    db.from("departments").select("name").order("sort_order"),
    db.from("shipping_rates").select("department, cost"),
  ]);

  if (settings.error || !settings.data || departments.error || !departments.data) {
    return (
      <>
        <PageHeader title="Envíos" />
        <p role="alert" className="text-sm text-error">
          No se pudieron cargar los ajustes. Recargá la página.
        </p>
      </>
    );
  }

  const s = settings.data;
  return (
    <>
      <PageHeader title="Envíos" />

      {!s.shipping_configured && (
        <div className="mb-8">
          <Notice tone="alert">
            Todavía no cargaste los costos de envío, así que la tienda no puede cobrar. Completalos y guardá para habilitar las ventas.
          </Notice>
        </div>
      )}

      <Card>
        <ShippingForm
          departments={departments.data.map((d) => d.name)}
          initial={{
            defaultCost: s.shipping_configured ? String(s.shipping_default_cost) : "",
            freeFrom: s.free_shipping_from === null ? "" : String(s.free_shipping_from),
            rates: Object.fromEntries((rates.data ?? []).map((r) => [r.department, String(r.cost)])),
          }}
        />
      </Card>
    </>
  );
}
