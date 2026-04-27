"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function OrderStatusAutoRefresh({
  enabled,
  intervalMs = 8000,
}: {
  enabled: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = window.setInterval(() => {
      setLastRefreshAt(new Date());
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [enabled, intervalMs, router]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-orange-200 bg-white/70 px-4 py-3 text-sm text-stone-600">
      <p className="font-medium text-stone-900">Status pembayaran dicek otomatis.</p>
      <p className="mt-1">
        Halaman ini akan memperbarui status setiap beberapa detik sampai pembayaran terkonfirmasi.
      </p>
      <p className="mt-2 text-xs text-stone-500">
        {lastRefreshAt
          ? `Refresh terakhir: ${new Intl.DateTimeFormat("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }).format(lastRefreshAt)}`
          : "Menunggu pengecekan berikutnya..."}
      </p>
    </div>
  );
}
