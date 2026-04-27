import { OrderStatus } from "@prisma/client";

export type OrderEta = {
  shortLabel: string;
  label: string;
  description: string;
};

const orderEtaMap: Record<OrderStatus, OrderEta> = {
  [OrderStatus.pending_payment]: {
    shortLabel: "10-25 menit",
    label: "Estimasi siap 10-25 menit setelah pembayaran dikonfirmasi",
    description: "Selesaikan pembayaran agar pesanan masuk antrian proses dapur.",
  },
  [OrderStatus.payment_submitted]: {
    shortLabel: "8-20 menit",
    label: "Estimasi siap 8-20 menit",
    description: "Bukti bayar sedang ditinjau. Setelah valid, pesanan langsung diproses.",
  },
  [OrderStatus.paid]: {
    shortLabel: "8-20 menit",
    label: "Estimasi siap 8-20 menit",
    description: "Pembayaran sudah terkonfirmasi dan pesanan menunggu diproses.",
  },
  [OrderStatus.processing]: {
    shortLabel: "5-15 menit",
    label: "Estimasi siap 5-15 menit",
    description: "Dapur sedang menyiapkan pesanan Anda.",
  },
  [OrderStatus.completed]: {
    shortLabel: "Selesai",
    label: "Pesanan selesai",
    description: "Pesanan sudah selesai diproses.",
  },
  [OrderStatus.cancelled]: {
    shortLabel: "Dibatalkan",
    label: "Pesanan dibatalkan",
    description: "Order ini tidak lagi berada dalam antrian proses.",
  },
};

export function getOrderEta(status: OrderStatus) {
  return orderEtaMap[status];
}
