"use client";

import { useActionState } from "react";

import { loginCashier } from "@/app/actions";

type LoginFormState = Awaited<ReturnType<typeof loginCashier>>;

const initialState: LoginFormState = { error: "" };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<LoginFormState, FormData>(
    loginCashier,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-700">Email atau username</label>
        <input
          name="identity"
          className="min-h-12 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none ring-0 transition focus:border-orange-500"
          placeholder="kasir atau kasir@example.com"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-700">Password</label>
        <input
          type="password"
          name="password"
          className="min-h-12 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none ring-0 transition focus:border-orange-500"
          placeholder="Masukkan password"
        />
      </div>
      {state.error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
          {state.retryAfterSeconds ? ` (${state.retryAfterSeconds} detik)` : ""}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-2xl bg-stone-950 px-4 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
      >
        {isPending ? "Memproses..." : "Login Kasir"}
      </button>
    </form>
  );
}
