import Link from "next/link";

import { getDashboardStats } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default async function CashierReportPage() {
  const stats = await getDashboardStats();
  const today = getTodayInputValue();

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[32px] sm:p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Laporan penjualan</p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-950">Export transaksi restoran</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">
          Unduh laporan CSV untuk arsip harian, rekap pembayaran, dan pengecekan omzet.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-3xl bg-stone-50 p-4">
            <p className="text-sm text-stone-500">Order hari ini</p>
            <p className="mt-2 text-3xl font-bold text-stone-950">{stats.todayOrderCount}</p>
          </div>
          <div className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            <p className="text-sm text-emerald-700">Omzet terkonfirmasi</p>
            <p className="mt-2 text-3xl font-bold text-emerald-900">
              {formatCurrency(stats.todayRevenue)}
            </p>
          </div>
          <div className="rounded-3xl bg-sky-50 p-4 ring-1 ring-sky-100">
            <p className="text-sm text-sky-700">Sedang diproses</p>
            <p className="mt-2 text-3xl font-bold text-sky-900">{stats.processingCount}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[32px] sm:p-6">
        <h2 className="text-xl font-semibold text-stone-950">Export CSV</h2>
        <form
          action="/kasir/laporan/export"
          className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto]"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Dari tanggal</label>
            <input
              type="date"
              name="from"
              defaultValue={today}
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Sampai tanggal</label>
            <input
              type="date"
              name="to"
              defaultValue={today}
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex items-end">
            <button className="w-full rounded-full bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600 md:w-auto">
              Download CSV
            </button>
          </div>
        </form>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/kasir/laporan/export?from=${today}&to=${today}`}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800"
          >
            Export hari ini
          </Link>
          <Link
            href="/kasir/laporan/export"
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800"
          >
            Export semua data
          </Link>
        </div>
      </section>
    </div>
  );
}
