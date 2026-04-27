"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function CashierActionNotice({
  message,
  dismissHref,
}: {
  message: string;
  dismissHref: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace(dismissHref, { scroll: false });
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [dismissHref, router]);

  return (
    <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm">
      <p className="font-semibold">Berhasil</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
