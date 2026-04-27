import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { orderStatusLabels, paymentMethodLabels } from "@/lib/constants";
import {
  getDashboardPaidOrders,
  getDashboardRecentOrders,
  getDashboardStats,
  getLowStockMenuItems,
} from "@/lib/data";
import { getOrderEta } from "@/lib/order-eta";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function CashierDashboardPage() {
  const [stats, recentOrders, paidOrders, lowStockItems] = await Promise.all([
    getDashboardStats(),
    getDashboardRecentOrders(),
    getDashboardPaidOrders(),
    getLowStockMenuItems(),
  ]);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total menu", value: stats.menuCount, tone: "from-orange-500 to-amber-300" },
          { label: "Total meja", value: stats.tableCount, tone: "from-sky-500 to-cyan-300" },
          { label: "Order pending", value: stats.pendingCount, tone: "from-amber-500 to-yellow-300" },
          { label: "Order dibayar", value: stats.paidCount, tone: "from-emerald-500 to-lime-300" },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-[30px] bg-gradient-to-br ${item.tone} p-[1px] shadow-sm`}
          >
            <div className="rounded-[29px] bg-white/95 p-5">
              <p className="text-sm text-stone-500">{item.label}</p>
              <p className="mt-3 text-4xl font-bold text-stone-950">{item.value}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[24px] bg-stone-950 p-4 text-white shadow-xl sm:rounded-[32px] sm:p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Operasional hari ini</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-white/10 p-4">
              <p className="text-sm text-stone-300">Order masuk hari ini</p>
              <p className="mt-2 text-3xl font-bold">{stats.todayOrderCount}</p>
            </div>
            <div className="rounded-3xl bg-white/10 p-4">
              <p className="text-sm text-stone-300">Sedang diproses</p>
              <p className="mt-2 text-3xl font-bold">{stats.processingCount}</p>
            </div>
            <div className="rounded-3xl bg-white/10 p-4">
              <p className="text-sm text-stone-300">Omzet terkonfirmasi</p>
              <p className="mt-2 text-3xl font-bold text-orange-200">
                {formatCurrency(stats.todayRevenue)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[32px] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Antrian prioritas</p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-950">Fokus kerja kasir sekarang</h2>
            </div>
            <Link
              href="/kasir/pesanan?filter=pending_payment"
              className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Cek pembayaran
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <p className="text-sm text-amber-700">Menunggu pembayaran</p>
              <p className="mt-2 text-3xl font-bold text-amber-900">{stats.pendingCount}</p>
            </div>
            <div className="rounded-3xl bg-sky-50 p-4 ring-1 ring-sky-200">
              <p className="text-sm text-sky-700">Pending Midtrans / bukti lama</p>
              <p className="mt-2 text-3xl font-bold text-sky-900">{stats.qrisReviewCount}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            Pantau pembayaran customer yang masih pending, lalu lanjutkan order yang sudah
            berstatus dibayar ke tahap proses dapur.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[32px] sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-stone-950">Pesanan terbaru</h2>
              <p className="text-sm text-stone-500">
                Pantau order customer dan status pembayaran dari dashboard.
              </p>
            </div>
            <Link
              href="/kasir/pesanan"
              className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Lihat semua
            </Link>
          </div>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="rounded-3xl border border-stone-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-stone-500">{order.orderNumber}</p>
                    <h3 className="mt-1 text-lg font-semibold text-stone-950">
                      {order.customerName} - {order.table.name}
                    </h3>
                    <p className="mt-1 text-sm text-stone-500">
                      {paymentMethodLabels[order.paymentMethod]} - {formatDate(order.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      Estimasi siap: {getOrderEta(order.status).shortLabel}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <StatusBadge tone={order.status}>{orderStatusLabels[order.status]}</StatusBadge>
                    <p className="font-semibold text-orange-600">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
        <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[32px] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-stone-950">Stok menipis</h2>
              <p className="text-sm text-stone-500">Menu aktif dengan stok 5 atau kurang.</p>
            </div>
            <Link
              href="/kasir/menu"
              className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Kelola stok
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {lowStockItems.length ? (
              lowStockItems.map((item) => (
                <div key={item.id} className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-stone-950">{item.name}</p>
                      <p className="mt-1 text-sm text-stone-500">{item.category.name}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-amber-700">
                      Sisa {item.stock}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">
                Stok menu aktif masih aman.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[24px] bg-stone-950 p-4 text-white shadow-xl sm:rounded-[32px] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Pesanan yang sudah dibayar</h2>
              <p className="text-sm text-stone-300">Daftar cepat untuk kebutuhan kasir.</p>
            </div>
            <Link
              href="/kasir/pesanan?filter=paid"
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white"
            >
              Filter paid
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {paidOrders.map((order) => (
              <div key={order.id} className="rounded-3xl bg-white/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{order.customerName}</p>
                    <p className="text-sm text-stone-300">
                      {order.table.name} - {formatDate(order.createdAt)}
                    </p>
                    <p className="text-xs text-stone-400">
                      Estimasi siap: {getOrderEta(order.status).shortLabel}
                    </p>
                  </div>
                  <p className="font-semibold text-orange-200">{formatCurrency(order.totalAmount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}
