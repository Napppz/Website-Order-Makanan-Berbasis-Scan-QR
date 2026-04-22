import { OrderStatus } from "@prisma/client";

import { getPrisma } from "@/lib/prisma";

export async function getDashboardStats() {
  const prisma = getPrisma();
  const [menuCount, tableCount, pendingCount, paidCount] = await Promise.all([
    prisma.menuItem.count(),
    prisma.table.count(),
    prisma.order.count({
      where: {
        status: {
          in: [OrderStatus.pending_payment, OrderStatus.payment_submitted],
        },
      },
    }),
    prisma.order.count({ where: { status: OrderStatus.paid } }),
  ]);

  return { menuCount, tableCount, pendingCount, paidCount };
}

export async function getCategoriesWithItems() {
  return getPrisma().category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      menuItems: {
        orderBy: { name: "asc" },
      },
    },
  });
}

export async function getTables() {
  return getPrisma().table.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { orders: true },
      },
    },
  });
}

export async function getOrders(status?: OrderStatus | "all" | "paid-only") {
  const where =
    status === "all" || !status
      ? {}
      : status === "paid-only"
        ? { status: OrderStatus.paid }
        : { status };

  return getPrisma().order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      table: true,
      items: {
        include: { menuItem: true },
      },
      paymentProof: {
        include: {
          reviewer: true,
        },
      },
    },
  });
}
