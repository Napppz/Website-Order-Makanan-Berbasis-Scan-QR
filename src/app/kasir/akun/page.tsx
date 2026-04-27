import { updateCashierPasswordAction } from "@/app/actions";
import { requireCashier } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export default async function CashierAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; message?: string }>;
}) {
  const [cashier, params] = await Promise.all([requireCashier(), searchParams]);
  const errorMessage =
    params.notice === "error" ? params.message ?? "Password gagal diperbarui." : null;
  const successMessage =
    params.notice === "password-updated" ? "Password kasir berhasil diperbarui." : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[32px] sm:p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Akun kasir</p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-950">{cashier.name}</h1>
        <p className="mt-2 text-sm leading-7 text-stone-600">
          Kelola akses kasir yang sedang dipakai untuk dashboard operasional restoran.
        </p>

        <div className="mt-6 space-y-3">
          <div className="rounded-2xl bg-stone-50 p-4">
            <p className="text-sm text-stone-500">Email</p>
            <p className="mt-1 font-semibold text-stone-950">{cashier.email}</p>
          </div>
          <div className="rounded-2xl bg-stone-50 p-4">
            <p className="text-sm text-stone-500">Username</p>
            <p className="mt-1 font-semibold text-stone-950">{cashier.username}</p>
          </div>
          <div className="rounded-2xl bg-stone-50 p-4">
            <p className="text-sm text-stone-500">Terakhir diperbarui</p>
            <p className="mt-1 font-semibold text-stone-950">{formatDate(cashier.updatedAt)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:rounded-[32px] sm:p-6">
        <h2 className="text-xl font-semibold text-stone-950">Ganti password</h2>
        <p className="mt-2 text-sm leading-7 text-stone-600">
          Gunakan password minimal 8 karakter agar akun kasir lebih aman.
        </p>

        {successMessage ? (
          <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {successMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <form action={updateCashierPasswordAction} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Password lama</label>
            <input
              type="password"
              name="currentPassword"
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-orange-500"
              placeholder="Masukkan password lama"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Password baru</label>
            <input
              type="password"
              name="newPassword"
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-orange-500"
              placeholder="Minimal 8 karakter"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Konfirmasi password baru</label>
            <input
              type="password"
              name="confirmPassword"
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-orange-500"
              placeholder="Ulangi password baru"
            />
          </div>
          <button className="rounded-full bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600">
            Simpan password baru
          </button>
        </form>
      </section>
    </div>
  );
}
