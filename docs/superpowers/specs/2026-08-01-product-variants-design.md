# Product Variants Design

Date: 2026-08-01
Status: Draft

## Ringkasan

Menambahkan fitur variant berbasis atribut dinamis pada produk Balanja. Satu
produk dapat memiliki satu atau beberapa tipe atribut (mis. `Ukuran`, `Sugar`),
dan setiap kombinasi opsi atribut membentuk satu variant sellable dengan
`price`, `stock`, `barcode`, dan `image` sendiri. Produk sederhana tetap
didukung sebagai produk dengan satu default variant. Semua penjualan, stok, dan
stock movement baru melewati variant.

## Tujuan

- Mendukung produk dengan variant atribut (1..N atribut, kombinasi kartesian)
  untuk use case retail dan resto.
- Menjaga integritas data finansial: unique barcode, stock audit per variant.
- Menjaga backward compatibility: produk eksisting tetap dapat dijual tanpa
  intervensi manual.

## Skema

### Pendekatan

- **Tabel `product_variants` terpisah** (Approach B). `products` menyimpan field
  parent dan definisi atribut; `product_variants` menyimpan field sellable.
- **Definisi atribut JSONB di row produk** (Opsi 1): `products.attributes_config`
  berisi `[{"name":"Ukuran","options":["S","M","L"]}]`. Tanpa tabel master
  atribut.
- **Selalu lewat variant** (Opsi B): produk simple otomatis punya satu default
  variant. Checkout selalu reference `variant_id` untuk produk baru. Produk
  eksisting dimigrasi auto-create 1 default variant.

### Tabel `product_variants`

```sql
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  product_id uuid not null references products(id) on delete cascade,
  attributes jsonb not null default '{}'::jsonb,
  price integer not null check (price >= 1),
  stock integer not null default 0 check (stock >= 0),
  barcode text not null default '',
  image text not null default '',
  image_key text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, barcode) where barcode <> ''
);

create index product_variants_product_idx on product_variants (org_id, product_id);
```

- `attributes` menyimpan map key→value per variant, contoh
  `{"Ukuran":"M","Sugar":"Normal"}`.
- `barcode` boleh kosong (tidak semua variant harus discan). Unique lintas row
  dengan barcode non-empty.
- RLS + policy tenant-scoped mengikuti pola `products`.

### Perubahan `products`

- Tambah `attributes_config jsonb not null default '[]'::jsonb` — definisi
  atribut: `[{"name":"Ukuran","options":["S","M","L"]}]`.
- `price`, `stock`, `barcode` tetap ada sebagai mirror display/fallback untuk
  produk simple (default variant). Write source of truth ke variant; sinkron
  mirror saat save variant untuk default variant.
- Indexed: `create index products_active_org_idx` eksisting tetap.

### Migrasi `000013_variants`

- `up`:
  1. Buat tabel `product_variants`.
  2. Tambah kolom `products.attributes_config`.
  3. Untuk tiap row `products` eksisting, insert 1 default variant:
     copy `price`, `stock`, `barcode`, `image`, `image_key`, `active`;
     `attributes = '{}'`.
  4. Tambah kolom `stock_movements.product_variant_id uuid` (nullable, untuk
     histori lama tetap null).
  5. Aktifkan RLS + policy tenant pada `product_variants`.
- `down`:
  1. Drop kolom `stock_movements.product_variant_id`.
  2. Drop kolom `products.attributes_config`.
  3. Drop tabel `product_variants`.

### Histori transaksi

- Transaksi eksisting tetap snapshot JSONB dengan `productId` saja. Tidak
  backfill `variantId` — snapshot immutable.
- Transaksi baru menyimpan `variantId` + `attributes` di snapshot item.

## API & Backend

### Endpoint variant CRUD

| Method | Path | Fungsi |
|--------|------|--------|
| `POST` | `/api/v1/products/:id/variants` | Buat variant |
| `PATCH` | `/api/v1/products/:id/variants/:variantId` | Update variant |
| `DELETE` | `/api/v1/products/:id/variants/:variantId` | Hapus variant |

- Produk create/update tetap `POST`/`PATCH /api/v1/products`, payload menerima
  `attributesConfig` + opsional `variants[]` inline untuk bulk-create saat setup
  produk baru.

### `product` package

- `Product` struct: tambah `AttributesConfig []AttributeConfig` + `Variants
  []Variant` (untuk read).
- `AttributeConfig`: `Name string`, `Options []string`.
- `Variant` struct baru:
  `ID, ProductID, Attributes, Price, Stock, Barcode, Image, ImageKey, Active,
  CreatedAt, UpdatedAt`.
- Repository: variant CRUD query, eager-load variants saat `Get`/`List`.
- Service:
  - Validasi unique barcode lintas `product_variants` aktif dan `products`
    (untuk simple).
  - Validasi `attributes` konsisten dengan `attributes_config` (key dan value
    sesuai).
  - Validasi minimal 1 active variant per produk.
  - Sync mirror `products.price`/`stock`/`barcode` dari default variant untuk
    produk simple.

### `checkout` package

- `ItemInput`: tambah `VariantID *uuid.UUID`.
- Repository checkout:
  - Jika produk punya variants (variant-product), wajib `VariantID`; lookup
    `price`/`stock`/`barcode`/`image` dari `product_variants` row.
  - Stock decrement & stock movement reference `variant_id` (kolom baru
    `stock_movements.product_variant_id`).
  - Untuk produk simple (default variant), `VariantID` tetap diharapkan (frontend
    selalu kirim); fallback ke default variant jika `VariantID` null untuk
    backwards-compat singkat.
  - Atomicity tetap dalam satu transaction: lock variants `for update`,
    decrement, movement, idempotency.

### `stock` package

- `CreateInput`: tambah `VariantID *uuid.UUID`.
- `Movement`: tambah `VariantID`, `VariantAttributes` (snapshot string untuk
  display, contoh `"Ukuran: M, Sugar: Normal"`).
- Repository: movement bisa filter per product (semua variant) atau per variant.

### Validasi unique barcode

- Unique constraint `product_variants(org_id, barcode) where barcode <> ''`.
- `products.barcode` unique tetap untuk produk simple (default variant kosong
  barcode). Validasi tambahan di service: barcode variant tidak boleh tabrakan
  dengan barcode produk simple lain atau variant lain.

## Frontend

### POS — katalog & cart

- **Katalog (`ProductCatalog` / `ProductCard`)**: produk variant-product
  ditampilkan sebagai satu kartu (foto & nama parent; label "N variasi" jika
  >1 variant).
- **Tap kartu**:
  - 1 variant (`attributes={}`) → langsung masuk cart.
  - >1 variant → buka **Variant Selector** untuk pilih kombinasi atribut;
    setelah dipilih, variant masuk cart.
- **Scan barcode**: cari match di `product_variants.barcode` + `products.barcode`
  (produk simple). Match → langsung masuk cart tanpa selector.
- **Variant Selector**: satu control per atribut (pill/segmented/select). Untuk
  1 atribut sederhana, inline; 2+ atribut, pakai dialog. Tunjukkan harga & stok
  variant yang dipilih real-time. Variant `active=false` atau `stock<=0` →
  disabled + label "Habis".
- **Cart row (`CartRow`)**: tampilkan atribut variant sebagai sub-label
  ("Minuman — S, Normal"). `cart-storage` & checkout payload: tambah
  `variantId` + `attributes` per item. Item duplikat (ditumpuk qty) hanya jika
  `productId` SAMA dan `variantId` SAMA. Variant berbeda = baris terpisah.

### Produk form (`ProductsPage` editor)

- Tambah section "Varian" di bawah field produk yang ada.
- **Editor atribut**:
  - Daftar atribut dinamis. Tiap atribut: nama + daftar opsi (chip input).
  - Hapus atribut jika >1 variant aktif memakai atribut itu → tolak dengan
    pesan.
- **Daftar variant**: auto-generated dari kombinasi opsi (kartesian). Tiap
  baris: kombinasi atribut (read-only) + input price/stock/barcode/image/active.
  - Tambah/hapus baris variant = ubah opsi atribut. Manual add baris variant
    terisolasi tidak didukung.
- **Toggle "Produk sederhana"** (default untuk produk baru): form modelo
  sekarang (input price/stock/barcode tunggal). Produk tetap punya 1 default
  variant di backend yang transparent.
  - User tambah atribut pertama → mode beralih ke "produk varian"; default
    variant otomatis jadi variant pertama dengan `attributes` diisi.
- Saat save produk baru: kirim `attributesConfig` + `variants[]` inline satu
  request.

## Error Handling

### Backend

- Sentinel errors baru: `ErrVariantNotFound`, `ErrVariantInactive`,
  `ErrVariantBarcodeConflict`, `ErrMissingVariantId`. Map ke HTTP 404/409
  mengikuti pola eksisting.
- Checkout atomicity tetap dalam satu transaction (lock, decrement, movement,
  idempotency — semua atau tidak sama sekali).
- Hapus variant: tolak hard-delete jika variant pernah masuk transaksi (cek
  `stock_movements.product_variant_id`); fallback ke soft `active=false`.

### Frontend

- Barcode scan match multiple → error toast (defensive; unique constraint
  seharusnya mencegah).
- Variant selector: variant nonaktif/habis → disabled.
- Save produk: validasi minimal 1 active variant; pesan "Produk harus punya
  minimal satu varian aktif".

## Edge Cases

- **Produk eksisting tidak diedit**: tetap jalan via default variant; UI produk
  lama tidak menunjukkan section variant (toggle "Produk sederhana" on by
  default untuk produk dengan `attributes_config=[]`).
- **Hapus opsi atribut yang dipakai variant aktif**: tolak, minta nonaktifkan
  variant dulu.
- **Stok produk simple**: sinkron `products.stock`/`price` sebagai mirror
  default variant untuk backwards-compat query lama (read display). Write
  selalu ke variant.
- **Transaksi void**: snapshot JSONB histori tidak disentuh; restock kembali ke
  `variant_id` yang sama kalau variant masih ada, fallback ke default variant
  jika sudah dihapus.
- **Scan barcode produk simple**: `products.barcode` tetap ada dan unique
  (produk simple pakai parent barcode); variant default barcode kosong.

## Testing

### Backend

- `product` package: variant CRUD, unique barcode lintas variant/parent,
  validasi `attributes` vs `attributes_config`, validasi minimal 1 active
  variant.
- `checkout` package: aliran dengan `VariantID`, stock decrement di variant,
  movement reference variant, idempotency.
- `stock` package: movement per variant, filter per product vs per variant.
- Migrasi `000013`: auto-create default variant untuk produk eksisting;
  reversibel down.

### Frontend

- `domain.test.js`: `addProductToCart` dengan `variantId`, cart key
  `productId+variantId`, variant selector logic.
- `product-save.test.js`: payload `attributesConfig` + `variants[]`.
- `store.test.js`: load produk dengan variants.
- `pos-components.test.js`: kartu katalog menunjukkan label variasi, selector
  terbuka untuk >1 variant, cart row menampilkan atribut variant.

## Out of Scope

- Master data atribut reusable lintas produk (Opsi 2).
- Backfill `variantId` di transaksi historis.
- Bundling produk (produk paket dari beberapa produk).