"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12">
      <section className="w-full rounded-[32px] bg-white p-8 shadow-xl ring-1 ring-stone-200">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">
          Server error
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-stone-950">
          Halaman belum bisa dimuat di server.
        </h1>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          Jika ini terjadi setelah deploy di Vercel, biasanya penyebabnya adalah `DATABASE_URL`
          belum benar, database PostgreSQL belum di-`db push`, atau data seed belum dibuat.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-2xl bg-stone-950 p-4 text-sm text-stone-100">
          <code>{error.message || "Unknown server error"}</code>
        </pre>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-stone-950 px-5 py-3 font-semibold text-white"
          >
            Coba lagi
          </button>
          <Link
            href="/"
            className="rounded-full border border-stone-300 px-5 py-3 font-semibold text-stone-800"
          >
            Kembali ke homepage
          </Link>
        </div>
      </section>
    </main>
  );
}
