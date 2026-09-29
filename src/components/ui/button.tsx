import { cn } from "@/lib/cn";

type Options = {
  variant?: "primary" | "outline" | "light" | "text";
  size?: "md" | "lg";
  full?: boolean;
  className?: string;
};

/** Estilos de botón reutilizables para <button> y <Link>. */
export function buttonStyles({
  variant = "primary",
  size = "lg",
  full = false,
  className,
}: Options = {}) {
  return cn(
    "inline-flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.28em] transition-colors duration-500",
    "disabled:cursor-not-allowed disabled:opacity-40",
    size === "lg" ? "h-14 px-8" : "h-11 px-6",
    full && "w-full",
    variant === "primary" && "bg-ink text-paper hover:bg-ink/85",
    variant === "outline" &&
      "border border-ink text-ink hover:bg-ink hover:text-paper",
    variant === "light" && "bg-paper text-ink hover:bg-silver",
    variant === "text" &&
      "h-auto px-0 text-stone underline decoration-line underline-offset-[10px] hover:text-ink hover:decoration-ink",
    className,
  );
}
