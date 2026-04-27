import { NextResponse } from "next/server";

import { requireCashier } from "@/lib/auth";
import { getSalesReportOrders } from "@/lib/data";
import { orderStatusLabels, paymentMethodLabels } from "@/lib/constants";

function parseDateParam(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function addOneDay(date: Date | undefined) {
  if (!date) {
    return undefined;
  }

  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function csvCell(value: string | number | null | undefined) {
  const raw = value === null || value === undefined ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  await requireCashier();

  const url = new URL(request.url);
  const from = parseDateParam(url.searchParams.get("from"));
  const to = addOneDay(parseDateParam(url.searchParams.get("to")));
  const orders = await getSalesReportOrders({ from, to });

  const rows = [
    [
      "Nomor Order",
      "Tanggal",
      "Customer",
      "Meja",
      "Metode Bayar",
      "Status",
      "Total",
      "Item",
      "Catatan",
    ],
    ...orders.map((order) => [
      order.orderNumber,
      order.createdAt.toISOString(),
      order.customerName,
      order.table.name,
      paymentMethodLabels[order.paymentMethod],
      orderStatusLabels[order.status],
      order.totalAmount,
      order.items
        .map((item) => `${item.menuItem.name} x${item.quantity}`)
        .join("; "),
      order.notes ?? "",
    ]),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const fileName = `laporan-penjualan-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
