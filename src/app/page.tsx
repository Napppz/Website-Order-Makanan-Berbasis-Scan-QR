import Link from "next/link";

import { getCategoriesWithItems, getTables } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let categories = [] as Awaited<ReturnType<typeof getCategoriesWithItems>>;
  let tables = [] as Awaited<ReturnType<typeof getTables>>;
  let setupError: string | null = null;

  try {
    [categories, tables] = await Promise.all([getCategoriesWithItems(), getTables()]);
  } catch (error) {
    setupError =
      error instanceof Error
        ? error.message
        : "Aplikasi belum bisa membaca database production.";
  }

  const highlightItems = categories.flatMap((category) => category.menuItems).slice(0, 3);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-10">
      <section className="overflow-hidden rounded-[36px] bg-stone-950 text-white shadow-2xl">
        <div className="grid gap-10 px-6 py-10 md:grid-cols-[1.2fr_0.8fr] md:px-10 md:py-14">
          <div className="space-y-6">
            <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-orange-200">
              Website order restoran berbasis QR
            </p>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Pesan dari meja, bayar lebih cepat, dan pantau semua order dari dashboard kasir.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-stone-300">
                Customer cukup scan QR meja untuk melihat menu, membuat pesanan makanan dan
                minuman, lalu memilih bayar di kasir atau upload bukti bayar QRIS.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={tables[0] ? `/menu/${tables[0].code}` : "/login"}
                className="rounded-full bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600"
              >
                Coba scan meja pertama
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/15 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Masuk dashboard kasir
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-[30px] bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Stat cepat</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-sm text-stone-300">Kategori menu</p>
                  <p className="mt-2 text-3xl font-bold">{categories.length}</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-sm text-stone-300">Meja aktif</p>
                  <p className="mt-2 text-3xl font-bold">{tables.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[30px] bg-gradient-to-br from-orange-400 via-amber-300 to-orange-200 p-5 text-stone-950">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-800">Preview flow</p>
              <ol className="mt-4 space-y-3 text-sm font-medium">
                <li>1. Customer scan QR di meja</li>
                <li>2. Customer pilih menu dan checkout</li>
                <li>3. Kasir verifikasi pembayaran dan proses order</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {setupError ? (
        <section className="mt-10 rounded-[28px] border border-amber-300 bg-amber-50 p-6 text-stone-900 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
            Setup production belum lengkap
          </p>
          <h2 className="mt-3 text-2xl font-semibold">App sudah ter-deploy, tapi database belum siap.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">
            Isi `DATABASE_URL` PostgreSQL di Vercel, lalu jalankan `prisma db push` dan
            `node prisma/seed.mjs` ke database production. Setelah itu reload halaman ini.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-stone-950 p-4 text-sm text-stone-100">
            <code>{setupError}</code>
          </pre>
        </section>
      ) : (
        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          {highlightItems.map((item) => (
            <article
              key={item.id}
              className="rounded-[28px] bg-white/80 p-6 shadow-sm ring-1 ring-stone-200 backdrop-blur"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-300 text-xl font-bold text-white">
                {item.name
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
              </div>
              <h2 className="mt-4 text-xl font-semibold text-stone-950">{item.name}</h2>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                {item.description ?? "Menu signature yang siap dipesan lewat QR meja."}
              </p>
              <p className="mt-4 text-lg font-bold text-orange-600">{formatCurrency(item.price)}</p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
