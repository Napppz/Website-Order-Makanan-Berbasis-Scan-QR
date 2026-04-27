# QR Resto Order

Website order makanan dan minuman berbasis scan QR per meja dengan dashboard kasir, dirapikan agar cocok untuk deploy di Vercel.

## Fitur utama

- Customer scan QR meja lalu masuk ke halaman menu `/menu/[tableCode]`
- Customer bisa pilih makanan/minuman, isi catatan, lalu checkout
- Opsi pembayaran:
  - bayar di kasir
  - upload bukti bayar QRIS
- Halaman status pesanan setelah checkout
- Dashboard kasir untuk:
  - login kasir
  - kelola kategori dan menu
  - kelola meja dan download QR code
  - buat pesanan manual
  - lihat semua pesanan
  - filter pesanan yang sudah dibayar
  - approve/reject bukti bayar QRIS

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

Catatan:

- Project ini tidak lagi memakai dependency khusus Windows.
- Bukti bayar QRIS disimpan langsung sebagai data URL di database agar tidak bergantung pada filesystem server.
- Default repo ini memakai SQLite lokal melalui `file:./dev.db`.
- Jika homepage atau halaman menu menampilkan pesan setup database, cek `DATABASE_URL`, lalu jalankan `npm run db:push` dan `npm run db:seed`.

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
