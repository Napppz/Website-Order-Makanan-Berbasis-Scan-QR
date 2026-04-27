import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentMethod } from "@prisma/client";

import { redirectToMidtransPaymentAction } from "@/app/actions";
import { StatusBadge } from "@/components/status-badge";
import { orderStatusLabels, paymentMethodLabels, paymentProofLabels } from "@/lib/constants";
import { getPrisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await getPrisma().order.findUnique({
    where: { orderNumber },
    include: {
      table: true,
      items: {
        include: { menuItem: true },
      },
      paymentProof: true,
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[28px] bg-white p-5 shadow-xl ring-1 ring-stone-200 sm:rounded-[36px] sm:p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Status pesanan</p>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="break-all text-2xl font-semibold text-stone-950 sm:text-3xl">{order.orderNumber}</h1>
            <p className="mt-2 text-stone-600">
              Terima kasih, {order.customerName}. Pesanan Anda untuk {order.table.name} sudah
              tercatat.
            </p>
          </div>
          <StatusBadge tone={order.status}>{orderStatusLabels[order.status]}</StatusBadge>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-stone-50 p-4">
            <p className="text-sm text-stone-500">Metode bayar</p>
            <p className="mt-1 font-semibold text-stone-950">
              {paymentMethodLabels[order.paymentMethod]}
            </p>
          </div>
          <div className="rounded-3xl bg-stone-50 p-4">
            <p className="text-sm text-stone-500">Waktu order</p>
            <p className="mt-1 font-semibold text-stone-950">{formatDate(order.createdAt)}</p>
          </div>
          <div className="rounded-3xl bg-stone-50 p-4">
            <p className="text-sm text-stone-500">Total tagihan</p>
            <p className="mt-1 font-semibold text-orange-600">
              {formatCurrency(order.totalAmount)}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-[24px] border border-stone-200 p-4 sm:rounded-[28px] sm:p-5">
          <h2 className="text-lg font-semibold text-stone-950">Rincian item</h2>
          <div className="mt-4 space-y-3">
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
        </div>

        {order.paymentProof ? (
          <div className="mt-6 rounded-[24px] border border-stone-200 p-4 sm:rounded-[28px] sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-950">Status bukti bayar</h2>
                <p className="mt-1 text-sm text-stone-500">
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
              className="mt-4 inline-flex w-full justify-center rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white sm:w-auto"
            >
              Lihat bukti bayar
            </a>
          </div>
        ) : null}

        {order.paymentMethod === PaymentMethod.midtrans_snap &&
        order.status === "pending_payment" ? (
          <div className="mt-6 rounded-[24px] border border-orange-200 bg-orange-50 p-4 sm:rounded-[28px] sm:p-5">
            <h2 className="text-lg font-semibold text-stone-950">Pembayaran online belum selesai</h2>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              Lanjutkan pembayaran melalui Midtrans Sandbox sampai status order berubah menjadi
              sudah dibayar.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {order.paymentUrl ? (
                <a
                  href={order.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-orange-500 px-5 py-3 text-center font-semibold text-white hover:bg-orange-600"
                >
                  Bayar sekarang
                </a>
              ) : (
                <form action={redirectToMidtransPaymentAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <button className="rounded-full bg-orange-500 px-5 py-3 text-center font-semibold text-white hover:bg-orange-600">
                    Buat link pembayaran
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={`/menu/${order.table.code}`}
            className="rounded-full bg-orange-500 px-5 py-3 text-center font-semibold text-white hover:bg-orange-600"
          >
            Kembali ke menu meja
          </Link>
          <Link
            href="/"
            className="rounded-full border border-stone-300 px-5 py-3 text-center font-semibold text-stone-800"
          >
            Halaman utama
          </Link>
        </div>
      </section>
    </main>
  );
}
