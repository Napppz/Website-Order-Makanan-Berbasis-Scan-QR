import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentMethod } from "@prisma/client";

import { redirectToMidtransPaymentAction } from "@/app/actions";
import { CustomerFlowSteps } from "@/components/customer-flow-steps";
import { OrderStatusAutoRefresh } from "@/components/order-status-auto-refresh";
import { OrderStatusTimeline } from "@/components/order-status-timeline";
import { StatusBadge } from "@/components/status-badge";
import { orderStatusLabels, paymentMethodLabels, paymentProofLabels } from "@/lib/constants";
import { getMidtransTransactionStatus, resolveMidtransOrderStatus } from "@/lib/midtrans";
import { getPrisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

function getPaymentStatusCopy(
  paymentMethod: PaymentMethod,
  status: (typeof import("@prisma/client"))["OrderStatus"],
) {
  if (paymentMethod === PaymentMethod.midtrans_snap) {
    switch (status) {
      case "pending_payment":
        return {
          title: "Pembayaran sedang menunggu konfirmasi",
          description:
            "Selesaikan pembayaran di Midtrans Sandbox. Jika Anda baru saja membayar, tunggu beberapa detik agar status ikut terbarui otomatis.",
          tone: "border-orange-200 bg-orange-50",
        };
      case "paid":
        return {
          title: "Pembayaran berhasil dikonfirmasi",
          description:
            "Dana sudah terverifikasi. Pesanan Anda tinggal menunggu diproses oleh kasir dan dapur.",
          tone: "border-emerald-200 bg-emerald-50",
        };
      case "processing":
        return {
          title: "Pembayaran berhasil, pesanan sedang diproses",
          description:
            "Kasir sudah menerima pembayaran dan dapur sedang menyiapkan pesanan Anda.",
          tone: "border-sky-200 bg-sky-50",
        };
      case "completed":
        return {
          title: "Pembayaran selesai dan pesanan sudah tuntas",
          description: "Terima kasih. Seluruh proses pembayaran dan pesanan sudah selesai.",
          tone: "border-stone-200 bg-stone-50",
        };
      case "cancelled":
        return {
          title: "Pembayaran tidak dapat dilanjutkan",
          description:
            "Transaksi dibatalkan, kedaluwarsa, atau tidak berhasil. Anda bisa membuat pesanan baru bila masih ingin melanjutkan.",
          tone: "border-rose-200 bg-rose-50",
        };
      default:
        return null;
    }
  }

  if (paymentMethod === PaymentMethod.cashier) {
    switch (status) {
      case "pending_payment":
        return {
          title: "Silakan lanjutkan pembayaran di kasir",
          description:
            "Pesanan sudah masuk. Tunjukkan nomor order ini ke kasir untuk menyelesaikan pembayaran.",
          tone: "border-orange-200 bg-orange-50",
        };
      case "paid":
        return {
          title: "Pembayaran kasir sudah diterima",
          description: "Kasir sudah menandai pesanan ini sebagai lunas.",
          tone: "border-emerald-200 bg-emerald-50",
        };
      case "processing":
        return {
          title: "Pesanan sedang diproses",
          description: "Pembayaran sudah beres dan pesanan sedang disiapkan.",
          tone: "border-sky-200 bg-sky-50",
        };
      case "completed":
        return {
          title: "Pesanan selesai",
          description: "Pembayaran dan proses pesanan sudah selesai seluruhnya.",
          tone: "border-stone-200 bg-stone-50",
        };
      case "cancelled":
        return {
          title: "Pesanan dibatalkan",
          description: "Pesanan ini tidak dilanjutkan. Silakan buat ulang jika masih diperlukan.",
          tone: "border-rose-200 bg-rose-50",
        };
      default:
        return null;
    }
  }

  return null;
}

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const prisma = getPrisma();
  let order = await prisma.order.findUnique({
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

  if (
    order.paymentMethod === PaymentMethod.midtrans_snap &&
    order.status === "pending_payment"
  ) {
    try {
      const transaction = await getMidtransTransactionStatus(order.orderNumber);
      const nextStatus = resolveMidtransOrderStatus(transaction);

      if (nextStatus && nextStatus !== order.status) {
        await prisma.order.update({
          where: { orderNumber: order.orderNumber },
          data: {
            status: nextStatus,
            paidAt: nextStatus === "paid" ? new Date() : undefined,
          },
        });

        order = await prisma.order.findUnique({
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
      }
    } catch (error) {
      console.error("Gagal sinkronisasi status Midtrans dari halaman pesanan", error);
    }
  }

  if (!order) {
    notFound();
  }

  const currentOrder = order;
  const paymentStatusCopy = getPaymentStatusCopy(
    currentOrder.paymentMethod,
    currentOrder.status,
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[28px] bg-white p-5 shadow-xl ring-1 ring-stone-200 sm:rounded-[36px] sm:p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Status pesanan</p>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="break-all text-2xl font-semibold text-stone-950 sm:text-3xl">{currentOrder.orderNumber}</h1>
            <p className="mt-2 text-stone-600">
              Terima kasih, {currentOrder.customerName}. Pesanan Anda untuk {currentOrder.table.name} sudah
              tercatat.
            </p>
          </div>
          <StatusBadge tone={currentOrder.status}>{orderStatusLabels[currentOrder.status]}</StatusBadge>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-stone-50 p-4">
            <p className="text-sm text-stone-500">Metode bayar</p>
            <p className="mt-1 font-semibold text-stone-950">
              {paymentMethodLabels[currentOrder.paymentMethod]}
            </p>
          </div>
          <div className="rounded-3xl bg-stone-50 p-4">
            <p className="text-sm text-stone-500">Waktu order</p>
            <p className="mt-1 font-semibold text-stone-950">{formatDate(currentOrder.createdAt)}</p>
          </div>
          <div className="rounded-3xl bg-stone-50 p-4">
            <p className="text-sm text-stone-500">Total tagihan</p>
            <p className="mt-1 font-semibold text-orange-600">
              {formatCurrency(currentOrder.totalAmount)}
            </p>
          </div>
        </div>

        {paymentStatusCopy ? (
          <div className={`mt-6 rounded-[24px] border p-4 sm:rounded-[28px] sm:p-5 ${paymentStatusCopy.tone}`}>
            <p className="text-sm font-semibold text-stone-950">{paymentStatusCopy.title}</p>
            <p className="mt-2 text-sm leading-7 text-stone-600">{paymentStatusCopy.description}</p>
          </div>
        ) : null}

        <CustomerFlowSteps
          steps={[
            {
              title: "Pilih menu",
              description: "Pesanan sudah dibuat dari meja Anda.",
              state: "complete",
            },
            {
              title: "Checkout",
              description:
                currentOrder.status === "cancelled"
                  ? "Checkout sudah selesai, tetapi order dibatalkan."
                  : "Checkout selesai dan menunggu progres berikutnya.",
              state: "complete",
            },
            {
              title: "Status pesanan",
              description: "Pantau pembayaran dan proses order di sini.",
              state: "current",
            },
          ]}
        />

        <OrderStatusTimeline status={currentOrder.status} />

        <div className="mt-8 rounded-[24px] border border-stone-200 p-4 sm:rounded-[28px] sm:p-5">
          <h2 className="text-lg font-semibold text-stone-950">Rincian item</h2>
          <div className="mt-4 space-y-3">
            {currentOrder.items.map((item) => (
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

        {currentOrder.paymentProof ? (
          <div className="mt-6 rounded-[24px] border border-stone-200 p-4 sm:rounded-[28px] sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-950">Status bukti bayar</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {paymentProofLabels[currentOrder.paymentProof.status]}
                </p>
              </div>
              <StatusBadge tone={currentOrder.paymentProof.status}>
                {paymentProofLabels[currentOrder.paymentProof.status]}
              </StatusBadge>
            </div>
            <a
              href={currentOrder.paymentProof.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex w-full justify-center rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white sm:w-auto"
            >
              Lihat bukti bayar
            </a>
          </div>
        ) : null}

        {currentOrder.paymentMethod === PaymentMethod.midtrans_snap &&
        currentOrder.status === "pending_payment" ? (
          <div className="mt-6 rounded-[24px] border border-orange-200 bg-orange-50 p-4 sm:rounded-[28px] sm:p-5">
            <h2 className="text-lg font-semibold text-stone-950">Pembayaran online belum selesai</h2>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              Lanjutkan pembayaran melalui Midtrans Sandbox sampai status order berubah menjadi
              sudah dibayar.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {currentOrder.paymentUrl ? (
                <a
                  href={currentOrder.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-orange-500 px-5 py-3 text-center font-semibold text-white hover:bg-orange-600"
                >
                  Bayar sekarang
                </a>
              ) : (
                <form action={redirectToMidtransPaymentAction}>
                  <input type="hidden" name="orderId" value={currentOrder.id} />
                  <button className="rounded-full bg-orange-500 px-5 py-3 text-center font-semibold text-white hover:bg-orange-600">
                    Buat link pembayaran
                  </button>
                </form>
              )}
            </div>
            <OrderStatusAutoRefresh enabled />
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={`/menu/${currentOrder.table.code}`}
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
