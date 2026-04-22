import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { getDashboardStats, getOrders } from "@/lib/data";
import { orderStatusLabels, paymentMethodLabels } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function CashierDashboardPage() {
  const [stats, recentOrders, paidOrders] = await Promise.all([
    getDashboardStats(),
    getOrders("all"),
    getOrders("paid-only"),
  ]);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-stone-200">
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
            {recentOrders.slice(0, 6).map((order) => (
              <div key={order.id} className="rounded-3xl border border-stone-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-mono text-sm text-stone-500">{order.orderNumber}</p>
                    <h3 className="mt-1 text-lg font-semibold text-stone-950">
                      {order.customerName} - {order.table.name}
                    </h3>
                    <p className="mt-1 text-sm text-stone-500">
                      {paymentMethodLabels[order.paymentMethod]} • {formatDate(order.createdAt)}
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

        <div className="rounded-[32px] bg-stone-950 p-6 text-white shadow-xl">
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
            {paidOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="rounded-3xl bg-white/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{order.customerName}</p>
                    <p className="text-sm text-stone-300">
                      {order.table.name} • {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <p className="font-semibold text-orange-200">{formatCurrency(order.totalAmount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
