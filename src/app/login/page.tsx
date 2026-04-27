import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSession();
  const showDemoCredentials = process.env.NODE_ENV !== "production";

  if (session) {
    redirect("/kasir");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-stone-200 lg:grid-cols-[1.05fr_0.95fr] lg:rounded-[36px]">
        <section className="bg-stone-950 px-5 py-8 text-white sm:px-8 md:px-10 lg:px-12 lg:py-10">
          <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-orange-200">
            Dashboard kasir
          </p>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
            Kontrol pesanan QR restoran dari satu panel kasir.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-7 text-stone-300 sm:text-base sm:leading-8">
            Kasir dapat melihat pesanan, memantau pembayaran customer, menandai order dibayar,
            mengelola meja, menu, dan membuat order manual untuk pelanggan walk-in.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {showDemoCredentials ? (
              <>
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-sm text-stone-300">Login default seed</p>
                  <p className="mt-2 font-mono text-sm">kasir@example.com / kasir123</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-sm text-stone-300">Atau username</p>
                  <p className="mt-2 font-mono text-sm">kasir / kasir123</p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-sm text-stone-300">Akses kasir</p>
                  <p className="mt-2 text-sm text-stone-100">Gunakan akun resmi restoran.</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-sm text-stone-300">Keamanan</p>
                  <p className="mt-2 text-sm text-stone-100">Credential demo disembunyikan di production.</p>
                </div>
              </>
            )}
          </div>
        </section>
        <section className="px-5 py-8 sm:px-8 md:px-10 lg:px-12 lg:py-10">
          <p className="text-sm uppercase tracking-[0.3em] text-stone-400">Masuk sebagai kasir</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-950 sm:text-3xl">Selamat datang kembali</h2>
          <p className="mt-2 text-stone-500">
            Gunakan akun kasir untuk membuka dashboard dan mengelola seluruh pesanan.
          </p>
          <div className="mt-8">
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
