import {
  createCategoryAction,
  createMenuItemAction,
  deleteCategoryAction,
  deleteMenuItemAction,
  toggleMenuAvailabilityAction,
  updateMenuItemAction,
  updateMenuStockAction,
} from "@/app/actions";
import { CashierActionButton } from "@/components/cashier-action-button";
import { MenuImagePicker } from "@/components/menu-image-picker";
import { getCategoriesWithItems } from "@/lib/data";
import { cn, formatCurrency } from "@/lib/utils";

const menuFilterOptions = [
  { value: "all", label: "Semua menu" },
  { value: "ready", label: "Siap dipesan" },
  { value: "archived", label: "Arsip / nonaktif" },
  { value: "out-of-stock", label: "Stok habis" },
] as const;

export default async function MenuManagementPage({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string;
    status?: string;
    q?: string;
    category?: string;
  }>;
}) {
  const { notice, status, q, category } = await searchParams;
  const categories = await getCategoriesWithItems();
  const noticeConfig = (() => {
    switch (notice) {
      case "menu-created":
        return {
          className:
            "border-emerald-300 bg-emerald-50 text-emerald-900 ring-emerald-200",
          message: "Menu baru berhasil ditambahkan dan sekarang muncul di dashboard kasir.",
        };
      case "menu-deleted":
        return {
          className: "border-sky-300 bg-sky-50 text-sky-900 ring-sky-200",
          message: "Menu berhasil dihapus dari dashboard kasir.",
        };
      case "category-deleted":
        return {
          className: "border-sky-300 bg-sky-50 text-sky-900 ring-sky-200",
          message: "Kategori berhasil dihapus dari dashboard kasir.",
        };
      case "category-not-empty":
        return {
          className: "border-amber-300 bg-amber-50 text-amber-900 ring-amber-200",
          message:
            "Kategori tidak bisa dihapus karena masih memiliki menu. Pindahkan atau hapus semua menu di kategori itu terlebih dahulu.",
        };
      case "menu-archived":
        return {
          className: "border-amber-300 bg-amber-50 text-amber-900 ring-amber-200",
          message:
            "Menu yang sudah pernah dipakai dalam pesanan tidak bisa dihapus permanen karena masih dibutuhkan untuk riwayat transaksi. Sistem menonaktifkan menu tersebut dan mengosongkan stoknya sebagai gantinya.",
        };
      default:
        return null;
    }
  })();
  const totalMenu = categories.reduce((sum, category) => sum + category.menuItems.length, 0);
  const menuWithPhoto = categories.reduce(
    (sum, category) => sum + category.menuItems.filter((item) => Boolean(item.imageUrl)).length,
    0,
  );
  const availableMenu = categories.reduce(
    (sum, category) =>
      sum + category.menuItems.filter((item) => item.isAvailable && item.stock > 0).length,
    0,
  );
  const archivedMenu = categories.reduce(
    (sum, category) => sum + category.menuItems.filter((item) => !item.isAvailable).length,
    0,
  );
  const normalizedQuery = q?.trim().toLowerCase() ?? "";
  const selectedStatus = menuFilterOptions.some((option) => option.value === status)
    ? (status as (typeof menuFilterOptions)[number]["value"])
    : "all";
  const selectedCategory =
    category && categories.some((item) => item.id === category) ? category : "all";
  const filteredCategories = categories
    .filter((item) => selectedCategory === "all" || item.id === selectedCategory)
    .map((category) => ({
      ...category,
      menuItems: category.menuItems.filter((item) => {
        const matchesStatus =
          selectedStatus === "all"
            ? true
            : selectedStatus === "ready"
              ? item.isAvailable && item.stock > 0
              : selectedStatus === "archived"
                ? !item.isAvailable
                : item.stock <= 0;

        const matchesQuery =
          !normalizedQuery ||
          item.name.toLowerCase().includes(normalizedQuery) ||
          (item.description ?? "").toLowerCase().includes(normalizedQuery) ||
          category.name.toLowerCase().includes(normalizedQuery);

        return matchesStatus && matchesQuery;
      }),
    }))
    .filter(
      (category) =>
        category.menuItems.length > 0 ||
        (selectedCategory !== "all" && category.id === selectedCategory),
    );
  const visibleMenuCount = filteredCategories.reduce(
    (sum, category) => sum + category.menuItems.length,
    0,
  );

  return (
    <div className="space-y-8">
      {noticeConfig ? (
        <section
          className={`rounded-[24px] border p-4 text-sm shadow-sm ring-1 sm:rounded-[28px] sm:p-5 ${noticeConfig.className}`}
        >
          {noticeConfig.message}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:rounded-[28px]">
          <p className="text-sm text-stone-500">Total menu</p>
          <p className="mt-2 text-3xl font-bold text-stone-950">{totalMenu}</p>
        </div>
        <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:rounded-[28px]">
          <p className="text-sm text-stone-500">Menu dengan foto</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">{menuWithPhoto}</p>
        </div>
        <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:rounded-[28px]">
          <p className="text-sm text-stone-500">Siap dipesan</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{availableMenu}</p>
        </div>
        <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:rounded-[28px] sm:col-span-3 xl:col-span-1">
          <p className="text-sm text-stone-500">Menu arsip / nonaktif</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{archivedMenu}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-xl font-semibold text-stone-950">Tambah kategori</h2>
          <form action={createCategoryAction} className="mt-5 space-y-4">
            <input
              name="name"
              placeholder="Contoh: Paket Hemat"
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-orange-500"
            />
            <input
              name="sortOrder"
              type="number"
              placeholder="Urutan tampil"
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-orange-500"
            />
            <button className="rounded-full bg-stone-950 px-5 py-3 font-semibold text-white">
              Simpan kategori
            </button>
          </form>
        </div>

        <div className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-xl font-semibold text-stone-950">Tambah menu baru</h2>
          <form
            action={createMenuItemAction}
            encType="multipart/form-data"
            className="mt-5 grid gap-4 md:grid-cols-2"
          >
            <input
              name="name"
              placeholder="Nama menu"
              className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-orange-500"
            />
            <select
              name="categoryId"
              className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-orange-500"
            >
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              name="price"
              type="number"
              placeholder="Harga"
              className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-orange-500"
            />
            <input
              name="stock"
              type="number"
              min="0"
              placeholder="Stok awal"
              className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-orange-500"
            />
            <div className="md:col-span-2">
              <MenuImagePicker
                inputName="imageFile"
                label="Upload foto menu"
                helperText="Opsional. Format JPG, PNG, atau WEBP dengan ukuran maksimal 4MB."
              />
            </div>
            <textarea
              name="description"
              placeholder="Deskripsi menu"
              className="min-h-24 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-orange-500 md:col-span-2"
            />
            <label className="flex items-center gap-3 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 md:col-span-2">
              <input name="isAvailable" type="checkbox" defaultChecked />
              <span className="text-sm font-medium text-stone-700">Langsung tersedia untuk dipesan</span>
            </label>
            <div className="md:col-span-2">
              <button className="rounded-full bg-orange-500 px-5 py-3 font-semibold text-white">
                Simpan menu
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-stone-200">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-stone-950">Daftar menu kasir</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
              Pisahkan menu aktif, stok habis, dan arsip supaya dashboard tetap rapi saat data
              makin banyak.
            </p>
          </div>
          <form className="grid gap-3 md:grid-cols-[1fr_auto_auto] xl:min-w-[720px]">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Cari nama menu, deskripsi, atau kategori"
              className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500"
            />
            <select
              name="status"
              defaultValue={selectedStatus}
              className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500"
            >
              {menuFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              name="category"
              defaultValue={selectedCategory}
              className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500"
            >
              <option value="all">Semua kategori</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white md:col-span-3 xl:justify-self-start">
              Terapkan filter
            </button>
          </form>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <span className="rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700">
            {visibleMenuCount} menu tampil
          </span>
          <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            {availableMenu} siap dipesan
          </span>
          <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
            {archivedMenu} arsip
          </span>
        </div>
      </section>

      <section className="space-y-6">
        {filteredCategories.length ? (
          filteredCategories.map((category) => (
          <div key={category.id} className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-stone-950">{category.name}</h2>
                <p className="text-sm text-stone-500">
                  {category.menuItems.length} menu cocok dengan filter saat ini.
                </p>
              </div>
              <form action={deleteCategoryAction}>
                <input type="hidden" name="id" value={category.id} />
                <CashierActionButton
                  label="Hapus kategori"
                  pendingLabel="Menghapus..."
                  confirmMessage={`Hapus kategori "${category.name}"? Kategori kosong akan dihapus permanen.`}
                  disabled={category.menuItems.length > 0}
                  className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-40"
                />
              </form>
            </div>
            {category.menuItems.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {category.menuItems.map((item) => (
                <article key={item.id} className="rounded-3xl border border-stone-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className="h-24 w-24 shrink-0 rounded-3xl bg-gradient-to-br from-orange-200 via-orange-100 to-stone-100 bg-cover bg-center"
                        style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined}
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-stone-950">{item.name}</h3>
                        <p className="mt-1 text-sm text-stone-500">
                          {item.description ?? "Tanpa deskripsi."}
                        </p>
                        <p className="mt-3 font-semibold text-orange-600">
                          {formatCurrency(item.price)}
                        </p>
                        {item.imageUrl ? (
                          <p className="mt-2 text-xs text-stone-400">Foto tampil di halaman customer.</p>
                        ) : (
                          <p className="mt-2 text-xs text-stone-400">Belum ada foto menu.</p>
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        item.isAvailable && item.stock > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : item.stock <= 0
                            ? "bg-rose-100 text-rose-800"
                            : "bg-stone-200 text-stone-700",
                      )}
                    >
                      {item.isAvailable && item.stock > 0
                        ? "Tersedia"
                        : item.stock <= 0
                          ? "Stok habis"
                          : "Nonaktif"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 border-t border-stone-200 pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <form action={updateMenuStockAction} className="flex gap-2">
                      <input type="hidden" name="id" value={item.id} />
                      <label className="min-w-0 flex-1">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                          Stok
                        </span>
                        <input
                          name="stock"
                          type="number"
                          min="0"
                          defaultValue={item.stock}
                          className="w-full rounded-2xl border border-stone-300 px-4 py-2 text-sm outline-none focus:border-orange-500"
                        />
                      </label>
                      <button className="self-end rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white">
                        Update stok
                      </button>
                    </form>
                    <p className="text-sm font-semibold text-stone-600 sm:text-right">
                      Sisa {item.stock} porsi
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <form action={toggleMenuAvailabilityAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="current" value={String(item.isAvailable)} />
                      <CashierActionButton
                        label={item.isAvailable ? "Nonaktifkan" : "Aktifkan"}
                        pendingLabel={item.isAvailable ? "Menonaktifkan..." : "Mengaktifkan..."}
                        confirmMessage={
                          item.isAvailable
                            ? `Nonaktifkan menu "${item.name}" dari halaman customer?`
                            : undefined
                        }
                        className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      />
                    </form>
                    <form action={deleteMenuItemAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <CashierActionButton
                        label="Hapus / Arsipkan"
                        pendingLabel="Memproses..."
                        confirmMessage={`Hapus atau arsipkan menu "${item.name}"? Jika menu ini sudah pernah dipakai di pesanan, sistem akan mengarsipkannya.`}
                        className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60"
                      />
                    </form>
                  </div>
                  <details className="mt-4 border-t border-stone-200 pt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-stone-800">
                      Edit detail menu
                    </summary>
                    <form
                      action={updateMenuItemAction}
                      encType="multipart/form-data"
                      className="mt-4 grid gap-3 md:grid-cols-2"
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <input
                        name="name"
                        defaultValue={item.name}
                        className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500"
                        placeholder="Nama menu"
                      />
                      <select
                        name="categoryId"
                        defaultValue={item.categoryId}
                        className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500"
                      >
                        {categories.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                      <input
                        name="price"
                        type="number"
                        min="1"
                        defaultValue={item.price}
                        className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500"
                        placeholder="Harga"
                      />
                      <input
                        name="stock"
                        type="number"
                        min="0"
                        defaultValue={item.stock}
                        className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500"
                        placeholder="Stok"
                      />
                      <div className="md:col-span-2">
                        <MenuImagePicker
                          inputName="imageFile"
                          label="Ganti foto menu"
                          helperText="Kosongkan jika ingin memakai foto yang sekarang. File baru akan menggantikan foto lama di Cloudflare R2."
                          currentImageUrl={item.imageUrl}
                        />
                      </div>
                      <textarea
                        name="description"
                        defaultValue={item.description ?? ""}
                        className="min-h-24 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-orange-500 md:col-span-2"
                        placeholder="Deskripsi menu"
                      />
                      <label className="flex items-center gap-3 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 md:col-span-2">
                        <input
                          name="isAvailable"
                          type="checkbox"
                          defaultChecked={item.isAvailable}
                        />
                        <span className="text-sm font-medium text-stone-700">
                          Tersedia untuk dipesan
                        </span>
                      </label>
                      <div className="md:col-span-2">
                        <button className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white">
                          Simpan perubahan
                        </button>
                      </div>
                    </form>
                  </details>
                </article>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-500">
                Belum ada menu yang cocok dengan filter di kategori ini.
              </div>
            )}
          </div>
          ))
        ) : (
          <div className="rounded-[32px] border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-stone-500">
            Tidak ada menu yang cocok dengan pencarian atau filter saat ini.
          </div>
        )}
      </section>
    </div>
  );
}
