"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-stone-100 px-6 py-12 text-stone-950">
        <main className="mx-auto max-w-3xl">
          <section className="rounded-[32px] bg-white p-8 shadow-xl ring-1 ring-stone-200">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">
              Aplikasi error
            </p>
            <h1 className="mt-4 text-3xl font-semibold">Deploy berhasil, tapi runtime masih bermasalah.</h1>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              Cek environment variable di Vercel terutama `DATABASE_URL`,
              `SESSION_SECRET`, dan `NEXT_PUBLIC_APP_URL`, lalu pastikan schema database
              production sudah dijalankan.
            </p>
            <pre className="mt-5 overflow-x-auto rounded-2xl bg-stone-950 p-4 text-sm text-stone-100">
              <code>{error.message || "Unknown server error"}</code>
            </pre>
            <button
              type="button"
              onClick={reset}
              className="mt-5 rounded-full bg-stone-950 px-5 py-3 font-semibold text-white"
            >
              Muat ulang
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
