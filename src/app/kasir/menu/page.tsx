import {
  createCategoryAction,
  createMenuItemAction,
  deleteMenuItemAction,
  toggleMenuAvailabilityAction,
  updateMenuItemAction,
  updateMenuStockAction,
} from "@/app/actions";
import { getCategoriesWithItems } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export default async function MenuManagementPage() {
  const categories = await getCategoriesWithItems();

  return (
    <div className="space-y-8">
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
              className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-orange-500"
            />
            <select
              name="categoryId"
              className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-orange-500"
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
              className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-orange-500"
            />
            <input
              name="stock"
              type="number"
              min="0"
              placeholder="Stok awal"
              className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-orange-500"
            />
            <label className="rounded-2xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-600">
              <span className="mb-2 block font-medium text-stone-800">Upload foto menu</span>
              <input
                name="imageFile"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="block w-full text-sm text-stone-500"
              />
              <span className="mt-2 block text-xs text-stone-500">
                Opsional. Format JPG, PNG, atau WEBP dengan ukuran maksimal 4MB.
              </span>
            </label>
            <textarea
              name="description"
              placeholder="Deskripsi menu"
              className="min-h-24 rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-orange-500 md:col-span-2"
            />
            <label className="flex items-center gap-3 rounded-2xl border border-stone-300 px-4 py-3">
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

      <section className="space-y-6">
        {categories.map((category) => (
          <div key={category.id} className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-stone-950">{category.name}</h2>
                <p className="text-sm text-stone-500">{category.menuItems.length} menu dalam kategori ini.</p>
              </div>
            </div>
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
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.isAvailable && item.stock > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : item.stock <= 0
                            ? "bg-rose-100 text-rose-800"
                            : "bg-stone-200 text-stone-700"
                      }`}
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
                      <button className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white">
                        {item.isAvailable ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </form>
                    <form action={deleteMenuItemAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <button className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
                        Hapus
                      </button>
                    </form>
                  </div>
                  <details className="mt-4 border-t border-stone-200 pt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-stone-800">
                      Edit detail menu
                    </summary>
                    <form action={updateMenuItemAction} className="mt-4 grid gap-3 md:grid-cols-2">
                      <input type="hidden" name="id" value={item.id} />
                      <input
                        name="name"
                        defaultValue={item.name}
                        className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-orange-500"
                        placeholder="Nama menu"
                      />
                      <select
                        name="categoryId"
                        defaultValue={item.categoryId}
                        className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-orange-500"
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
                        className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-orange-500"
                        placeholder="Harga"
                      />
                      <input
                        name="stock"
                        type="number"
                        min="0"
                        defaultValue={item.stock}
                        className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-orange-500"
                        placeholder="Stok"
                      />
                      <textarea
                        name="description"
                        defaultValue={item.description ?? ""}
                        className="min-h-24 rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-orange-500 md:col-span-2"
                        placeholder="Deskripsi menu"
                      />
                      <label className="flex items-center gap-3 rounded-2xl border border-stone-300 px-4 py-3">
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
          </div>
        ))}
      </section>
    </div>
  );
}
