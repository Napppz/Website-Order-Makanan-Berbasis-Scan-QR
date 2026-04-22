"use server";

import { randomUUID } from "node:crypto";

import {
  OrderStatus,
  PaymentMethod,
  PaymentProofStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSession, destroySession, requireCashier } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { generateOrderNumber, slugify } from "@/lib/utils";

const prisma = getPrisma();

const loginSchema = z.object({
  identity: z.string().min(1, "Email atau username wajib diisi."),
  password: z.string().min(1, "Password wajib diisi."),
});

const lineItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().positive(),
  note: z.string().max(250).optional().default(""),
});

async function ensureUniqueOrderNumber() {
  for (let index = 0; index < 10; index += 1) {
    const orderNumber = generateOrderNumber();
    const existing = await prisma.order.findUnique({ where: { orderNumber } });

    if (!existing) {
      return orderNumber;
    }
  }

  return `${generateOrderNumber()}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

async function saveProofFile(file: File) {
  if (!file || file.size === 0) {
    throw new Error("Bukti pembayaran wajib diunggah.");
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Format bukti bayar harus JPG, PNG, atau WEBP.");
  }

  const maxSize = 3 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("Ukuran bukti bayar maksimal 3MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  return `data:${file.type};base64,${base64}`;
}

function parseCart(rawCart: string) {
  const parsed = JSON.parse(rawCart);
  return z.array(lineItemSchema).min(1, "Keranjang tidak boleh kosong.").parse(parsed);
}

export async function loginCashier(_: { error?: string } | undefined, formData: FormData) {
  const parsed = loginSchema.safeParse({
    identity: formData.get("identity"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data login tidak valid." };
  }

  const cashier = await prisma.cashierUser.findFirst({
    where: {
      OR: [
        { email: parsed.data.identity.toLowerCase() },
        { username: parsed.data.identity.toLowerCase() },
      ],
    },
  });

  if (!cashier) {
    return { error: "Akun kasir tidak ditemukan." };
  }

  const isValid = await bcrypt.compare(parsed.data.password, cashier.passwordHash);
  if (!isValid) {
    return { error: "Password yang Anda masukkan salah." };
  }

  await createSession({
    userId: cashier.id,
    email: cashier.email,
    name: cashier.name,
  });

  redirect("/kasir");
}

export async function logoutCashier() {
  await destroySession();
  redirect("/login");
}

export async function createCategoryAction(formData: FormData) {
  await requireCashier();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return;
  }

  await prisma.category.create({
    data: {
      name,
      slug: `${slugify(name)}-${randomUUID().slice(0, 5)}`,
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    },
  });

  revalidatePath("/kasir/menu");
}

export async function createMenuItemAction(formData: FormData) {
  await requireCashier();

  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const price = Number(formData.get("price") ?? 0);

  if (!name || !categoryId || price <= 0) {
    return;
  }

  await prisma.menuItem.create({
    data: {
      name,
      slug: `${slugify(name)}-${randomUUID().slice(0, 5)}`,
      description: String(formData.get("description") ?? "").trim() || null,
      price,
      imageUrl: String(formData.get("imageUrl") ?? "").trim() || null,
      categoryId,
      isAvailable: formData.get("isAvailable") === "on",
    },
  });

  revalidatePath("/kasir/menu");
  revalidatePath("/");
}

export async function toggleMenuAvailabilityAction(formData: FormData) {
  await requireCashier();

  const id = String(formData.get("id") ?? "");
  const current = formData.get("current") === "true";

  if (!id) {
    return;
  }

  await prisma.menuItem.update({
    where: { id },
    data: { isAvailable: !current },
  });

  revalidatePath("/kasir/menu");
  revalidatePath("/");
}

export async function deleteMenuItemAction(formData: FormData) {
  await requireCashier();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return;
  }

  await prisma.menuItem.delete({ where: { id } });
  revalidatePath("/kasir/menu");
  revalidatePath("/");
}

export async function createTableAction(formData: FormData) {
  await requireCashier();

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();

  if (!code || !name) {
    return;
  }

  await prisma.table.create({
    data: { code, name },
  });

  revalidatePath("/kasir/meja");
}

export async function deleteTableAction(formData: FormData) {
  await requireCashier();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return;
  }

  const table = await prisma.table.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });

  if (!table || table._count.orders > 0) {
    return;
  }

  await prisma.table.delete({ where: { id } });
  revalidatePath("/kasir/meja");
}

export async function submitCustomerOrder(formData: FormData) {
  try {
    const customerName = String(formData.get("customerName") ?? "").trim();
    const tableId = String(formData.get("tableId") ?? "");
    const paymentMethod = String(formData.get("paymentMethod") ?? "");
    const notes = String(formData.get("notes") ?? "").trim();
    const items = parseCart(String(formData.get("cart") ?? "[]"));

    if (!customerName) {
      return { success: false, error: "Nama pemesan wajib diisi." };
    }

    if (!Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod)) {
      return { success: false, error: "Metode pembayaran tidak valid." };
    }

    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) {
      return { success: false, error: "Meja tidak ditemukan." };
    }

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: items.map((item) => item.menuItemId) } },
    });

    if (menuItems.length !== items.length) {
      return { success: false, error: "Ada menu yang tidak tersedia." };
    }

    const unavailable = menuItems.find((item) => !item.isAvailable);
    if (unavailable) {
      return { success: false, error: `${unavailable.name} sedang tidak tersedia.` };
    }

    const menuMap = new Map(menuItems.map((item) => [item.id, item]));
    const totalAmount = items.reduce((sum, item) => {
      const menuItem = menuMap.get(item.menuItemId);
      return sum + (menuItem?.price ?? 0) * item.quantity;
    }, 0);

    const orderNumber = await ensureUniqueOrderNumber();
    const proofFile = formData.get("paymentProof");

    const imageUrl =
      paymentMethod === PaymentMethod.qris_upload && proofFile instanceof File
        ? await saveProofFile(proofFile)
        : null;

    if (paymentMethod === PaymentMethod.qris_upload && !imageUrl) {
      return { success: false, error: "Bukti bayar QRIS wajib diunggah." };
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName,
        tableId,
        notes: notes || null,
        paymentMethod: paymentMethod as PaymentMethod,
        status:
          paymentMethod === PaymentMethod.qris_upload
            ? OrderStatus.payment_submitted
            : OrderStatus.pending_payment,
        totalAmount,
        items: {
          create: items.map((item) => {
            const menuItem = menuMap.get(item.menuItemId)!;

            return {
              menuItemId: menuItem.id,
              quantity: item.quantity,
              note: item.note || null,
              unitPrice: menuItem.price,
              subtotal: menuItem.price * item.quantity,
            };
          }),
        },
        paymentProof: imageUrl
          ? {
              create: {
                imageUrl,
                status: PaymentProofStatus.submitted,
              },
            }
          : undefined,
      },
    });

    revalidatePath(`/menu/${table.code}`);
    revalidatePath("/kasir");
    revalidatePath("/kasir/pesanan");

    return { success: true, orderNumber: order.orderNumber };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat membuat pesanan.";

    return { success: false, error: message };
  }
}

export async function createManualOrderAction(formData: FormData) {
  await requireCashier();

  const customerName = String(formData.get("customerName") ?? "").trim();
  const tableId = String(formData.get("tableId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const items = parseCart(String(formData.get("cart") ?? "[]"));
  const paymentMethod =
    formData.get("paymentMethod") === PaymentMethod.qris_upload
      ? PaymentMethod.qris_upload
      : PaymentMethod.cashier;

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map((item) => item.menuItemId) } },
  });

  if (!customerName || !tableId || menuItems.length !== items.length) {
    return { success: false, error: "Data pesanan manual tidak lengkap." };
  }

  const totalAmount = items.reduce((sum, item) => {
    const menuItem = menuItems.find((menu) => menu.id === item.menuItemId);
    return sum + (menuItem?.price ?? 0) * item.quantity;
  }, 0);

  const order = await prisma.order.create({
    data: {
      orderNumber: await ensureUniqueOrderNumber(),
      customerName,
      tableId,
      notes: notes || null,
      paymentMethod,
      status:
        paymentMethod === PaymentMethod.cashier
          ? OrderStatus.pending_payment
          : OrderStatus.payment_submitted,
      totalAmount,
      items: {
        create: items.map((item) => {
          const menuItem = menuItems.find((menu) => menu.id === item.menuItemId)!;
          return {
            menuItemId: menuItem.id,
            quantity: item.quantity,
            note: item.note || null,
            unitPrice: menuItem.price,
            subtotal: menuItem.price * item.quantity,
          };
        }),
      },
    },
  });

  revalidatePath("/kasir");
  revalidatePath("/kasir/pesanan");
  return { success: true, orderNumber: order.orderNumber };
}

export async function updateOrderStatusAction(formData: FormData) {
  const cashier = await requireCashier();

  const orderId = String(formData.get("orderId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "") as OrderStatus;

  if (!orderId || !Object.values(OrderStatus).includes(nextStatus)) {
    return;
  }

  await prisma.order.update({
    where: { id: orderId },
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

  if (nextStatus === OrderStatus.paid) {
    await prisma.paymentProof.updateMany({
      where: { orderId },
      data: {
        status: PaymentProofStatus.approved,
        reviewedAt: new Date(),
        reviewerId: cashier.id,
      },
    });
  }

  revalidatePath("/kasir");
  revalidatePath("/kasir/pesanan");
}

export async function approvePaymentProofAction(formData: FormData) {
  const cashier = await requireCashier();
  const orderId = String(formData.get("orderId") ?? "");

  if (!orderId) {
    return;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.paid,
      paidAt: new Date(),
      paymentProof: {
        update: {
          status: PaymentProofStatus.approved,
          reviewedAt: new Date(),
          reviewerId: cashier.id,
          notes: "Pembayaran QRIS disetujui kasir.",
        },
      },
    },
  });

  revalidatePath("/kasir");
  revalidatePath("/kasir/pesanan");
}

export async function rejectPaymentProofAction(formData: FormData) {
  const cashier = await requireCashier();
  const orderId = String(formData.get("orderId") ?? "");

  if (!orderId) {
    return;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.pending_payment,
      paymentProof: {
        update: {
          status: PaymentProofStatus.rejected,
          reviewedAt: new Date(),
          reviewerId: cashier.id,
          notes: "Bukti bayar ditolak. Mohon unggah ulang atau bayar di kasir.",
        },
      },
    },
  });

  revalidatePath("/kasir");
  revalidatePath("/kasir/pesanan");
}
