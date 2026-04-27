"use client";

import { useDeferredValue, useMemo, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
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

type FlyToCartItem = {
  id: number;
  label: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
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
  const [flyToCartItems, setFlyToCartItems] = useState<FlyToCartItem[]>([]);
  const flyToCartIdRef = useRef(0);
  const deferredSearch = useDeferredValue(search);

  const allAvailableItems = useMemo(
    () =>
      categories.flatMap((category) =>
        category.menuItems
          .filter((item) => item.isAvailable && item.stock > 0)
          .map((item) => ({ ...item, categoryName: category.name })),
      ),
    [categories],
  );

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );

  const cartQuantity = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
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

  const featuredItems = useMemo(() => allAvailableItems.slice(0, 3), [allAvailableItems]);
  const visibleMenuCount = useMemo(
    () =>
      filteredCategories.reduce((sum, category) => sum + category.menuItems.length, 0),
    [filteredCategories],
  );

  function getCartQuantity(menuItemId: string) {
    return cart.find((item) => item.menuItemId === menuItemId)?.quantity ?? 0;
  }

  function spawnFlyToCart(
    event: ReactMouseEvent<HTMLButtonElement>,
    label: string,
  ) {
    if (typeof window === "undefined") {
      return;
    }

    const sourceRect = event.currentTarget.getBoundingClientRect();
    const target = Array.from(
      document.querySelectorAll<HTMLElement>("[data-cart-target='true']"),
    ).find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    if (!target) {
      return;
    }

    const targetRect = target.getBoundingClientRect();
    flyToCartIdRef.current += 1;
    const id = flyToCartIdRef.current;
    const x = sourceRect.left + sourceRect.width / 2;
    const y = sourceRect.top + sourceRect.height / 2;
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    setFlyToCartItems((current) => [
      ...current,
      {
        id,
        label,
        x,
        y,
        dx: targetX - x,
        dy: targetY - y,
      },
    ]);

    window.setTimeout(() => {
      setFlyToCartItems((current) => current.filter((item) => item.id !== id));
    }, 720);
  }

  function updateCart(
    menuItem: { id: string; name: string; price: number; stock: number },
    delta: number,
    event?: ReactMouseEvent<HTMLButtonElement>,
  ) {
    if (delta > 0 && event) {
      spawnFlyToCart(event, menuItem.name);
    }

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
    <>
      {flyToCartItems.map((item) => (
        <div
          key={item.id}
          className="fly-to-cart-chip"
          style={
            {
              left: `${item.x}px`,
              top: `${item.y}px`,
              "--fly-x": `${item.dx}px`,
              "--fly-y": `${item.dy}px`,
            } as CSSProperties
          }
        >
          {item.label}
        </div>
      ))}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.92fr)]">
        <div className="space-y-5">
          <section className="animate-fade-up-soft rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-500">
                  Cara pesan
                </p>
                <h2 className="mt-2 text-xl font-semibold text-stone-950 sm:text-2xl">
                  Pesan makanan untuk {tableName} dalam 3 langkah
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                  Pilih menu, cek keranjang, lalu kirim pesanan. Catatan khusus bisa ditulis
                  nanti di keranjang agar halaman ini tetap sederhana.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:w-[360px]">
                <div className="rounded-2xl bg-stone-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Menu</p>
                  <p className="mt-1 text-lg font-semibold text-stone-950">{visibleMenuCount}</p>
                </div>
                <div className="rounded-2xl bg-stone-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Keranjang</p>
                  <p className="mt-1 text-lg font-semibold text-stone-950">{cartQuantity} item</p>
                </div>
                <div className="rounded-2xl bg-orange-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-orange-700">Total</p>
                  <p className="mt-1 text-lg font-semibold text-orange-700">
                    {formatCurrency(total)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-sm font-semibold text-stone-900">1. Pilih menu</p>
                <p className="mt-1 text-sm text-stone-600">
                  Gunakan pencarian atau kategori untuk menemukan menu lebih cepat.
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-sm font-semibold text-stone-900">2. Atur jumlah</p>
                <p className="mt-1 text-sm text-stone-600">
                  Tekan tombol tambah. Kurangi lagi kalau jumlah belum pas.
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-sm font-semibold text-stone-900">3. Kirim pesanan</p>
                <p className="mt-1 text-sm text-stone-600">
                  Isi nama pemesan, pilih pembayaran, lalu konfirmasi pesanan.
                </p>
              </div>
            </div>

            {featuredItems.length ? (
              <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
                {featuredItems.map((item) => (
                  <div
                    key={item.id}
                    className="menu-card-lift min-w-[220px] rounded-[22px] bg-stone-950 px-4 py-4 text-white"
                  >
                    <p className="text-[11px] uppercase tracking-[0.22em] text-orange-200">
                      Rekomendasi cepat
                    </p>
                    <p className="mt-2 font-semibold">{item.name}</p>
                    <p className="mt-1 text-sm text-stone-300">{item.categoryName}</p>
                    <p className="mt-3 font-semibold text-orange-300">
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="animate-fade-up-soft rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-orange-500"
                placeholder="Cari nama menu atau kategori"
              />
              <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
                Menampilkan <span className="font-semibold text-stone-950">{visibleMenuCount}</span>{" "}
                menu
              </div>
            </div>

            <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
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
                Semua
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
                    selectedCategory === category.id
                      ? "border-stone-950 bg-stone-950 text-white"
                      : "border-stone-200 bg-white text-stone-700 hover:border-orange-300 hover:text-orange-600",
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </section>

          {filteredCategories.length ? (
            filteredCategories.map((category) => (
              <section
                key={category.id}
                className="animate-fade-up-soft rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-stone-900">{category.name}</h2>
                    <p className="text-sm text-stone-500">
                      Pilih menu yang diinginkan, lalu cek keranjang di sebelah kanan.
                    </p>
                  </div>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                    {category.menuItems.length} menu
                  </span>
                </div>

                <div className="grid gap-3">
                  {category.menuItems.map((menuItem) => {
                    const currentQty = getCartQuantity(menuItem.id);

                    return (
                      <article
                        key={menuItem.id}
                        className="menu-card-lift rounded-[24px] border border-stone-200 bg-stone-50 p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div
                            className="h-24 w-full shrink-0 rounded-[20px] bg-gradient-to-br from-orange-500 via-amber-300 to-orange-200 bg-cover bg-center sm:w-24"
                            style={
                              menuItem.imageUrl
                                ? { backgroundImage: `url(${menuItem.imageUrl})` }
                                : undefined
                            }
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="text-lg font-semibold text-stone-900">
                                  {menuItem.name}
                                </h3>
                                <p className="mt-1 text-sm leading-6 text-stone-500">
                                  {menuItem.description ?? "Menu favorit restoran hari ini."}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-base font-semibold text-orange-600">
                                  {formatCurrency(menuItem.price)}
                                </p>
                                <p className="mt-1 text-xs font-medium text-stone-500">
                                  Stok {menuItem.stock}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                              <p className="text-sm text-stone-500">
                                {currentQty > 0
                                  ? `Sudah dipilih ${currentQty} item`
                                  : "Belum masuk ke keranjang"}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => updateCart(menuItem, -1, event)}
                                  disabled={currentQty === 0}
                                  className="h-10 w-10 rounded-full border border-stone-300 bg-white text-lg text-stone-700 disabled:opacity-40"
                                >
                                  -
                                </button>
                                <span
                                  className={cn(
                                    "cart-chip-pop min-w-8 text-center text-base font-semibold text-stone-950",
                                    currentQty > 0 && "is-active",
                                  )}
                                >
                                  {currentQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={(event) => updateCart(menuItem, 1, event)}
                                  className="h-10 rounded-full bg-stone-950 px-4 text-sm font-semibold text-white"
                                >
                                  {currentQty > 0 ? "Tambah" : "Pilih"}
                                </button>
                              </div>
                            </div>
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
          <div className="animate-fade-up-soft rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[28px] sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-500">
              Ringkasan pesanan
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">{tableName}</h2>
            <p className="mt-1 text-sm text-stone-500">
              Isi data singkat di bawah ini sebelum mengirim pesanan.
            </p>

            <div className="mt-5 space-y-3">
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-orange-500"
                placeholder="Nama pemesan"
              />
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-24 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-orange-500"
                placeholder="Catatan untuk seluruh pesanan, misalnya minta alat makan tambahan"
              />
            </div>

            <div className="mt-5 space-y-3">
              <p className="text-sm font-semibold text-stone-900">Pilih metode pembayaran</p>
              <label className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">
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
              <label className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">
                <input
                  checked={paymentMethod === PaymentMethod.qris_upload}
                  onChange={() => setPaymentMethod(PaymentMethod.qris_upload)}
                  type="radio"
                  name="paymentMethod"
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-stone-900">Upload bukti bayar QRIS</p>
                  <p className="mt-1 text-stone-500">
                    Pilih ini jika sudah transfer dan ingin kasir memeriksa lebih cepat.
                  </p>
                </div>
              </label>
            </div>

            {paymentMethod === PaymentMethod.qris_upload ? (
              <div className="mt-4 rounded-2xl border border-stone-200 bg-orange-50 p-4">
                <p className="text-sm font-semibold text-stone-900">Unggah bukti pembayaran</p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
                  className="mt-3 w-full text-sm text-stone-700"
                />
                <p className="mt-2 text-xs text-stone-500">
                  Format JPG, PNG, atau WEBP dengan ukuran maksimal 3MB.
                </p>
              </div>
            ) : null}
          </div>

          <div
            data-cart-target="true"
            className="animate-fade-up-soft rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[28px] sm:p-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-stone-900">Keranjang</h3>
              <span className="text-sm text-stone-500">{cartQuantity} item</span>
            </div>

            <div className="mt-4 space-y-3">
              {cart.length ? (
                cart.map((item) => (
                  <div key={item.menuItemId} className="menu-card-lift rounded-2xl bg-stone-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-900">{item.name}</p>
                        <p className="mt-1 text-sm text-stone-500">
                          {formatCurrency(item.price)} per item
                        </p>
                      </div>
                      <p className="font-semibold text-orange-600">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) =>
                            updateCart(
                              {
                                id: item.menuItemId,
                                name: item.name,
                                price: item.price,
                                stock: Number.MAX_SAFE_INTEGER,
                              },
                              -1,
                              event,
                            )
                          }
                          className="h-9 w-9 rounded-full border border-stone-300 bg-white text-lg text-stone-700"
                        >
                          -
                        </button>
                        <span
                          className={cn(
                            "cart-chip-pop min-w-8 text-center font-semibold text-stone-950",
                            item.quantity > 0 && "is-active",
                          )}
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={(event) =>
                            updateCart(
                              {
                                id: item.menuItemId,
                                name: item.name,
                                price: item.price,
                                stock:
                                  allAvailableItems.find((menuItem) => menuItem.id === item.menuItemId)
                                    ?.stock ?? item.quantity,
                              },
                              1,
                              event,
                            )
                          }
                          className="h-9 w-9 rounded-full bg-stone-950 text-lg text-white"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((current) =>
                            current.filter((entry) => entry.menuItemId !== item.menuItemId),
                          )
                        }
                        className="text-sm font-medium text-rose-600"
                      >
                        Hapus
                      </button>
                    </div>

                    <textarea
                      value={item.note}
                      onChange={(event) => updateNote(item.menuItemId, event.target.value)}
                      className="mt-3 min-h-20 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500"
                      placeholder="Catatan item, misalnya tanpa sambal atau es batu sedikit"
                    />
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">
                  Belum ada item dalam keranjang. Pilih menu di sebelah kiri untuk mulai pesan.
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl bg-orange-50 px-4 py-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-stone-800">Total pembayaran</p>
                <p className="text-xl font-bold text-stone-950">{formatCurrency(total)}</p>
              </div>
              <p className="mt-2 text-sm text-stone-500">
                Periksa kembali jumlah pesanan sebelum dikirim ke kasir.
              </p>
            </div>

            {error ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
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

      <div className="sticky bottom-4 z-20 mt-6 xl:hidden">
        <button
          data-cart-target="true"
          type="button"
          onClick={submitOrder}
          disabled={isPending}
          className={cn(
            "flex w-full items-center justify-between rounded-full bg-stone-950 px-5 py-4 text-left text-white shadow-xl disabled:opacity-60",
            cartQuantity > 0 && "animate-pulse-glow-soft",
          )}
        >
          <span>
            <span className="block text-xs uppercase tracking-[0.18em] text-orange-200">
              Keranjang
            </span>
            <span className="block text-sm">{cartQuantity} item dipilih</span>
          </span>
          <span className="text-base font-semibold">
            {isPending ? "Mengirim..." : formatCurrency(total)}
          </span>
        </button>
      </div>
    </>
  );
}
