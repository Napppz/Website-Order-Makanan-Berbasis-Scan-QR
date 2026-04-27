import Link from "next/link";
import { notFound } from "next/navigation";

import { CustomerCheckoutClient } from "@/components/customer-checkout-client";
import { getPrisma } from "@/lib/prisma";

export default async function CustomerCheckoutPage({
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

  const menuItems = await prisma.menuItem.findMany({
    select: {
      id: true,
      stock: true,
      isAvailable: true,
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
      <section className="mb-6 overflow-hidden rounded-[28px] bg-stone-950 px-5 py-6 text-white shadow-xl sm:rounded-[32px] sm:px-6 sm:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Checkout terpisah</p>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl md:text-4xl">{table.name}</h1>
            <p className="mt-2 max-w-2xl text-stone-300">
              Setelah selesai memilih menu, lanjutkan ke halaman ini untuk mengonfirmasi
              pesanan dan menentukan metode pembayaran.
            </p>
          </div>
          <Link
            href={`/menu/${table.code}`}
            className="rounded-full border border-white/15 px-5 py-3 text-center font-semibold text-white hover:bg-white/10"
          >
            Kembali ke menu
          </Link>
        </div>
      </section>

      <CustomerCheckoutClient
        tableId={table.id}
        tableCode={table.code}
        tableName={table.name}
        menuItems={menuItems}
      />
    </main>
  );
}
