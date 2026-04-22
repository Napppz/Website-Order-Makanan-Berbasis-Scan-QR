import Link from "next/link";
import { OrderStatus } from "@prisma/client";

import {
  approvePaymentProofAction,
  rejectPaymentProofAction,
  updateOrderStatusAction,
} from "@/app/actions";
import { StatusBadge } from "@/components/status-badge";
import { getOrders } from "@/lib/data";
import {
  orderStatusLabels,
  orderStatusOptions,
  paymentMethodLabels,
  paymentProofLabels,
} from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

const filterOptions: Array<{ value: "all" | OrderStatus | "paid"; label: string }> = [
  { value: "all", label: "Semua" },
  { value: OrderStatus.pending_payment, label: "Pending payment" },
  { value: OrderStatus.payment_submitted, label: "Bukti masuk" },
  { value: OrderStatus.paid, label: "Paid" },
  { value: OrderStatus.processing, label: "Processing" },
  { value: OrderStatus.completed, label: "Completed" },
  { value: OrderStatus.cancelled, label: "Cancelled" },
];

export default async function OrderManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const selectedFilter =
    filter === "paid"
      ? "paid-only"
      : filter && orderStatusOptions.includes(filter as OrderStatus)
        ? (filter as OrderStatus)
        : "all";

  const orders = await getOrders(selectedFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Pesanan & pembayaran</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-950">
            Monitor pembayaran dan status order
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <Link
              key={option.value}
              href={option.value === "all" ? "/kasir/pesanan" : `/kasir/pesanan?filter=${option.value}`}
              className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700"
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {orders.map((order) => (
          <article key={order.id} className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <p className="font-mono text-sm text-stone-500">{order.orderNumber}</p>
                <h2 className="text-2xl font-semibold text-stone-950">
                  {order.customerName} - {order.table.name}
                </h2>
                <p className="text-sm text-stone-500">
                  {formatDate(order.createdAt)} • {paymentMethodLabels[order.paymentMethod]}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge tone={order.status}>{orderStatusLabels[order.status]}</StatusBadge>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(order.totalAmount)}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-stone-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-stone-950">
                          {item.menuItem.name} x{item.quantity}
                        </p>
                        {item.note ? <p className="mt-1 text-sm text-stone-500">{item.note}</p> : null}
                      </div>
                      <p className="font-semibold text-stone-900">{formatCurrency(item.subtotal)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl bg-stone-50 p-4">
                  <p className="text-sm text-stone-500">Aksi status</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { label: "Tandai paid", status: OrderStatus.paid },
                      { label: "Proses", status: OrderStatus.processing },
                      { label: "Selesai", status: OrderStatus.completed },
                      { label: "Batalkan", status: OrderStatus.cancelled },
                    ].map((action) => (
                      <form key={action.status} action={updateOrderStatusAction}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <input type="hidden" name="nextStatus" value={action.status} />
                        <button className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white">
                          {action.label}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>

                {order.paymentProof ? (
                  <div className="rounded-3xl border border-stone-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-stone-500">Bukti bayar QRIS</p>
                        <p className="mt-1 font-semibold text-stone-950">
                          {paymentProofLabels[order.paymentProof.status]}
                        </p>
                      </div>
                      <StatusBadge tone={order.paymentProof.status}>
                        {paymentProofLabels[order.paymentProof.status]}
                      </StatusBadge>
                    </div>
                    <a
                      href={order.paymentProof.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Preview bukti bayar
                    </a>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <form action={approvePaymentProofAction}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <button className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                          Approve
                        </button>
                      </form>
                      <form action={rejectPaymentProofAction}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <button className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">
                    Tidak ada bukti bayar. Jika pelanggan membayar langsung di kasir, gunakan tombol
                    <span className="font-semibold text-stone-700"> Tandai paid</span>.
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
