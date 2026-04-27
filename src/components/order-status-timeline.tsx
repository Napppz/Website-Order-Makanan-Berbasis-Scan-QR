import { OrderStatus } from "@prisma/client";

import { cn } from "@/lib/utils";

type TimelineStep = {
  key: string;
  title: string;
  description: string;
  state: "complete" | "current" | "upcoming" | "cancelled";
};

function getTimelineSteps(status: OrderStatus): TimelineStep[] {
  if (status === OrderStatus.cancelled) {
    return [
      {
        key: "ordered",
        title: "Pesanan dibuat",
        description: "Pesanan Anda sudah berhasil masuk ke sistem.",
        state: "complete",
      },
      {
        key: "cancelled",
        title: "Pesanan dibatalkan",
        description: "Pesanan tidak dilanjutkan. Silakan buat ulang jika diperlukan.",
        state: "cancelled",
      },
    ];
  }

  const paidLikeStatuses: OrderStatus[] = [
    OrderStatus.paid,
    OrderStatus.processing,
    OrderStatus.completed,
  ];
  const processingLikeStatuses: OrderStatus[] = [
    OrderStatus.processing,
    OrderStatus.completed,
  ];

  const isPaidLike = paidLikeStatuses.includes(status);
  const isProcessingLike = processingLikeStatuses.includes(status);
  const isCompleted = status === OrderStatus.completed;

  return [
    {
      key: "ordered",
      title: "Pesanan dibuat",
      description: "Menu dan catatan Anda sudah diterima.",
      state: "complete",
    },
    {
      key: "payment",
      title: "Pembayaran",
      description:
        status === OrderStatus.pending_payment
          ? "Menunggu pembayaran diselesaikan."
          : status === OrderStatus.payment_submitted
            ? "Bukti bayar sudah masuk dan menunggu review."
            : "Pembayaran sudah terkonfirmasi.",
      state:
        status === OrderStatus.pending_payment || status === OrderStatus.payment_submitted
          ? "current"
          : "complete",
    },
    {
      key: "processing",
      title: "Diproses dapur",
      description: "Kasir dan dapur sedang menyiapkan pesanan Anda.",
      state: isProcessingLike ? (isCompleted ? "complete" : "current") : isPaidLike ? "upcoming" : "upcoming",
    },
    {
      key: "completed",
      title: "Selesai",
      description: "Pesanan siap dinikmati.",
      state: isCompleted ? "complete" : "upcoming",
    },
  ];
}

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  const steps = getTimelineSteps(status);

  return (
    <div className="mt-8 rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-500">
            Progress pesanan
          </p>
          <h2 className="mt-2 text-lg font-semibold text-stone-950">Pantau status secara real-time</h2>
        </div>
        <p className="text-sm text-stone-500">Timeline ini akan berubah mengikuti status order.</p>
      </div>

      <div className="mt-5 grid gap-3">
        {steps.map((step, index) => (
          <div key={step.key} className="flex gap-3">
            <div className="flex w-10 shrink-0 flex-col items-center">
              <span
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold",
                  step.state === "complete" && "border-emerald-200 bg-emerald-100 text-emerald-800",
                  step.state === "current" && "border-orange-200 bg-orange-100 text-orange-800",
                  step.state === "upcoming" && "border-stone-200 bg-stone-100 text-stone-500",
                  step.state === "cancelled" && "border-rose-200 bg-rose-100 text-rose-700",
                )}
              >
                {index + 1}
              </span>
              {index < steps.length - 1 ? (
                <span
                  className={cn(
                    "mt-2 block w-px flex-1",
                    step.state === "complete" || step.state === "current"
                      ? "bg-orange-200"
                      : "bg-stone-200",
                  )}
                />
              ) : null}
            </div>
            <div
              className={cn(
                "flex-1 rounded-2xl border p-4",
                step.state === "complete" && "border-emerald-200 bg-emerald-50",
                step.state === "current" && "border-orange-200 bg-orange-50",
                step.state === "upcoming" && "border-stone-200 bg-stone-50",
                step.state === "cancelled" && "border-rose-200 bg-rose-50",
              )}
            >
              <p className="font-semibold text-stone-950">{step.title}</p>
              <p className="mt-1 text-sm leading-6 text-stone-500">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
