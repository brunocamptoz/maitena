"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Gem, LogOut, ShoppingBag, Truck, Wallet } from "lucide-react";
import { signOutAction } from "@/app/admin/actions";
import { cn } from "@/lib/cn";

const items = [
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag, badge: true },
  { href: "/admin/ventas", label: "Ventas", icon: Wallet, badge: false },
  { href: "/admin/productos", label: "Productos", icon: Gem, badge: false },
  { href: "/admin/configuracion", label: "Envíos", icon: Truck, badge: false },
];

export function AdminNav({ email, newOrders }: { email: string; newOrders: number }) {
  const pathname = usePathname();

  const links = items.map((item) => {
    const on = pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={false}
        aria-current={on ? "page" : undefined}
        className={cn(
          "flex shrink-0 items-center gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.2em] transition-colors lg:px-7",
          on ? "bg-paper text-ink" : "text-paper/65 hover:text-paper",
        )}
      >
        <Icon size={16} strokeWidth={1.25} aria-hidden="true" />
        {item.label}
        {item.badge && newOrders > 0 && (
          <span
            className={cn(
              "ml-auto rounded-full px-2 py-0.5 text-[10px] tabular-nums",
              on ? "bg-ink text-paper" : "bg-paper text-ink",
            )}
          >
            {newOrders}
          </span>
        )}
      </Link>
    );
  });

  return (
    <aside className="bg-ink text-paper lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
      <div className="flex items-center justify-between px-5 py-4 lg:block lg:px-7 lg:py-8">
        <Link href="/admin/pedidos" className="block">
          <span className="block font-serif text-xl font-light uppercase tracking-[0.32em]">Maitena</span>
          <span className="mt-1 block text-[8px] uppercase tracking-[0.5em] text-paper/50">Panel</span>
        </Link>
        <form action={signOutAction} className="lg:hidden">
          <button type="submit" aria-label="Cerrar sesión" className="p-2 text-paper/70">
            <LogOut size={18} strokeWidth={1.25} />
          </button>
        </form>
      </div>

      <nav
        aria-label="Panel"
        className="no-scrollbar flex overflow-x-auto border-t border-paper/10 lg:flex-1 lg:flex-col lg:overflow-visible lg:border-t-0"
      >
        {links}
      </nav>

      <div className="hidden space-y-3 border-t border-paper/10 px-7 py-6 lg:block">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-paper/65 transition-colors hover:text-paper"
        >
          <ExternalLink size={14} strokeWidth={1.25} /> Ver tienda
        </Link>
        <p className="truncate text-xs text-paper/45" title={email}>
          {email}
        </p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-paper/65 transition-colors hover:text-paper"
          >
            <LogOut size={14} strokeWidth={1.25} /> Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
