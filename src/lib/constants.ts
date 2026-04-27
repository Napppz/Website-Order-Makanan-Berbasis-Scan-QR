import { OrderStatus, PaymentMethod, PaymentProofStatus } from "@prisma/client";

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: "Menunggu Pembayaran",
  payment_submitted: "Bukti Bayar Dikirim",
  paid: "Sudah Dibayar",
  processing: "Diproses",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cashier: "Bayar di kasir",
  qris_upload: "Upload bukti bayar QRIS",
  midtrans_snap: "Midtrans Sandbox",
};

export const paymentProofLabels: Record<PaymentProofStatus, string> = {
  submitted: "Menunggu review",
  approved: "Disetujui",
  rejected: "Ditolak",
};

export const orderStatusOptions = Object.keys(orderStatusLabels) as OrderStatus[];
