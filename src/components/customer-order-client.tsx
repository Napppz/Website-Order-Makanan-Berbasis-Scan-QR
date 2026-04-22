"use client";

import { useMemo, useState, useTransition } from "react";
import { PaymentMethod } from "@prisma/client";
import { useRouter } from "next/navigation";

import { submitCustomerOrder } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";

type MenuGroup = {
  id: string;
  name: string;
  menuItems: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    isAvailable: boolean;
  }[];
};

type CartEntry = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  note: string;
};

export function CustomerOrderClient({
  categories,
  tableId,
  tableName,
}: {
  categories: MenuGroup[];
  tableId: string;
  tableName: string;
}) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.cashier);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cart, setCart] = useState<CartEntry[]>([]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );

  function updateCart(
    menuItem: { id: string; name: string; price: number },
    delta: number,
  ) {
    setCart((current) => {
      const existing = current.find((item) => item.menuItemId === menuItem.id);

      if (!existing && delta > 0) {
        return [
          ...current,
          {
            menuItemId: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1,
            note: "",
          },
        ];
      }

      return current
        .map((item) =>
          item.menuItemId === menuItem.id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0);
    });
  }

  function updateNote(menuItemId: string, note: string) {
    setCart((current) =>
      current.map((item) =>
        item.menuItemId === menuItemId ? { ...item, note } : item,
      ),
    );
  }

  function submitOrder() {
    if (!cart.length) {
      setError("Keranjang masih kosong.");
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

      if (proofFile) {
        formData.set("paymentProof", proofFile);
      }

      const result = await submitCustomerOrder(formData);
      if (!result.success) {
        setError(result.error ?? "Pesanan gagal dikirim.");
        return;
      }

      router.push(`/pesanan/${result.orderNumber}`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
      <div className="space-y-6">
        {categories.map((category) => (
          <section key={category.id} className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-stone-200">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">{category.name}</h2>
                <p className="text-sm text-stone-500">
                  Pilih menu untuk {tableName} langsung dari ponsel Anda.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {category.menuItems.map((menuItem) => {
                const currentQty =
                  cart.find((item) => item.menuItemId === menuItem.id)?.quantity ?? 0;

                return (
                  <article
                    key={menuItem.id}
                    className="rounded-3xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-200 text-center text-xs font-semibold text-white">
                        {menuItem.name
                          .split(" ")
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-stone-900">{menuItem.name}</h3>
                            <p className="text-sm text-stone-500">
                              {menuItem.description ?? "Menu favorit restoran hari ini."}
                            </p>
                          </div>
                          <p className="text-base font-semibold text-orange-600">
                            {formatCurrency(menuItem.price)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-400">
                            {menuItem.isAvailable ? "Tersedia" : "Habis"}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateCart(menuItem, -1)}
                              className="h-9 w-9 rounded-full border border-stone-300 bg-white text-lg"
                            >
                              -
                            </button>
                            <span className="min-w-8 text-center font-semibold">{currentQty}</span>
                            <button
                              type="button"
                              disabled={!menuItem.isAvailable}
                              onClick={() => updateCart(menuItem, 1)}
                              className="h-9 w-9 rounded-full bg-stone-950 text-lg text-white disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {currentQty > 0 ? (
                          <textarea
                            value={cart.find((item) => item.menuItemId === menuItem.id)?.note ?? ""}
                            onChange={(event) => updateNote(menuItem.id, event.target.value)}
                            className="min-h-20 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500"
                            placeholder="Catatan item, misalnya tanpa sambal atau es batu sedikit"
                          />
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-[28px] bg-stone-950 p-5 text-white shadow-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Checkout meja</p>
          <h2 className="mt-2 text-2xl font-semibold">{tableName}</h2>
          <div className="mt-5 space-y-3">
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 outline-none placeholder:text-stone-300 focus:border-orange-300"
              placeholder="Nama pemesan"
            />
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-24 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 outline-none placeholder:text-stone-300 focus:border-orange-300"
              placeholder="Catatan untuk seluruh pesanan"
            />
          </div>
          <div className="mt-5 space-y-3">
            <label className="rounded-2xl border border-white/15 bg-white/5 p-4 text-sm">
              <div className="flex items-center gap-3">
                <input
                  checked={paymentMethod === PaymentMethod.cashier}
                  onChange={() => setPaymentMethod(PaymentMethod.cashier)}
                  type="radio"
                  name="paymentMethod"
                />
                <div>
                  <p className="font-semibold">Bayar di kasir</p>
                  <p className="text-stone-300">Pesan sekarang, bayar offline ke kasir.</p>
                </div>
              </div>
            </label>
            <label className="rounded-2xl border border-white/15 bg-white/5 p-4 text-sm">
              <div className="flex items-center gap-3">
                <input
                  checked={paymentMethod === PaymentMethod.qris_upload}
                  onChange={() => setPaymentMethod(PaymentMethod.qris_upload)}
                  type="radio"
                  name="paymentMethod"
                />
                <div>
                  <p className="font-semibold">Upload bukti bayar QRIS</p>
                  <p className="text-stone-300">Unggah bukti transfer untuk diverifikasi kasir.</p>
                </div>
              </div>
            </label>
          </div>
          {paymentMethod === PaymentMethod.qris_upload ? (
            <div className="mt-4 space-y-2 rounded-2xl bg-white/5 p-4">
              <p className="text-sm font-semibold">Upload bukti bayar</p>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
                className="w-full text-sm text-stone-200"
              />
              <p className="text-xs text-stone-300">
                Format JPG/PNG/WEBP, maksimal 3MB.
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-stone-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-stone-900">Keranjang</h3>
            <span className="text-sm text-stone-500">{cart.length} item</span>
          </div>
          <div className="mt-4 space-y-3">
            {cart.length ? (
              cart.map((item) => (
                <div key={item.menuItemId} className="rounded-2xl bg-stone-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-stone-900">
                        {item.name} x{item.quantity}
                      </p>
                      {item.note ? (
                        <p className="mt-1 text-sm text-stone-500">{item.note}</p>
                      ) : null}
                    </div>
                    <p className="font-semibold text-orange-600">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">
                Belum ada item dalam keranjang.
              </p>
            )}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-stone-200 pt-4">
            <p className="font-semibold text-stone-800">Total</p>
            <p className="text-xl font-bold text-stone-950">{formatCurrency(total)}</p>
          </div>
          {error ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          ) : null}
          <button
            type="button"
            onClick={submitOrder}
            disabled={isPending}
            className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
          >
            {isPending ? "Mengirim pesanan..." : "Kirim Pesanan"}
          </button>
        </div>
      </aside>
    </div>
  );
}
