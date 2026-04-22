import Link from "next/link";
import { OrderStatus } from "@prisma/client";

import {
  approvePaymentProofAction,
  rejectPaymentProofAction,
  updateOrderStatusAction,
} from "@/app/actions";
import { StatusBadge } from "@/components/status-badge";
import {
  orderStatusLabels,
  orderStatusOptions,
  paymentMethodLabels,
  paymentProofLabels,
} from "@/lib/constants";
import { getOrders } from "@/lib/data";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

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
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { filter, q } = await searchParams;
  const selectedFilter =
    filter === "paid"
      ? "paid-only"
      : filter && orderStatusOptions.includes(filter as OrderStatus)
        ? (filter as OrderStatus)
        : "all";

  const orders = await getOrders(selectedFilter, q);
  const query = q?.trim() ?? "";
  const submittedCount = orders.filter((order) => order.status === OrderStatus.payment_submitted).length;
  const processingCount = orders.filter((order) => order.status === OrderStatus.processing).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[32px] sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Pesanan & pembayaran</p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-950">
              Monitor pembayaran dan status order
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">
              Cari order berdasarkan nomor, nama customer, meja, atau kode meja supaya kasir
              bisa langsung masuk ke transaksi yang sedang dicari.
            </p>
          </div>
          <form className="grid w-full gap-3 sm:grid-cols-[1fr_auto] xl:max-w-xl">
            <input type="hidden" name="filter" value={filter ?? "all"} />
            <input
              name="q"
              defaultValue={query}
              placeholder="Cari nomor order, nama customer, atau meja"
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-orange-500"
            />
            <button className="w-full rounded-full bg-stone-950 px-5 py-3 font-semibold text-white sm:w-auto">
              Cari pesanan
            </button>
          </form>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <p className="text-sm text-amber-700">Menunggu review bukti</p>
            <p className="mt-2 text-3xl font-bold text-amber-900">{submittedCount}</p>
          </div>
          <div className="rounded-3xl bg-sky-50 p-4 ring-1 ring-sky-200">
            <p className="text-sm text-sky-700">Sedang diproses</p>
            <p className="mt-2 text-3xl font-bold text-sky-900">{processingCount}</p>
          </div>
          <div className="rounded-3xl bg-stone-100 p-4 ring-1 ring-stone-200">
            <p className="text-sm text-stone-600">Order pada tampilan ini</p>
            <p className="mt-2 text-3xl font-bold text-stone-950">{orders.length}</p>
          </div>
        </div>

        <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {filterOptions.map((option) => {
            const isActive =
              (option.value === "all" && !filter) || filter === option.value;
            const nextHref =
              option.value === "all"
                ? query
                  ? `/kasir/pesanan?q=${encodeURIComponent(query)}`
                  : "/kasir/pesanan"
                : query
                  ? `/kasir/pesanan?filter=${option.value}&q=${encodeURIComponent(query)}`
                  : `/kasir/pesanan?filter=${option.value}`;

            return (
              <Link
                key={option.value}
                href={nextHref}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
                  isActive
                    ? "border-stone-950 bg-stone-950 text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:border-orange-300 hover:text-orange-600",
                )}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </section>

      {orders.length ? (
        <div className="space-y-5">
          {orders.map((order) => (
            <article key={order.id} className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[32px] sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 space-y-2">
                  <p className="break-all font-mono text-sm text-stone-500">{order.orderNumber}</p>
                  <h2 className="text-xl font-semibold text-stone-950 sm:text-2xl">
                    {order.customerName} - {order.table.name}
                  </h2>
                  <p className="text-sm text-stone-500">
                    {formatDate(order.createdAt)} - {paymentMethodLabels[order.paymentMethod]}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge tone={order.status}>{orderStatusLabels[order.status]}</StatusBadge>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(order.totalAmount)}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-stone-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-950">
                            {item.menuItem.name} x{item.quantity}
                          </p>
                          {item.note ? <p className="mt-1 text-sm text-stone-500">{item.note}</p> : null}
                        </div>
                        <p className="font-semibold text-stone-900 sm:text-right">{formatCurrency(item.subtotal)}</p>
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
      ) : (
        <section className="rounded-[32px] border border-dashed border-stone-300 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-stone-950">Belum ada order yang cocok</p>
          <p className="mt-2 text-sm text-stone-500">
            Coba ubah kata kunci pencarian atau ganti filter status untuk melihat transaksi lain.
          </p>
        </section>
      )}
    </div>
  );
}
