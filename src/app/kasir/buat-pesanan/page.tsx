import { ManualOrderClient } from "@/components/manual-order-client";
import { getPrisma } from "@/lib/prisma";

export default async function CreateManualOrderPage() {
  const prisma = getPrisma();
  const [tables, menuItems] = await Promise.all([
    prisma.table.findMany({ orderBy: { name: "asc" } }),
    prisma.menuItem.findMany({
      where: { isAvailable: true, stock: { gt: 0 } },
      orderBy: { name: "asc" },
      include: { category: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Order manual</p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-950">Buat pesanan dari dashboard kasir</h1>
      </div>

      <ManualOrderClient
        tables={tables}
        menuItems={menuItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          stock: item.stock,
          categoryName: item.category.name,
        }))}
      />
    </div>
  );
}
