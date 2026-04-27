"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createManualOrderAction } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";

type TableOption = {
  id: string;
  name: string;
  code: string;
};

type MenuOption = {
  id: string;
  name: string;
  price: number;
  stock: number;
  categoryName: string;
};

type CartItem = {
  menuItemId: string;
  quantity: number;
  note: string;
};

export function ManualOrderClient({
  tables,
  menuItems,
}: {
  tables: TableOption[];
  menuItems: MenuOption[];
}) {
  const router = useRouter();
  const [selectedTable, setSelectedTable] = useState(tables[0]?.id ?? "");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cart, setCart] = useState<CartItem[]>([]);

  const total = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const menuItem = menuItems.find((menu) => menu.id === item.menuItemId);
        return sum + (menuItem?.price ?? 0) * item.quantity;
      }, 0),
    [cart, menuItems],
  );

  function updateQuantity(menuItemId: string, delta: number) {
    setCart((current) => {
      const menuItem = menuItems.find((menu) => menu.id === menuItemId);
      const existing = current.find((item) => item.menuItemId === menuItemId);

      if (!existing && delta > 0) {
        if (!menuItem?.stock) {
          return current;
        }

        return [...current, { menuItemId, quantity: 1, note: "" }];
      }

      if (existing && delta > 0 && menuItem && existing.quantity >= menuItem.stock) {
        return current;
      }

      return current
        .map((item) =>
          item.menuItemId === menuItemId
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

  function submit() {
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("tableId", selectedTable);
      formData.set("customerName", customerName);
      formData.set("notes", notes);
      formData.set("cart", JSON.stringify(cart));

      const result = await createManualOrderAction(formData);
      if (!result.success) {
        setError(result.error ?? "Pesanan manual gagal dibuat.");
        return;
      }

      router.push("/kasir/pesanan");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
      <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[28px] sm:p-6">
        <h2 className="text-xl font-semibold text-stone-950">Form pesanan manual</h2>
        <p className="mt-1 text-sm text-stone-500">
          Gunakan halaman ini untuk membuat pesanan walk-in langsung dari dashboard kasir.
        </p>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Nama pelanggan</label>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500 sm:text-base"
              placeholder="Contoh: Bapak Arif"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Pilih meja</label>
            <select
              value={selectedTable}
              onChange={(event) => setSelectedTable(event.target.value)}
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500 sm:text-base"
            >
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name} ({table.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium text-stone-700">Catatan pesanan</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-24 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500 sm:text-base"
            placeholder="Catatan umum untuk order ini"
          />
        </div>

        <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <p className="font-semibold text-stone-900">Pembayaran manual kasir</p>
          <p className="mt-1 text-sm text-stone-500">
            Pesanan yang dibuat dari dashboard kasir otomatis menggunakan alur bayar di kasir.
          </p>
        </div>

        <div className="mt-6 space-y-3 sm:space-y-4">
          {menuItems.map((menuItem) => {
            const quantity = cart.find((item) => item.menuItemId === menuItem.id)?.quantity ?? 0;
            return (
              <div key={menuItem.id} className="rounded-3xl border border-stone-200 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.25em] text-stone-400">
                      {menuItem.categoryName}
                    </p>
                    <h3 className="mt-1 font-semibold text-stone-950">{menuItem.name}</h3>
                    <p className="text-sm font-medium text-orange-600">
                      {formatCurrency(menuItem.price)}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                      Stok {menuItem.stock}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => updateQuantity(menuItem.id, -1)}
                      className="h-10 w-10 rounded-full border border-stone-300 bg-white text-base font-semibold"
                    >
                      -
                    </button>
                    <span className="min-w-9 text-center text-base font-semibold">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(menuItem.id, 1)}
                      className="h-10 w-10 rounded-full bg-stone-950 text-base font-semibold text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
                {quantity > 0 ? (
                  <textarea
                    value={cart.find((item) => item.menuItemId === menuItem.id)?.note ?? ""}
                    onChange={(event) => updateNote(menuItem.id, event.target.value)}
                    className="mt-3 min-h-20 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500"
                    placeholder="Catatan item"
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-[24px] bg-stone-950 p-4 text-white shadow-xl sm:rounded-[28px] sm:p-6">
          <h3 className="text-xl font-semibold">Ringkasan order</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-white/10 p-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-stone-300">Item</p>
              <p className="mt-1 text-lg font-semibold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-300">Total</p>
              <p className="mt-1 text-lg font-semibold text-orange-200">{formatCurrency(total)}</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {cart.length ? (
              cart.map((item) => {
                const menuItem = menuItems.find((menu) => menu.id === item.menuItemId);
                if (!menuItem) return null;

                return (
                  <div key={item.menuItemId} className="rounded-2xl bg-white/10 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{menuItem.name}</p>
                        <p className="text-sm text-stone-300">
                          {item.quantity} x {formatCurrency(menuItem.price)}
                        </p>
                        {item.note ? (
                          <p className="mt-2 text-sm text-stone-300">{item.note}</p>
                        ) : null}
                      </div>
                      <p className="font-semibold">
                        {formatCurrency(menuItem.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-2xl bg-white/10 p-4 text-sm text-stone-300">
                Pilih menu terlebih dahulu.
              </p>
            )}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
            <p className="font-semibold">Total</p>
            <p className="text-2xl font-bold">{formatCurrency(total)}</p>
          </div>
          {error ? (
            <p className="mt-4 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="mt-5 w-full rounded-2xl bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {isPending ? "Menyimpan..." : "Buat Pesanan Manual"}
          </button>
        </div>
      </aside>
    </div>
  );
}
