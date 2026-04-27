"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useRouter } from "next/navigation";

import { saveCustomerCart, type CustomerCartEntry } from "@/lib/customer-cart";
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
  tableCode,
  tableName,
}: {
  categories: MenuGroup[];
  tableCode: string;
  tableName: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CustomerCartEntry[]>(() => loadInitialCart(tableCode));
  const [flyToCartItems, setFlyToCartItems] = useState<FlyToCartItem[]>([]);
  const flyToCartIdRef = useRef(0);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    saveCustomerCart(tableCode, cart);
  }, [cart, tableCode]);

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

  function goToCheckout() {
    if (!cart.length) {
      setError("Keranjang masih kosong.");
      return;
    }

    setError(null);
    router.push(`/menu/${tableCode}/checkout`);
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

      <div className="grid gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.88fr)]">
        <div className="space-y-5">
          <section className="animate-fade-up-soft rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500 sm:text-base"
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
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-stone-900">{category.name}</h2>
                    <p className="text-sm text-stone-500">
                      Pilih menu yang diinginkan, lalu lanjutkan ke checkout saat keranjang sudah siap.
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
                        className="menu-card-lift rounded-[24px] border border-stone-200 bg-stone-50 p-4 sm:p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div
                            className="h-28 w-full shrink-0 rounded-[20px] bg-gradient-to-br from-orange-500 via-amber-300 to-orange-200 bg-cover bg-center sm:h-24 sm:w-24"
                            style={
                              menuItem.imageUrl
                                ? { backgroundImage: `url(${menuItem.imageUrl})` }
                                : undefined
                            }
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <h3 className="text-lg font-semibold text-stone-900">
                                  {menuItem.name}
                                </h3>
                                <p className="mt-1 text-sm leading-6 text-stone-500">
                                  {menuItem.description ?? "Menu favorit restoran hari ini."}
                                </p>
                              </div>
                              <div className="flex items-end justify-between gap-3 sm:block sm:text-right">
                                <p className="text-base font-semibold text-orange-600">
                                  {formatCurrency(menuItem.price)}
                                </p>
                                <p className="mt-1 text-xs font-medium text-stone-500">
                                  Stok {menuItem.stock}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-sm text-stone-500">
                                {currentQty > 0
                                  ? `Sudah dipilih ${currentQty} item`
                                  : "Belum masuk ke keranjang"}
                              </p>
                              <div className="flex items-center gap-2 self-start sm:self-auto">
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

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="animate-fade-up-soft rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[28px] sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-500">
              Langkah 1
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">{tableName}</h2>
            <p className="mt-1 text-sm text-stone-500">
              Pilih menu dulu di halaman ini. Setelah itu Anda lanjut ke halaman checkout
              terpisah untuk isi data pemesan dan pilih metode pembayaran.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-stone-50 p-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Keranjang</p>
                <p className="mt-1 text-lg font-semibold text-stone-950">{cartQuantity} item</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Sementara</p>
                <p className="mt-1 text-lg font-semibold text-orange-600">{formatCurrency(total)}</p>
              </div>
            </div>
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
              onClick={goToCheckout}
              className="mt-4 hidden w-full rounded-2xl bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-600 xl:block"
            >
              Lanjut ke Checkout
            </button>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-3 z-20 mt-6 xl:hidden">
        <button
          data-cart-target="true"
          type="button"
          onClick={goToCheckout}
          className={cn(
            "flex w-full items-center justify-between rounded-[28px] bg-stone-950 px-4 py-4 text-left text-white shadow-xl ring-1 ring-white/10",
            cartQuantity > 0 && "animate-pulse-glow-soft",
          )}
        >
          <span>
            <span className="block text-xs uppercase tracking-[0.18em] text-orange-200">
              Keranjang
            </span>
            <span className="block text-sm">{cartQuantity} item dipilih</span>
          </span>
          <span className="text-right">
            <span className="block text-base font-semibold">{formatCurrency(total)}</span>
            <span className="block text-xs text-stone-300">Lanjut</span>
          </span>
        </button>
      </div>
    </>
  );
}

function loadInitialCart(tableCode: string) {
  if (typeof window === "undefined") {
    return [] as CustomerCartEntry[];
  }

  return loadCustomerCart(tableCode);
}
