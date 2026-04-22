import Link from "next/link";

import { logoutCashier } from "@/app/actions";
import { requireCashier } from "@/lib/auth";

const navItems = [
  { href: "/kasir", label: "Dashboard" },
  { href: "/kasir/menu", label: "Menu" },
  { href: "/kasir/meja", label: "Meja & QR" },
  { href: "/kasir/pesanan", label: "Pesanan" },
  { href: "/kasir/buat-pesanan", label: "Buat Pesanan" },
];

export default async function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cashier = await requireCashier();

  return (
    <div className="dashboard-shell min-h-screen">
      <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Kasir restoran</p>
            <h1 className="mt-2 text-2xl font-semibold text-stone-950">Dashboard QR Resto Order</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700">
              {cashier.name}
            </span>
            <form action={logoutCashier}>
              <button className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white">
                Logout
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl flex-wrap gap-3 px-6 pb-5 md:px-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-orange-300 hover:text-orange-600"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8 md:px-8">{children}</main>
    </div>
  );
}
