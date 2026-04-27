import { notFound } from "next/navigation";

import { CustomerOrderClient } from "@/components/customer-order-client";
import { getPrisma } from "@/lib/prisma";

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

function getMenuItemStock(menuItem: unknown) {
  if (!menuItem || typeof menuItem !== "object") {
    return 0;
  }

  const stock = (menuItem as { stock?: unknown }).stock;
  return typeof stock === "number" ? stock : 0;
}

export default async function CustomerMenuPage({
  params,
}: {
  params: Promise<{ tableCode: string }>;
}) {
  const { tableCode } = await params;
  const prisma = getPrisma();

  try {
    const table = await prisma.table.findUnique({
      where: { code: tableCode.toUpperCase() },
    });

    if (!table) {
      notFound();
    }

    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        menuItems: {
          orderBy: { name: "asc" },
        },
      },
    });

    const normalizedCategories: MenuGroup[] = categories.map((category) => ({
      id: category.id,
      name: category.name,
      menuItems: category.menuItems.map((menuItem) => {
        return {
          id: menuItem.id,
          name: menuItem.name,
          description: menuItem.description,
          price: menuItem.price,
          stock: getMenuItemStock(menuItem),
          imageUrl: menuItem.imageUrl,
          isAvailable: menuItem.isAvailable,
        };
      }),
    }));

    return (
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <section className="mb-6 overflow-hidden rounded-[28px] bg-stone-950 px-5 py-6 text-white shadow-xl sm:rounded-[32px] sm:px-6 sm:py-8">
          <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Pesan dari meja</p>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">{table.name}</h1>
              <p className="mt-2 max-w-2xl text-stone-300">
                Lihat menu, pilih jumlah pesanan, lalu kirim langsung dari ponsel Anda tanpa
                menunggu kasir datang ke meja.
              </p>
            </div>
            <div className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-stone-200 lg:w-auto">
              Kode meja: <span className="font-mono font-semibold">{table.code}</span>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Kategori aktif</p>
              <p className="mt-1 text-xl font-semibold">{normalizedCategories.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Menu tersedia</p>
              <p className="mt-1 text-xl font-semibold">
                {normalizedCategories.reduce(
                  (sum, category) =>
                    sum +
                    category.menuItems.filter((item) => item.isAvailable && item.stock > 0)
                      .length,
                  0,
                )}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Checkout</p>
              <p className="mt-1 text-xl font-semibold">Mudah dan cepat</p>
            </div>
          </div>
        </section>

        <CustomerOrderClient
          categories={normalizedCategories}
          tableId={table.id}
          tableName={table.name}
        />
      </main>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Aplikasi belum bisa membaca database.";

    return (
      <main className="mx-auto max-w-4xl px-5 py-8 md:px-8">
        <section className="rounded-[28px] border border-amber-300 bg-amber-50 p-6 text-stone-900 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
            Database belum siap
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Halaman menu belum bisa dimuat.</h1>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            Periksa `DATABASE_URL`, jalankan sinkronisasi schema Prisma, lalu refresh halaman ini.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-stone-950 p-4 text-sm text-stone-100">
            <code>{message}</code>
          </pre>
        </section>
      </main>
    );
  }
}
