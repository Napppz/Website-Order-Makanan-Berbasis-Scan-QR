"use client";

import { useFormStatus } from "react-dom";

type CashierActionButtonProps = {
  label: string;
  pendingLabel?: string;
  className: string;
  confirmMessage?: string;
};

export function CashierActionButton({
  label,
  pendingLabel,
  className,
  confirmMessage,
}: CashierActionButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      className={className}
    >
      {pending ? pendingLabel ?? "Memproses..." : label}
    </button>
  );
}
