import { PrismaClient, PaymentMethod, OrderStatus } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const passwordHash = await bcrypt.hash(
    process.env.CASHIER_PASSWORD ?? "kasir123",
    10,
  );

  await prisma.cashierUser.upsert({
    where: { email: process.env.CASHIER_EMAIL ?? "kasir@example.com" },
    update: {
      name: process.env.CASHIER_NAME ?? "Kasir Utama",
      username: process.env.CASHIER_USERNAME ?? "kasir",
      passwordHash,
    },
    create: {
      email: process.env.CASHIER_EMAIL ?? "kasir@example.com",
      username: process.env.CASHIER_USERNAME ?? "kasir",
      name: process.env.CASHIER_NAME ?? "Kasir Utama",
      passwordHash,
    },
  });

  const categories = [
    {
      name: "Makanan Utama",
      items: [
        {
          name: "Nasi Goreng Spesial",
          price: 32000,
          stock: 40,
          description: "Nasi goreng dengan telur, ayam, dan acar.",
        },
        {
          name: "Mie Goreng Jawa",
          price: 28000,
          stock: 35,
          description: "Mie goreng manis gurih dengan sayuran segar.",
        },
        {
          name: "Ayam Bakar Sambal Matah",
          price: 38000,
          stock: 30,
          description: "Ayam bakar juicy dengan sambal matah segar.",
        },
      ],
    },
    {
      name: "Minuman",
      items: [
        {
          name: "Es Teh Manis",
          price: 10000,
          stock: 80,
          description: "Teh manis dingin favorit semua meja.",
        },
        {
          name: "Es Jeruk",
          price: 14000,
          stock: 60,
          description: "Jeruk segar dingin dengan rasa asam manis.",
        },
        {
          name: "Kopi Susu Gula Aren",
          price: 22000,
          stock: 45,
          description: "Kopi creamy dengan gula aren.",
        },
      ],
    },
    {
      name: "Camilan",
      items: [
        {
          name: "Kentang Goreng",
          price: 18000,
          stock: 50,
          description: "Kentang goreng renyah dengan saus sambal.",
        },
        {
          name: "Pisang Goreng Cokelat",
          price: 17000,
          stock: 35,
          description: "Pisang goreng hangat dengan topping cokelat.",
        },
      ],
    },
  ];

  for (const [index, category] of categories.entries()) {
    const savedCategory = await prisma.category.upsert({
      where: { slug: slugify(category.name) },
      update: { name: category.name, sortOrder: index + 1 },
      create: {
        name: category.name,
        slug: slugify(category.name),
        sortOrder: index + 1,
      },
    });

    for (const item of category.items) {
      await prisma.menuItem.upsert({
        where: { slug: slugify(item.name) },
        update: {
          name: item.name,
          description: item.description,
          price: item.price,
          stock: item.stock,
          categoryId: savedCategory.id,
          isAvailable: true,
        },
        create: {
          name: item.name,
          slug: slugify(item.name),
          description: item.description,
          price: item.price,
          stock: item.stock,
          categoryId: savedCategory.id,
          isAvailable: true,
        },
      });
    }
  }

  for (const table of ["A1", "A2", "A3", "B1", "B2", "VIP-1"]) {
    await prisma.table.upsert({
      where: { code: table },
      update: { name: `Meja ${table}` },
      create: { code: table, name: `Meja ${table}` },
    });
  }

  const firstTable = await prisma.table.findFirst({ orderBy: { name: "asc" } });
  const firstMenuItems = await prisma.menuItem.findMany({
    take: 2,
    orderBy: { name: "asc" },
  });

  if (firstTable && firstMenuItems.length === 2) {
    const hasSeedOrder = await prisma.order.findUnique({
      where: { orderNumber: "ORD-DEMO-001" },
    });

    if (!hasSeedOrder) {
      const totalAmount = firstMenuItems.reduce((sum, item) => sum + item.price, 0);

      await prisma.order.create({
        data: {
          orderNumber: "ORD-DEMO-001",
          customerName: "Pelanggan Demo",
          tableId: firstTable.id,
          paymentMethod: PaymentMethod.cashier,
          status: OrderStatus.paid,
          totalAmount,
          paidAt: new Date(),
          items: {
            create: firstMenuItems.map((item) => ({
              menuItemId: item.id,
              quantity: 1,
              unitPrice: item.price,
              subtotal: item.price,
            })),
          },
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
