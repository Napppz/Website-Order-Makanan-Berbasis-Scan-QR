import { OrderStatus, PaymentProofStatus } from "@prisma/client";

import { cn } from "@/lib/utils";

type SupportedStatus = OrderStatus | PaymentProofStatus;

const statusTone: Record<SupportedStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  payment_submitted: "bg-sky-100 text-sky-800",
  paid: "bg-emerald-100 text-emerald-800",
  processing: "bg-violet-100 text-violet-800",
  completed: "bg-stone-200 text-stone-800",
  cancelled: "bg-rose-100 text-rose-800",
  submitted: "bg-sky-100 text-sky-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

export function StatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: SupportedStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
        statusTone[tone],
      )}
    >
      {children}
    </span>
  );
}
