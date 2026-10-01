"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "@/app/admin/login/actions";
import { buttonStyles } from "@/components/ui/button";

const input =
  "h-12 w-full border border-ink/25 bg-transparent px-4 text-[15px] focus:border-ink focus:outline-none";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="mb-2 block text-[10px] uppercase tracking-[0.22em]">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={input} />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-[10px] uppercase tracking-[0.22em]">
          Contraseña
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonStyles({ full: true })}>
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
