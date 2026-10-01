import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
      <div>
        <h1 className="font-serif text-4xl font-light leading-none md:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-xl text-sm text-stone">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("border border-line bg-white/40 p-5 md:p-6", className)}>{children}</section>;
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="text-[11px] uppercase tracking-[0.24em]">{children}</h2>
      {aside}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="border border-line bg-white/40 p-5">
      <p className="text-[10px] uppercase tracking-[0.22em] text-stone">{label}</p>
      <p className="mt-3 font-serif text-3xl font-light leading-none tabular-nums md:text-4xl">{value}</p>
      {hint && <p className="mt-2 text-xs text-stone">{hint}</p>}
    </div>
  );
}

const badgeTone = {
  neutral: "border-ink/25 text-ink",
  solid: "border-ink bg-ink text-paper",
  muted: "border-line text-stone",
  alert: "border-error/50 bg-error/5 text-error",
} as const;

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof badgeTone }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap border px-2.5 py-1 text-[9px] uppercase tracking-[0.2em]",
        badgeTone[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "alert" | "ok" }) {
  return (
    <div
      role={tone === "alert" ? "alert" : "status"}
      className={cn(
        "border px-4 py-3 text-sm leading-relaxed",
        tone === "alert" && "border-error/40 bg-error/5 text-error",
        tone === "info" && "border-line bg-white/50 text-stone",
        tone === "ok" && "border-ink/30 bg-white/60 text-ink",
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border border-dashed border-line px-6 py-14 text-center">
      <p className="font-serif text-2xl font-light">{title}</p>
      {children && <div className="mx-auto mt-3 max-w-sm text-sm text-stone">{children}</div>}
    </div>
  );
}
