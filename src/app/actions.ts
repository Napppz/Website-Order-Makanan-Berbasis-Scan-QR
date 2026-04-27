"use server";

import { randomUUID } from "node:crypto";

import {
  Prisma,
  OrderStatus,
  PaymentMethod,
  PaymentProofStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSession, destroySession, requireCashier } from "@/lib/auth";
import {
  deleteR2ObjectByUrl,
  uploadBufferToR2,
} from "@/lib/cloudflare-r2";
import {
  createMidtransTransaction,
  getMidtransConfigurationError,
} from "@/lib/midtrans";
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

async function saveMenuImageFile(file: File) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Foto menu harus berformat JPG, PNG, atau WEBP.");
  }

  const maxSize = 4 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("Ukuran foto menu maksimal 4MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadBufferToR2({
    buffer,
    contentType: file.type,
    keyPrefix: "menu-images",
    fileName: file.name || "menu-image",
  });
}

async function deleteMenuImageFile(imageUrl: string | null | undefined) {
  await deleteR2ObjectByUrl(imageUrl);
}

function parseCart(rawCart: string) {
  const parsed = JSON.parse(rawCart);
  return z.array(lineItemSchema).min(1, "Keranjang tidak boleh kosong.").parse(parsed);
}

function getRequestedQuantities(items: z.infer<typeof lineItemSchema>[]) {
  const quantities = new Map<string, number>();

  for (const item of items) {
    quantities.set(
      item.menuItemId,
      (quantities.get(item.menuItemId) ?? 0) + item.quantity,
    );
  }

  return quantities;
}

function getStockShortage(
  menuItems: { id: string; name: string; stock: number }[],
  quantities: Map<string, number>,
) {
  return menuItems.find((item) => item.stock < (quantities.get(item.id) ?? 0));
}

async function ensureMidtransPaymentLink(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      table: true,
      items: {
        include: {
          menuItem: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("Pesanan tidak ditemukan.");
  }

  if (order.paymentMethod !== PaymentMethod.midtrans_snap) {
    return null;
  }

  if (order.paymentUrl) {
    return { paymentUrl: order.paymentUrl, paymentToken: order.paymentToken };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL belum dikonfigurasi.");
  }

  const transaction = await createMidtransTransaction({
    orderNumber: order.orderNumber,
    grossAmount: order.totalAmount,
    customerName: order.customerName,
    finishRedirectUrl: `${baseUrl}/pesanan/${order.orderNumber}`,
    items: order.items.map((item) => ({
      id: item.menuItemId,
      name: item.menuItem.name,
      price: item.unitPrice,
      quantity: item.quantity,
    })),
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentToken: transaction.token,
      paymentUrl: transaction.redirect_url,
    },
  });

  return {
    paymentUrl: transaction.redirect_url,
    paymentToken: transaction.token,
  };
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

  let imageUrl: string | null = null;

  try {
    const name = String(formData.get("name") ?? "").trim();
    const categoryId = String(formData.get("categoryId") ?? "");
    const price = Number(formData.get("price") ?? 0);
    const stock = Math.max(0, Number(formData.get("stock") ?? 0) || 0);

    if (!name || !categoryId || price <= 0) {
      return;
    }

    const imageFile = formData.get("imageFile");
    imageUrl =
      imageFile instanceof File ? await saveMenuImageFile(imageFile) : null;

    await prisma.menuItem.create({
      data: {
        name,
        slug: `${slugify(name)}-${randomUUID().slice(0, 5)}`,
        description: String(formData.get("description") ?? "").trim() || null,
        price,
        stock,
        imageUrl,
        categoryId,
        isAvailable: formData.get("isAvailable") === "on",
      },
    });

    revalidatePath("/kasir/menu");
    revalidatePath("/");
    redirect("/kasir/menu?notice=menu-created");
  } catch (error) {
    await deleteMenuImageFile(imageUrl);
    console.error("Gagal menyimpan foto menu", error);
    throw error;
  }
}

export async function updateMenuItemAction(formData: FormData) {
  await requireCashier();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const price = Number(formData.get("price") ?? 0);
  const stock = Math.max(0, Number(formData.get("stock") ?? 0) || 0);

  if (!id || !name || !categoryId || price <= 0) {
    return;
  }

  const existing = await prisma.menuItem.findUnique({
    where: { id },
    select: { imageUrl: true },
  });

  let nextImageUrl = existing?.imageUrl ?? null;
  const imageFile = formData.get("imageFile");

  if (imageFile instanceof File && imageFile.size > 0) {
    nextImageUrl = await saveMenuImageFile(imageFile);
  }

  try {
    await prisma.menuItem.update({
      where: { id },
      data: {
        name,
        description: String(formData.get("description") ?? "").trim() || null,
        price,
        stock,
        imageUrl: nextImageUrl,
        categoryId,
        isAvailable: formData.get("isAvailable") === "on" && stock > 0,
      },
    });

    if (
      existing?.imageUrl &&
      nextImageUrl &&
      existing.imageUrl !== nextImageUrl
    ) {
      await deleteMenuImageFile(existing.imageUrl);
    }
  } catch (error) {
    if (nextImageUrl && nextImageUrl !== existing?.imageUrl) {
      await deleteMenuImageFile(nextImageUrl);
    }

    throw error;
  }

  revalidatePath("/kasir/menu");
  revalidatePath("/");
}

export async function updateMenuStockAction(formData: FormData) {
  await requireCashier();

  const id = String(formData.get("id") ?? "");
  const stock = Math.max(0, Number(formData.get("stock") ?? 0) || 0);

  if (!id) {
    return;
  }

  await prisma.menuItem.update({
    where: { id },
    data: {
      stock,
      isAvailable: stock > 0,
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

  const menuItem = await prisma.menuItem.findUnique({
    where: { id },
    select: {
      imageUrl: true,
      name: true,
      _count: {
        select: { orderItems: true },
      },
    },
  });

  if (!menuItem) {
    return;
  }

  if (menuItem._count.orderItems > 0) {
    await prisma.menuItem.update({
      where: { id },
      data: {
        isAvailable: false,
        stock: 0,
      },
    });

    revalidatePath("/kasir/menu");
    revalidatePath("/");
    redirect("/kasir/menu?notice=menu-archived");
  }

  try {
    await prisma.menuItem.delete({ where: { id } });
    await deleteMenuImageFile(menuItem.imageUrl);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      await prisma.menuItem.update({
        where: { id },
        data: {
          isAvailable: false,
          stock: 0,
        },
      });

      revalidatePath("/kasir/menu");
      revalidatePath("/");
      redirect("/kasir/menu?notice=menu-archived");
    }

    throw error;
  }

  revalidatePath("/kasir/menu");
  revalidatePath("/");
  redirect("/kasir/menu?notice=menu-deleted");
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

    if (paymentMethod === PaymentMethod.qris_upload) {
      return { success: false, error: "Metode upload bukti QRIS sudah tidak dipakai lagi." };
    }

    if (paymentMethod === PaymentMethod.midtrans_snap) {
      const configurationError = getMidtransConfigurationError();
      if (configurationError) {
        return { success: false, error: configurationError };
      }
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

    const requestedQuantities = getRequestedQuantities(items);
    const stockShortage = getStockShortage(menuItems, requestedQuantities);
    if (stockShortage) {
      return {
        success: false,
        error: `Stok ${stockShortage.name} tersisa ${stockShortage.stock}.`,
      };
    }

    const menuMap = new Map(menuItems.map((item) => [item.id, item]));
    const totalAmount = items.reduce((sum, item) => {
      const menuItem = menuMap.get(item.menuItemId);
      return sum + (menuItem?.price ?? 0) * item.quantity;
    }, 0);

    const orderNumber = await ensureUniqueOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      for (const [menuItemId, quantity] of requestedQuantities) {
        const updated = await tx.menuItem.updateMany({
          where: {
            id: menuItemId,
            isAvailable: true,
            stock: { gte: quantity },
          },
          data: { stock: { decrement: quantity } },
        });

        if (updated.count !== 1) {
          const menuItem = menuMap.get(menuItemId);
          throw new Error(
            `Stok ${menuItem?.name ?? "menu"} tidak mencukupi. Mohon refresh halaman.`,
          );
        }
      }

      return tx.order.create({
        data: {
          orderNumber,
          customerName,
          tableId,
          notes: notes || null,
          paymentMethod: paymentMethod as PaymentMethod,
          status:
            paymentMethod === PaymentMethod.midtrans_snap
              ? OrderStatus.pending_payment
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
        },
      });
    });

    const paymentLink =
      paymentMethod === PaymentMethod.midtrans_snap
        ? await ensureMidtransPaymentLink(order.id)
        : null;

    revalidatePath(`/menu/${table.code}`);
    revalidatePath("/kasir");
    revalidatePath("/kasir/pesanan");

    return {
      success: true,
      orderNumber: order.orderNumber,
      paymentUrl: paymentLink?.paymentUrl ?? null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat membuat pesanan.";

    return { success: false, error: message };
  }
}

export async function createManualOrderAction(formData: FormData) {
  await requireCashier();

  try {
    const customerName = String(formData.get("customerName") ?? "").trim();
    const tableId = String(formData.get("tableId") ?? "");
    const notes = String(formData.get("notes") ?? "").trim();
    const items = parseCart(String(formData.get("cart") ?? "[]"));
    const paymentMethod = PaymentMethod.cashier;

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: items.map((item) => item.menuItemId) } },
    });

    if (!customerName || !tableId || menuItems.length !== items.length) {
      return { success: false, error: "Data pesanan manual tidak lengkap." };
    }

    const unavailable = menuItems.find((item) => !item.isAvailable);
    if (unavailable) {
      return { success: false, error: `${unavailable.name} sedang tidak tersedia.` };
    }

    const requestedQuantities = getRequestedQuantities(items);
    const stockShortage = getStockShortage(menuItems, requestedQuantities);
    if (stockShortage) {
      return {
        success: false,
        error: `Stok ${stockShortage.name} tersisa ${stockShortage.stock}.`,
      };
    }

    const menuMap = new Map(menuItems.map((item) => [item.id, item]));
    const totalAmount = items.reduce((sum, item) => {
      const menuItem = menuMap.get(item.menuItemId);
      return sum + (menuItem?.price ?? 0) * item.quantity;
    }, 0);
    const orderNumber = await ensureUniqueOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      for (const [menuItemId, quantity] of requestedQuantities) {
        const updated = await tx.menuItem.updateMany({
          where: {
            id: menuItemId,
            isAvailable: true,
            stock: { gte: quantity },
          },
          data: { stock: { decrement: quantity } },
        });

        if (updated.count !== 1) {
          const menuItem = menuMap.get(menuItemId);
          throw new Error(
            `Stok ${menuItem?.name ?? "menu"} tidak mencukupi. Mohon refresh halaman.`,
          );
        }
      }

      return tx.order.create({
        data: {
          orderNumber,
          customerName,
          tableId,
          notes: notes || null,
          paymentMethod,
          status: OrderStatus.pending_payment,
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
        },
      });
    });

    revalidatePath("/kasir");
    revalidatePath("/kasir/menu");
    revalidatePath("/kasir/pesanan");
    revalidatePath("/");
    return { success: true, orderNumber: order.orderNumber };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Pesanan manual gagal dibuat.";

    return { success: false, error: message };
  }
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

export async function redirectToMidtransPaymentAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");

  if (!orderId) {
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      paymentMethod: true,
    },
  });

  if (!order || order.paymentMethod !== PaymentMethod.midtrans_snap) {
    return;
  }

  const paymentLink = await ensureMidtransPaymentLink(order.id);
  if (!paymentLink?.paymentUrl) {
    redirect(`/pesanan/${order.orderNumber}`);
  }

  redirect(paymentLink.paymentUrl);
}
