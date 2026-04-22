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
    <main className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
      <section className="mb-6 rounded-[32px] bg-stone-950 px-6 py-8 text-white shadow-xl">
        <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Menu scan QR</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold md:text-4xl">{table.name}</h1>
            <p className="mt-2 max-w-2xl text-stone-300">
              Pilih makanan dan minuman, lalu checkout langsung dari ponsel Anda.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-stone-200">
            Kode meja: <span className="font-mono font-semibold">{table.code}</span>
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
