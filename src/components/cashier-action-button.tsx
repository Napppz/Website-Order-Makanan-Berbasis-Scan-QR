"use client";

import { useFormStatus } from "react-dom";

type CashierActionButtonProps = {
  label: string;
  pendingLabel?: string;
  className: string;
  confirmMessage?: string;
  disabled?: boolean;
};

export function CashierActionButton({
  label,
  pendingLabel,
  className,
  confirmMessage,
  disabled = false,
}: CashierActionButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

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
