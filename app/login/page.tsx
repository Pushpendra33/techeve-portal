"use client";

import { Suspense, useActionState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { login, type AuthState } from "@/lib/supabase/auth-actions";

const initialState: AuthState = { error: null };

function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error") === "invite_link_invalid";

  return (
    <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
      <div className="flex justify-center">
        <Image src="/techevelogo.png" alt="TechEve" width={140} height={32} priority className="h-8 w-auto object-contain" style={{ width: "auto" }} />
      </div>
      <h1 className="mt-6 text-center text-xl font-semibold">Portal sign in</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        Access is by invitation only. Use the email that was invited.
      </p>

      {linkError ? (
        <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          That invite link has expired or was already used. Ask your admin to resend it.
        </p>
      ) : null}

      <form action={formAction} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="you@email.com"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="••••••••"
          />
        </div>

        {state.error ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Haven&apos;t been invited yet? Contact your program admin.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
