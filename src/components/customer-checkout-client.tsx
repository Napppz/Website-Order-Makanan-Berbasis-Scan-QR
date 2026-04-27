"use client";

import { PaymentMethod } from "@prisma/client";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { submitCustomerOrder } from "@/app/actions";
import {
  clearCustomerCart,
  clearCustomerCheckoutDraft,
  loadCustomerCart,
  loadCustomerCheckoutDraft,
  saveCustomerCheckoutDraft,
  type CustomerCartEntry,
} from "@/lib/customer-cart";
import { formatCurrency } from "@/lib/utils";

type CheckoutMenuItem = {
  id: string;
  stock: number;
  isAvailable: boolean;
};

export function CustomerCheckoutClient({
  tableId,
  tableCode,
  tableName,
  menuItems,
}: {
  tableId: string;
  tableCode: string;
  tableName: string;
  menuItems: CheckoutMenuItem[];
}) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.cashier);
  const [customerName, setCustomerName] = useState(() => loadInitialDraft(tableCode).customerName);
  const [notes, setNotes] = useState(() => loadInitialDraft(tableCode).notes);
  const [cart] = useState<CustomerCartEntry[]>(() => loadInitialCart(tableCode));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    saveCustomerCheckoutDraft(tableCode, { customerName, notes });
  }, [customerName, notes, tableCode]);

  const menuStateMap = useMemo(
    () => new Map(menuItems.map((item) => [item.id, item])),
    [menuItems],
  );

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );

  const cartQuantity = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const unavailableItems = useMemo(
    () =>
      cart.filter((item) => {
        const menuItem = menuStateMap.get(item.menuItemId);
        return !menuItem || !menuItem.isAvailable || menuItem.stock < item.quantity;
      }),
    [cart, menuStateMap],
  );

  function submitOrder() {
    if (!cart.length) {
      setError("Keranjang masih kosong. Silakan pilih menu terlebih dahulu.");
      return;
    }

    if (unavailableItems.length > 0) {
      setError("Ada item yang stoknya berubah. Kembali ke halaman menu untuk menyesuaikan pesanan.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("customerName", customerName);
      formData.set("tableId", tableId);
      formData.set("notes", notes);
      formData.set("paymentMethod", paymentMethod);
      formData.set(
        "cart",
        JSON.stringify(
          cart.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            note: item.note,
          })),
        ),
      );

      const result = await submitCustomerOrder(formData);
      if (!result.success) {
        const baseMessage = result.error ?? "Pesanan gagal dikirim.";
        setError(
          result.retryAfterSeconds
            ? `${baseMessage} (${result.retryAfterSeconds} detik)`
            : baseMessage,
        );
        return;
      }

      clearCustomerCart(tableCode);
      clearCustomerCheckoutDraft(tableCode);

      if (result.paymentUrl) {
        window.location.assign(result.paymentUrl);
        return;
      }

      router.push(`/pesanan/${result.orderNumber}`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(320px,0.96fr)]">
      <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[28px] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-500">
          Langkah 2
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-950">Checkout pesanan</h1>
        <p className="mt-2 text-sm leading-7 text-stone-500">
          Anda sudah selesai memilih menu untuk {tableName}. Lengkapi data pemesan dan pilih
          metode pembayaran di halaman ini.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl bg-stone-50 px-4 py-3">
            <p className="text-sm text-stone-500">Meja</p>
            <p className="mt-1 font-semibold text-stone-950">{tableName}</p>
          </div>
          <div className="rounded-2xl bg-stone-50 px-4 py-3">
            <p className="text-sm text-stone-500">Jumlah item</p>
            <p className="mt-1 font-semibold text-stone-950">{cartQuantity} item</p>
          </div>
          <div className="rounded-2xl bg-orange-50 px-4 py-3 sm:col-span-2 xl:col-span-1">
            <p className="text-sm text-stone-500">Estimasi bayar</p>
            <p className="mt-1 font-semibold text-orange-600">{formatCurrency(total)}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <input
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500 sm:text-base"
            placeholder="Nama pemesan"
          />
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-24 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500 sm:text-base"
            placeholder="Catatan untuk seluruh pesanan, misalnya minta alat makan tambahan"
          />
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-sm font-semibold text-stone-900">Pilih metode pembayaran</p>
          <label className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm transition hover:border-orange-300">
            <input
              checked={paymentMethod === PaymentMethod.cashier}
              onChange={() => setPaymentMethod(PaymentMethod.cashier)}
              type="radio"
              name="paymentMethod"
              className="mt-1"
            />
            <div>
              <p className="font-semibold text-stone-900">Bayar di kasir</p>
              <p className="mt-1 text-stone-500">
                Cocok jika ingin pesan dulu dan bayar saat makanan siap.
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm transition hover:border-orange-300">
            <input
              checked={paymentMethod === PaymentMethod.midtrans_snap}
              onChange={() => setPaymentMethod(PaymentMethod.midtrans_snap)}
              type="radio"
              name="paymentMethod"
              className="mt-1"
            />
            <div>
              <p className="font-semibold text-stone-900">Bayar online via Midtrans Sandbox</p>
              <p className="mt-1 text-stone-500">
                Setelah konfirmasi, Anda akan diarahkan ke halaman pembayaran Midtrans.
              </p>
            </div>
          </label>
        </div>

        {paymentMethod === PaymentMethod.midtrans_snap ? (
          <div className="mt-4 rounded-2xl border border-stone-200 bg-orange-50 p-4">
            <p className="text-sm font-semibold text-stone-900">Pembayaran diproses di Midtrans</p>
            <p className="mt-2 text-xs text-stone-500">
              Mode yang dipakai saat ini adalah sandbox, jadi aman untuk testing alur checkout.
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="mt-6 hidden flex-col gap-3 sm:flex-row xl:flex">
          <Link
            href={`/menu/${tableCode}`}
            className="rounded-full border border-stone-300 px-5 py-3 text-center font-semibold text-stone-800"
          >
            Kembali pilih menu
          </Link>
          <button
            type="button"
            onClick={submitOrder}
            disabled={isPending || cart.length === 0}
            className="rounded-full bg-orange-500 px-5 py-3 text-center font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {isPending ? "Memproses..." : "Konfirmasi Pesanan"}
          </button>
        </div>
      </section>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[28px] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-stone-950">Ringkasan keranjang</h2>
            <span className="text-sm text-stone-500">{cartQuantity} item</span>
          </div>

          <div className="mt-4 space-y-3">
            {cart.length ? (
              cart.map((item) => {
                const menuState = menuStateMap.get(item.menuItemId);
                const hasStockIssue = !menuState || !menuState.isAvailable || menuState.stock < item.quantity;

                return (
                  <div key={item.menuItemId} className="rounded-2xl bg-stone-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-900">{item.name}</p>
                        <p className="mt-1 text-sm text-stone-500">
                          {item.quantity} x {formatCurrency(item.price)}
                        </p>
                        {item.note ? (
                          <p className="mt-2 text-sm text-stone-500">{item.note}</p>
                        ) : null}
                        {hasStockIssue ? (
                          <p className="mt-2 text-sm font-medium text-rose-600">
                            Stok item ini berubah. Silakan kembali ke halaman menu.
                          </p>
                        ) : null}
                      </div>
                      <p className="font-semibold text-orange-600">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">
                Keranjang masih kosong. Kembali ke halaman menu untuk memilih item.
              </div>
            )}
          </div>

          <div className="mt-5 rounded-2xl bg-orange-50 px-4 py-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-stone-800">Total pembayaran</p>
              <p className="text-xl font-bold text-stone-950">{formatCurrency(total)}</p>
            </div>
            <p className="mt-2 text-sm text-stone-500">
              Pastikan pesanan sudah benar sebelum lanjut ke pembayaran.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3 xl:hidden">
            <Link
              href={`/menu/${tableCode}`}
              className="rounded-full border border-stone-300 px-5 py-3 text-center font-semibold text-stone-800"
            >
              Kembali pilih menu
            </Link>
            <button
              type="button"
              onClick={submitOrder}
              disabled={isPending || cart.length === 0}
              className="rounded-full bg-orange-500 px-5 py-3 text-center font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {isPending ? "Memproses..." : "Konfirmasi Pesanan"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function loadInitialCart(tableCode: string) {
  if (typeof window === "undefined") {
    return [] as CustomerCartEntry[];
  }

  return loadCustomerCart(tableCode);
}

function loadInitialDraft(tableCode: string) {
  if (typeof window === "undefined") {
    return { customerName: "", notes: "" };
  }

  return loadCustomerCheckoutDraft(tableCode);
}
