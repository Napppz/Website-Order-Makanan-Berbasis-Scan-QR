import { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  isValidMidtransNotificationSignature,
  resolveMidtransOrderStatus,
  type MidtransNotificationPayload,
} from "@/lib/midtrans";
import { getPrisma } from "@/lib/prisma";
import { enforceRateLimit, getRateLimitClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const payload = (await request.json()) as MidtransNotificationPayload;

  if (!isValidMidtransNotificationSignature(payload)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const orderNumber = payload.order_id?.trim();
  if (!orderNumber) {
    return NextResponse.json({ ok: false, error: "Missing order id" }, { status: 400 });
  }

  const ipAddress = await getRateLimitClientIp();
  const rateLimitResult = await enforceRateLimit(
    {
      keyPrefix: "midtrans-notification",
      limit: 40,
      windowSeconds: 60,
    },
    [ipAddress, orderNumber],
  );
  if (!rateLimitResult.ok) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  const nextStatus = resolveMidtransOrderStatus(payload);
  if (!nextStatus) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  await prisma.order.update({
    where: { orderNumber },
    data: {
      status: nextStatus,
      paidAt:
        nextStatus === OrderStatus.paid
          ? new Date()
          : nextStatus === OrderStatus.pending_payment
            ? null
            : undefined,
    },
  });

  revalidatePath("/kasir");
  revalidatePath("/kasir/pesanan");
  revalidatePath(`/pesanan/${orderNumber}`);

  return NextResponse.json({ ok: true });
}
