import { OrderStatus } from "@prisma/client";

import { getPrisma } from "@/lib/prisma";

export async function getDashboardStats() {
  const prisma = getPrisma();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [
    menuCount,
    tableCount,
    pendingCount,
    paidCount,
    todayOrderCount,
    qrisReviewCount,
    todayPaidAggregate,
    processingCount,
  ] = await Promise.all([
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
    prisma.order.count({
      where: {
        createdAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.order.count({
      where: {
        status: OrderStatus.payment_submitted,
      },
    }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        status: {
          in: [OrderStatus.paid, OrderStatus.processing, OrderStatus.completed],
        },
        createdAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.order.count({
      where: { status: OrderStatus.processing },
    }),
  ]);

  return {
    menuCount,
    tableCount,
    pendingCount,
    paidCount,
    todayOrderCount,
    qrisReviewCount,
    processingCount,
    todayRevenue: todayPaidAggregate._sum.totalAmount ?? 0,
  };
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

export async function getOrders(
  status?: OrderStatus | "all" | "paid-only",
  search?: string,
) {
  const trimmedSearch = search?.trim();
  const statusWhere =
    status === "all" || !status
      ? {}
      : status === "paid-only"
        ? { status: OrderStatus.paid }
        : { status };

  const searchWhere = trimmedSearch
    ? {
        OR: [
          { orderNumber: { contains: trimmedSearch, mode: "insensitive" as const } },
          { customerName: { contains: trimmedSearch, mode: "insensitive" as const } },
          {
            table: {
              is: { name: { contains: trimmedSearch, mode: "insensitive" as const } },
            },
          },
          {
            table: {
              is: { code: { contains: trimmedSearch, mode: "insensitive" as const } },
            },
          },
        ],
      }
    : {};

  return getPrisma().order.findMany({
    where: {
      ...statusWhere,
      ...searchWhere,
    },
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
