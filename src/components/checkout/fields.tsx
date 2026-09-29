import type { ChangeEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full border bg-transparent px-4 text-[15px] transition-colors placeholder:text-stone/60 focus:border-ink focus:outline-none";

type Common = {
  name: string;
  label: string;
  error?: string;
  optional?: boolean;
  hint?: string;
  className?: string;
};

function Shell({ name, label, error, optional, hint, className, children }: Common & { children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={`field-${name}`} className="mb-2 flex items-baseline justify-between text-[10px] uppercase tracking-[0.22em]">
        <span>{label}</span>
        {optional && <span className="normal-case tracking-normal text-stone">Opcional</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-stone">{hint}</p>}
      {error && (
        <p id={`error-${name}`} role="alert" className="mt-1.5 text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}

const aria = (name: string, error?: string) => ({
  id: `field-${name}`,
  name,
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `error-${name}` : undefined,
});

export function TextField({
  value,
  onChange,
  onBlur,
  autoComplete,
  inputMode,
  type = "text",
  maxLength,
  placeholder,
  ...common
}: Common & {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "numeric" | "email";
  type?: "text" | "email" | "tel";
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <Shell {...common}>
      <input
        {...aria(common.name, common.error)}
        type={type}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        className={cn(control, "h-12", common.error ? "border-error" : "border-ink/25")}
      />
    </Shell>
  );
}

export function SelectField({
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  autoComplete,
  ...common
}: Common & {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: readonly string[];
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <Shell {...common}>
      <select
        {...aria(common.name, common.error)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        className={cn(control, "h-12 cursor-pointer", !value && "text-stone/70", common.error ? "border-error" : "border-ink/25")}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Shell>
  );
}

export function TextAreaField({
  value,
  onChange,
  onBlur,
  maxLength,
  placeholder,
  ...common
}: Common & {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <Shell {...common}>
      <textarea
        {...aria(common.name, common.error)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        maxLength={maxLength}
        placeholder={placeholder}
        rows={3}
        className={cn(control, "resize-none py-3", common.error ? "border-error" : "border-ink/25")}
      />
    </Shell>
  );
}
