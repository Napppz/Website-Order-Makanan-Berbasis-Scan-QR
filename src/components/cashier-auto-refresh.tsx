"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function playOrderSound() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    return;
  }

  const audioContext = new AudioContextConstructor();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.32);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.34);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export function CashierAutoRefresh({
  activeOrderCount,
  intervalMs = 15000,
}: {
  activeOrderCount: number;
  intervalMs?: number;
}) {
  const router = useRouter();
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("cashier-sound-enabled") === "true";
  });
  const previousActiveOrderCount = useRef(activeOrderCount);

  useEffect(() => {
    if (soundEnabled && activeOrderCount > previousActiveOrderCount.current) {
      playOrderSound();
    }

    previousActiveOrderCount.current = activeOrderCount;
  }, [activeOrderCount, soundEnabled]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLastRefreshAt(new Date());
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, router]);

  function toggleSound() {
    const nextValue = !soundEnabled;
    setSoundEnabled(nextValue);
    window.localStorage.setItem("cashier-sound-enabled", String(nextValue));

    if (nextValue) {
      playOrderSound();
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Auto-refresh aktif</p>
          <p className="mt-1 text-emerald-800">
            {lastRefreshAt
              ? `Terakhir cek: ${new Intl.DateTimeFormat("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }).format(lastRefreshAt)}`
              : "Menunggu pengecekan order baru..."}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleSound}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200"
        >
          Suara {soundEnabled ? "aktif" : "mati"}
        </button>
      </div>
    </div>
  );
}
