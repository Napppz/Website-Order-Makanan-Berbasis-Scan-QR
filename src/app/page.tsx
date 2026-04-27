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

  const highlightItems = categories
    .flatMap((category) => category.menuItems)
    .filter((item) => item.isAvailable && item.stock > 0)
    .slice(0, 3);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
      <section className="overflow-hidden rounded-[28px] bg-stone-950 text-white shadow-2xl sm:rounded-[36px]">
        <div className="grid gap-8 px-5 py-8 sm:px-6 md:px-8 md:py-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 xl:px-10 xl:py-14">
          <div className="space-y-6">
            <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-orange-200">
              Website order restoran berbasis QR
            </p>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl">
                Pesan dari meja, bayar lebih cepat, dan pantau semua order dari dashboard kasir.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-300 sm:text-lg sm:leading-8">
                Customer cukup scan QR meja untuk melihat menu, membuat pesanan makanan dan
                minuman, lalu memilih bayar di kasir atau checkout online lewat Midtrans
                Sandbox.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={tables[0] ? `/menu/${tables[0].code}` : "/login"}
                className="w-full rounded-full bg-orange-500 px-6 py-3 text-center font-semibold text-white transition hover:bg-orange-600 sm:w-auto"
              >
                Coba scan meja pertama
              </Link>
              <Link
                href="/login"
                className="w-full rounded-full border border-white/15 px-6 py-3 text-center font-semibold text-white transition hover:bg-white/10 sm:w-auto"
              >
                Masuk dashboard kasir
              </Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[24px] bg-white/10 p-5 backdrop-blur sm:rounded-[30px]">
              <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Stat cepat</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
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
            <div className="rounded-[24px] bg-gradient-to-br from-orange-400 via-amber-300 to-orange-200 p-5 text-stone-950 sm:rounded-[30px]">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-800">Preview flow</p>
              <ol className="mt-4 space-y-3 text-sm font-medium">
                <li>1. Customer scan QR di meja</li>
                <li>2. Customer pilih menu dan checkout</li>
                <li>3. Customer bayar online atau kasir konfirmasi pembayaran</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {setupError ? (
        <section className="mt-8 rounded-[24px] border border-amber-300 bg-amber-50 p-5 text-stone-900 shadow-sm sm:mt-10 sm:rounded-[28px] sm:p-6">
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
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-6">
          {highlightItems.map((item) => (
            <article
              key={item.id}
              className="rounded-[24px] bg-white/80 p-5 shadow-sm ring-1 ring-stone-200 backdrop-blur sm:rounded-[28px] sm:p-6"
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
