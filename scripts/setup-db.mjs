import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const rawUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const normalized = rawUrl.startsWith("file:") ? rawUrl.slice(5) : rawUrl;
const dbPath = resolve("prisma", normalized.replace(/^\.\//, ""));

mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS "CashierUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS "CashierUser_email_key" ON "CashierUser"("email");
  CREATE UNIQUE INDEX IF NOT EXISTS "CashierUser_username_key" ON "CashierUser"("username");

  CREATE TABLE IF NOT EXISTS "Table" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS "Table_code_key" ON "Table"("code");

  CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");

  CREATE TABLE IF NOT EXISTS "MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS "MenuItem_slug_key" ON "MenuItem"("slug");

  CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "notes" TEXT,
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tableId" TEXT NOT NULL,
    CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");

  CREATE TABLE IF NOT EXISTS "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "unitPrice" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "PaymentProof" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "reviewedAt" DATETIME,
    "reviewerId" TEXT,
    "orderId" TEXT NOT NULL,
    CONSTRAINT "PaymentProof_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "CashierUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS "PaymentProof_orderId_key" ON "PaymentProof"("orderId");
`);

db.close();

const created = existsSync(dbPath);
console.log(`SQLite ready: ${dbPath} (${created ? "ok" : "missing"})`);
