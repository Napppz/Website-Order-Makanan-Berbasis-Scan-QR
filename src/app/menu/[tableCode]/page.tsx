import { notFound } from "next/navigation";

import { CustomerOrderClient } from "@/components/customer-order-client";
import { getPrisma } from "@/lib/prisma";

export default async function CustomerMenuPage({
  params,
}: {
  params: Promise<{ tableCode: string }>;
}) {
  const { tableCode } = await params;
  const prisma = getPrisma();

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

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
      <section className="mb-6 overflow-hidden rounded-[28px] bg-stone-950 px-5 py-6 text-white shadow-xl sm:rounded-[32px] sm:px-6 sm:py-8">
        <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Menu scan QR</p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">{table.name}</h1>
            <p className="mt-2 max-w-2xl text-stone-300">
              Pilih makanan dan minuman, beri catatan per item, lalu checkout langsung dari
              ponsel Anda tanpa menunggu kasir datang ke meja.
            </p>
          </div>
          <div className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-stone-200 lg:w-auto">
            Kode meja: <span className="font-mono font-semibold">{table.code}</span>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Kategori aktif</p>
            <p className="mt-1 text-xl font-semibold">{categories.length}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Menu tersedia</p>
            <p className="mt-1 text-xl font-semibold">
              {categories.reduce(
                (sum, category) =>
                  sum + category.menuItems.filter((item) => item.isAvailable).length,
                0,
              )}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Checkout</p>
            <p className="mt-1 text-xl font-semibold">Bayar kasir atau QRIS</p>
          </div>
        </div>
      </section>

      <CustomerOrderClient
        categories={categories}
        tableId={table.id}
        tableName={table.name}
      />
    </main>
  );
}
