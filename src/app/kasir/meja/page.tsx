import Image from "next/image";
import QRCode from "qrcode";

import { createTableAction, deleteTableAction } from "@/app/actions";
import { CashierActionButton } from "@/components/cashier-action-button";
import { getTables } from "@/lib/data";
import { getAppBaseUrl } from "@/lib/app-url";
import { cn } from "@/lib/utils";

const tableFilterOptions = [
  { value: "all", label: "Semua meja" },
  { value: "deletable", label: "Bisa dihapus" },
  { value: "history", label: "Punya riwayat" },
  { value: "needs-review", label: "Perlu dicek" },
] as const;

export default async function TableManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { filter, q } = await searchParams;
  const tables = await getTables();
  const baseUrl = await getAppBaseUrl();
  const normalizedQuery = q?.trim().toLowerCase() ?? "";
  const selectedFilter = tableFilterOptions.some((option) => option.value === filter)
    ? (filter as (typeof tableFilterOptions)[number]["value"])
    : "all";
  const qrTables = await Promise.all(
    tables.map(async (table) => ({
      ...table,
      qrUrl: `${baseUrl}/menu/${table.code}`,
      qrDataUrl: await QRCode.toDataURL(`${baseUrl}/menu/${table.code}`, {
        width: 240,
        margin: 2,
      }),
      hasHistory: table._count.orders > 0,
      looksSuspicious:
        !table.name.toLowerCase().includes(table.code.toLowerCase()) &&
        !table.code.toLowerCase().includes(table.name.toLowerCase()),
    })),
  );
  const filteredTables = qrTables.filter((table) => {
    const matchesFilter =
      selectedFilter === "all"
        ? true
        : selectedFilter === "deletable"
          ? !table.hasHistory
          : selectedFilter === "history"
            ? table.hasHistory
            : table.looksSuspicious;

    const matchesQuery =
      !normalizedQuery ||
      table.name.toLowerCase().includes(normalizedQuery) ||
      table.code.toLowerCase().includes(normalizedQuery);

    return matchesFilter && matchesQuery;
  });
  const deletableCount = qrTables.filter((table) => !table.hasHistory).length;
  const historyCount = qrTables.filter((table) => table.hasHistory).length;
  const reviewCount = qrTables.filter((table) => table.looksSuspicious).length;

  return (
    <div className="space-y-8">
      <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[32px] sm:p-6">
        <h2 className="text-xl font-semibold text-stone-950">Tambah meja baru</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
          Kode meja dipakai untuk URL dan QR, misalnya <code>/menu/A4</code>. Nama meja hanya
          dipakai sebagai label tampilan di dashboard dan halaman customer.
        </p>
        <form action={createTableAction} className="mt-5 grid gap-4 lg:grid-cols-3">
          <input
            name="code"
            placeholder="Kode meja, misalnya A4"
            className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-orange-500"
          />
          <input
            name="name"
            placeholder="Nama meja"
            className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-orange-500"
          />
          <button className="w-full rounded-full bg-stone-950 px-5 py-3 font-semibold text-white lg:w-auto">
            Simpan meja
          </button>
        </form>
      </section>

      <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[32px] sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-stone-950">Daftar meja & QR</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
              Filter meja kosong, meja dengan riwayat transaksi, atau data yang perlu dicek
              supaya dashboard tetap mudah dibaca.
            </p>
          </div>
          <form className="grid gap-3 md:grid-cols-[1fr_auto] xl:min-w-[520px]">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Cari nama meja atau kode meja"
              className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500"
            />
            <select
              name="filter"
              defaultValue={selectedFilter}
              className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500"
            >
              {tableFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white md:col-span-2 xl:justify-self-start">
              Terapkan filter
            </button>
          </form>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <span className="rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700">
            {filteredTables.length} meja tampil
          </span>
          <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            {deletableCount} bisa dihapus
          </span>
          <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
            {historyCount} punya riwayat
          </span>
          <span className="rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
            {reviewCount} perlu dicek
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">
        {filteredTables.length ? (
          filteredTables.map((table) => (
          <article key={table.id} className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[32px] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.25em] text-stone-400">Nama meja</p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-950">{table.name}</h2>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-stone-400">Kode meja</p>
                <p className="mt-1 font-mono text-sm text-stone-600">{table.code}</p>
                {table.looksSuspicious ? (
                  <p className="mt-3 inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                    Perlu dicek: nama dan kode terlihat tidak sinkron
                  </p>
                ) : null}
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  table.hasHistory
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800",
                )}
              >
                {table._count.orders} riwayat order
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-[24px] border border-stone-200 bg-stone-50 p-3 sm:rounded-[28px] sm:p-4">
              <Image
                src={table.qrDataUrl}
                alt={`QR ${table.name}`}
                width={208}
                height={208}
                unoptimized
                className="mx-auto h-auto w-full max-w-52"
              />
            </div>

            <p className="mt-4 break-all text-sm text-stone-500">{table.qrUrl}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={table.qrDataUrl}
                download={`qr-${table.code}.png`}
                className="rounded-full bg-orange-500 px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Download QR
              </a>
              <a
                href={table.qrUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-stone-300 px-4 py-2 text-center text-sm font-semibold text-stone-700"
              >
                Buka menu
              </a>
              <form action={deleteTableAction}>
                <input type="hidden" name="id" value={table.id} />
                <CashierActionButton
                  label="Hapus"
                  pendingLabel="Menghapus..."
                  confirmMessage={`Hapus meja "${table.name}" dengan kode "${table.code}"? Tindakan ini hanya bisa dilakukan untuk meja tanpa riwayat order.`}
                  disabled={table._count.orders > 0}
                  className="w-full rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-40 sm:w-auto"
                />
              </form>
            </div>
            {table._count.orders > 0 ? (
              <p className="mt-3 text-sm text-amber-700">
                Meja ini tidak bisa dihapus karena masih terhubung ke {table._count.orders} riwayat
                order.
              </p>
            ) : (
              <p className="mt-3 text-sm text-emerald-700">Meja ini bisa dihapus.</p>
            )}
          </article>
          ))
        ) : (
          <div className="col-span-full rounded-[32px] border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-stone-500">
            Tidak ada meja yang cocok dengan pencarian atau filter saat ini.
          </div>
        )}
      </section>
    </div>
  );
}
