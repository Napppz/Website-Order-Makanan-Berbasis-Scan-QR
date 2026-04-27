# QR Resto Order

Website order makanan dan minuman berbasis scan QR per meja dengan dashboard kasir, dirapikan agar cocok untuk deploy di Vercel.

## Fitur utama

- Customer scan QR meja lalu masuk ke halaman menu `/menu/[tableCode]`
- Customer bisa pilih makanan/minuman, isi catatan, lalu checkout
- Opsi pembayaran:
  - bayar di kasir
  - bayar online lewat Midtrans Sandbox
- Halaman status pesanan setelah checkout
- Dashboard kasir untuk:
  - login kasir
  - kelola kategori dan menu
  - kelola meja dan download QR code
  - buat pesanan manual
  - lihat semua pesanan
  - filter pesanan yang sudah dibayar
  - pantau pembayaran customer

## Stack

- Next.js 16 App Router
- Tailwind CSS 4
- Prisma Client
- SQLite untuk development default
- Session auth sederhana untuk kasir

## Menjalankan project

1. Install dependency:

```bash
npm install
```

2. Siapkan environment:

```bash
copy .env.example .env
```

3. Siapkan database dan seed data:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

4. Jalankan project:

```bash
npm run dev
```

5. Buka:

```text
http://localhost:3000
```

## Environment variable

Tambahkan environment variable ini:

- `DATABASE_URL`
- `SESSION_SECRET`
- `CASHIER_NAME`
- `CASHIER_EMAIL`
- `CASHIER_USERNAME`
- `CASHIER_PASSWORD`
- `NEXT_PUBLIC_APP_URL`
- `MIDTRANS_MERCHANT_ID`
- `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`
- `MIDTRANS_SERVER_KEY`
- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET_NAME`
- `CLOUDFLARE_R2_PUBLIC_URL`

Catatan:

- Project ini tidak lagi memakai dependency khusus Windows.
- Foto menu sekarang diunggah ke Cloudflare R2.
- Pembayaran customer online memakai Midtrans Sandbox melalui link checkout.
- `CLOUDFLARE_R2_PUBLIC_URL` bisa diisi custom domain bucket Anda, misalnya `https://cdn.domainanda.com`, atau URL publik `r2.dev` untuk development.
- Jika homepage atau halaman menu menampilkan pesan setup database, cek `DATABASE_URL`, lalu jalankan `npm run db:push` dan `npm run db:seed`.

## Setup Cloudflare R2

1. Buat bucket baru di Cloudflare R2.
2. Buat API token R2 dengan izin object read/write untuk bucket tersebut.
3. Ambil `Account ID` dari dashboard Cloudflare.
4. Hubungkan bucket ke custom domain publik atau aktifkan `r2.dev` untuk development.
5. Isi environment variable R2 di `.env` lokal dan di Vercel Project Settings.

Nilai yang perlu diisi:

- `CLOUDFLARE_R2_ACCOUNT_ID`: account ID Cloudflare Anda
- `CLOUDFLARE_R2_ACCESS_KEY_ID`: access key R2
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`: secret key R2
- `CLOUDFLARE_R2_BUCKET_NAME`: nama bucket
- `CLOUDFLARE_R2_PUBLIC_URL`: base URL publik bucket tanpa slash di akhir

## Login kasir default

- Email: `kasir@example.com`
- Username: `kasir`
- Password: `kasir123`

Nilai ini bisa diubah dari file `.env` sebelum menjalankan `npm run db:seed`.

## Script penting

- `npm run dev` menjalankan Next.js dev server dengan Webpack
- `npm run build` build production
- `npm run lint` cek lint
- `npm run db:generate` generate Prisma client
- `npm run db:push` sinkronkan schema Prisma ke database aktif
- `npm run db:seed` isi data awal kasir, meja, kategori, menu, dan order demo
