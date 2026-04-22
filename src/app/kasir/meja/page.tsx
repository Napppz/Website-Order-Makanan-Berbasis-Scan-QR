import Image from "next/image";
import QRCode from "qrcode";

import { createTableAction, deleteTableAction } from "@/app/actions";
import { getTables } from "@/lib/data";
import { getAppBaseUrl } from "@/lib/app-url";

export default async function TableManagementPage() {
  const tables = await getTables();
  const baseUrl = await getAppBaseUrl();
  const qrTables = await Promise.all(
    tables.map(async (table) => ({
      ...table,
      qrUrl: `${baseUrl}/menu/${table.code}`,
      qrDataUrl: await QRCode.toDataURL(`${baseUrl}/menu/${table.code}`, {
        width: 240,
        margin: 2,
      }),
    })),
  );

  return (
    <div className="space-y-8">
      <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[32px] sm:p-6">
        <h2 className="text-xl font-semibold text-stone-950">Tambah meja baru</h2>
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">
        {qrTables.map((table) => (
          <article key={table.id} className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[32px] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.25em] text-stone-400">Meja</p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-950">{table.name}</h2>
                <p className="mt-1 font-mono text-sm text-stone-500">{table.code}</p>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                {table._count.orders} order
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
                <button
                  disabled={table._count.orders > 0}
                  className="w-full rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-40 sm:w-auto"
                >
                  Hapus
                </button>
              </form>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
