import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/admin/auth";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, db } = await requireAdmin();

  // Pedidos pagados que todavía no se enviaron: el "tenés trabajo" del menú.
  const { count } = await db.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "paid");

  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <AdminNav email={user.email ?? ""} newOrders={count ?? 0} />
      <main className="min-w-0 px-5 py-8 md:px-10 md:py-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
