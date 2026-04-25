import { logoutCashier } from "@/app/actions";
import { CashierNav } from "@/components/cashier-nav";
import { requireCashier } from "@/lib/auth";
import { getCashierNavCounts } from "@/lib/data";

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
  const [cashier, navCounts] = await Promise.all([requireCashier(), getCashierNavCounts()]);
  const navItemsWithBadges = navItems.map((item) => ({
    ...item,
    badge:
      item.href === "/kasir/pesanan"
        ? navCounts.needsAttentionCount
        : item.href === "/kasir"
          ? navCounts.activeOrderCount
          : undefined,
  }));

  return (
    <div className="dashboard-shell min-h-screen">
      <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-5">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Kasir restoran</p>
            <h1 className="mt-2 text-xl font-semibold text-stone-950 sm:text-2xl">Dashboard QR Resto Order</h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="w-full rounded-full bg-stone-100 px-4 py-2 text-center text-sm font-medium text-stone-700 sm:w-auto">
              {cashier.name}
            </span>
            <form action={logoutCashier}>
              <button className="w-full rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white sm:w-auto">
                Logout
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 md:px-8 md:pb-5">
          <CashierNav items={navItemsWithBadges} />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
