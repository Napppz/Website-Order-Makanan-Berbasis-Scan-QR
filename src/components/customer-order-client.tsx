"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { PaymentMethod } from "@prisma/client";
import { useRouter } from "next/navigation";

import { submitCustomerOrder } from "@/app/actions";
import { cn, formatCurrency } from "@/lib/utils";

type MenuGroup = {
  id: string;
  name: string;
  menuItems: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    imageUrl: string | null;
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
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.cashier);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cart, setCart] = useState<CartEntry[]>([]);
  const deferredSearch = useDeferredValue(search);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );

  const filteredCategories = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();

    return categories
      .map((category) => ({
        ...category,
        menuItems: category.menuItems.filter((menuItem) => {
          if (!menuItem.isAvailable || menuItem.stock <= 0) {
            return false;
          }

          if (selectedCategory !== "all" && category.id !== selectedCategory) {
            return false;
          }

          if (!keyword) {
            return true;
          }

          return (
            menuItem.name.toLowerCase().includes(keyword) ||
            category.name.toLowerCase().includes(keyword) ||
            menuItem.description?.toLowerCase().includes(keyword)
          );
        }),
      }))
      .filter((category) => category.menuItems.length > 0);
  }, [categories, deferredSearch, selectedCategory]);

  const featuredItems = useMemo(
    () =>
      categories
        .flatMap((category) => category.menuItems)
        .filter((item) => item.isAvailable && item.stock > 0)
        .slice(0, 4),
    [categories],
  );
  const cartQuantity = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  function updateCart(
    menuItem: { id: string; name: string; price: number; stock: number },
    delta: number,
  ) {
    setCart((current) => {
      const existing = current.find((item) => item.menuItemId === menuItem.id);

      if (!existing && delta > 0) {
        if (menuItem.stock <= 0) {
          return current;
        }

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

      if (existing && delta > 0 && existing.quantity >= menuItem.stock) {
        return current;
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-sm ring-1 ring-stone-200 sm:rounded-[32px]">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.15),_transparent_34%),linear-gradient(135deg,_#fff7ed_0%,_#fffbf5_45%,_#fff_100%)] px-4 py-5 sm:px-5 sm:py-6 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Menu pilihan</p>
                <h2 className="mt-2 text-xl font-semibold text-stone-950 sm:text-2xl">Cari rasa yang pas untuk meja ini</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">
                  Gunakan pencarian atau pilih kategori supaya customer lebih cepat checkout tanpa
                  scroll panjang.
                </p>
              </div>
              <div className="grid gap-3 text-sm text-stone-600 sm:grid-cols-3 lg:w-[360px] xl:w-[400px]">
                <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-stone-200">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Kategori</p>
                  <p className="mt-1 text-lg font-semibold text-stone-950">{categories.length}</p>
                </div>
                <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-stone-200">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Keranjang</p>
                  <p className="mt-1 text-lg font-semibold text-stone-950">{cartQuantity} porsi</p>
                </div>
                <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-stone-200">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Total</p>
                  <p className="mt-1 text-lg font-semibold text-orange-600">{formatCurrency(total)}</p>
                </div>
              </div>
            </div>

            {featuredItems.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                {featuredItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-[24px] bg-stone-950 px-4 py-4 text-white shadow-lg"
                  >
                    <p className="text-[11px] uppercase tracking-[0.25em] text-orange-200">
                      {index === 0 ? "Best seller" : "Rekomendasi"}
                    </p>
                    <p className="mt-2 text-lg font-semibold">{item.name}</p>
                    <p className="mt-1 text-sm text-stone-300">
                      {item.description ?? "Pilihan populer untuk order cepat."}
                    </p>
                    <p className="mt-4 font-semibold text-orange-300">{formatCurrency(item.price)}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[28px] sm:p-5">
          <div className="flex flex-col gap-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-orange-500"
              placeholder="Cari menu, kategori, atau kata di deskripsi"
            />
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
                  selectedCategory === "all"
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:border-orange-300 hover:text-orange-600",
                )}
              >
                Semua kategori
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition",
                    selectedCategory === category.id
                      ? "border-stone-950 bg-stone-950 text-white"
                      : "border-stone-200 bg-white text-stone-700 hover:border-orange-300 hover:text-orange-600",
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {filteredCategories.length ? (
          filteredCategories.map((category) => (
            <section key={category.id} className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[28px] sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-stone-900">{category.name}</h2>
                  <p className="text-sm text-stone-500">
                    Pilih menu untuk {tableName} langsung dari ponsel Anda.
                  </p>
                </div>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                  {category.menuItems.length} menu
                </span>
              </div>
              <div className="grid gap-4 2xl:grid-cols-2">
                {category.menuItems.map((menuItem) => {
                  const currentQty =
                    cart.find((item) => item.menuItemId === menuItem.id)?.quantity ?? 0;

                  return (
                    <article
                      key={menuItem.id}
                      className="overflow-hidden rounded-[28px] border border-stone-200 bg-stone-50"
                    >
                      <div className="flex flex-col gap-4 p-4 sm:flex-row">
                        <div
                          className="flex h-28 w-full shrink-0 items-end rounded-[22px] bg-gradient-to-br from-orange-500 via-amber-300 to-orange-200 p-3 text-white sm:h-auto sm:w-32"
                          style={
                            menuItem.imageUrl
                              ? {
                                  backgroundImage: `linear-gradient(rgba(23, 16, 12, 0.18), rgba(23, 16, 12, 0.5)), url(${menuItem.imageUrl})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }
                              : undefined
                          }
                        >
                          <span className="rounded-full bg-black/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur-sm">
                            Siap pesan
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-lg font-semibold text-stone-900">{menuItem.name}</h3>
                              <p className="mt-1 text-sm leading-6 text-stone-500">
                                {menuItem.description ?? "Menu favorit restoran hari ini."}
                              </p>
                            </div>
                            <p className="text-base font-semibold text-orange-600">
                              {formatCurrency(menuItem.price)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-600">
                              Stok {menuItem.stock}
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
                                onClick={() => updateCart(menuItem, 1)}
                                className="h-9 w-9 rounded-full bg-stone-950 text-lg text-white"
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
                          ) : (
                            <p className="rounded-2xl bg-white px-4 py-3 text-sm text-stone-500 ring-1 ring-stone-200">
                              Tambahkan dulu ke keranjang kalau ingin memberi catatan khusus.
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <section className="rounded-[28px] border border-dashed border-stone-300 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-stone-900">Menu yang dicari belum ketemu</p>
            <p className="mt-2 text-sm text-stone-500">
              Coba ganti kata kunci atau pilih kategori lain supaya daftar menu muncul lagi.
            </p>
          </section>
        )}
      </div>
      <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-[24px] bg-stone-950 p-4 text-white shadow-xl sm:rounded-[28px] sm:p-5">
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
                  <p className="text-stone-300">Pesan sekarang, lalu selesaikan pembayaran saat order siap.</p>
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
                  <p className="text-stone-300">Unggah bukti transfer agar kasir bisa review lebih cepat.</p>
                </div>
              </div>
            </label>
          </div>
          <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm text-stone-300">
            <p className="font-semibold text-white">Checklist sebelum kirim</p>
            <p className="mt-2">Pastikan nama pemesan terisi, jumlah item sudah benar, dan metode bayar sudah dipilih.</p>
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

        <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[28px] sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-stone-900">Keranjang</h3>
            <span className="text-sm text-stone-500">{cartQuantity} porsi</span>
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
