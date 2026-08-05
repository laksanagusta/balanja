import React from "react";
import { CashPaymentFeedback } from "../pos/CashPaymentFeedback.jsx";
import { PosProductCard } from "../pos/ProductCard.jsx";
import { MobileCheckoutPanel } from "../pos/MobileCheckoutPanel.jsx";
import { ScanResultConfirmation } from "../scan/ScanResultConfirmation.jsx";
import { ProductCategoryPills } from "../product/ProductCategoryPills.jsx";
import { Button, Icon, Panel } from "../primitives.jsx";

const methods = [
  { id: "cash", label: "Tunai", icon: "cash" },
  { id: "qris", label: "QRIS", icon: "qr" },
];

const sampleProduct = {
  id: "design-pos-product",
  name: "Beras Premium 5 kg",
  category: "Sembako",
  price: "72.000",
  stock: 18,
  unit: "pack",
};

export default function POSPatterns() {
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [cashFeedbackPreview, setCashFeedbackPreview] = React.useState("shortfall");
  const [mobileCheckoutExpanded, setMobileCheckoutExpanded] = React.useState(false);
  const [filterQuery, setFilterQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("sembako");

  return (
    <Panel className="grid gap-6 p-6">
      <div>
        <h3 className="text-xl font-semibold text-text">Pola komposit kasir</h3>
        <p className="mt-1 text-sm text-text-muted">
          Kartu produk, kontrol katalog, pemindai barcode, dan ringkasan pembayaran dibangun dari primitive produksi yang sama. Pencarian dan category pills selalu terlihat langsung di atas katalog; halaman Kasir tidak memakai drawer filter atau header judul sendiri. Top bar aplikasi hanya menempatkan Pindai barcode sebagai aksi icon-only tanpa border atau button surface di sebelah avatar, lengkap dengan accessible name dan target sentuh 44px. Ikon scan memakai ukuran 24px agar memiliki bobot visual yang cukup. Scanner memprioritaskan kamera belakang 720p, menjelaskan kegagalan izin atau perangkat secara spesifik, dan tetap menyediakan input manual. Aksi teks Selesai di header menyediakan jalan keluar eksplisit dengan target sentuh 44px. Kamera tampil bersih tanpa kotak bidik permanen; saat barcode diproses, scanner menampilkan status ringkas selama minimal 180ms. Barcode yang sama memakai cooldown pasti 1 detik sebelum dapat menambah kuantitas lagi. Hasil tampil di bawah sebagai material hitam blur tanpa toast global: indikator hijau muda untuk berhasil dan kuning untuk tidak ditemukan atau gagal. Keberhasilan scan kasir menyertakan nama produk, harga, jumlah terbaru di keranjang, dan barcode. Material masuk 180ms dan keluar 140ms; reduced motion mempertahankan cross-fade saja. Bunyi halus tetap menyertai keberhasilan saat preferensinya aktif.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Satu vertical scroller dipakai di seluruh ukuran layar. Density visual tetap ringkas: katalog menampilkan 2 kartu per baris pada smartphone dengan gap 8px dan media persegi yang dominan. Kartu memakai komposisi terbuka tanpa frame, border, atau shadow: foto tidak ditutupi badge stok, aksi tambah berupa lingkaran putih berborder 36px dengan ikon plus di kanan bawah foto, nama dapat memakai dua baris, dan harga tebal berada langsung di bawahnya tanpa prefix Rp yang berulang. Target sentuh aksi tambah tetap 44px dan memiliki accessible name yang menyebut produk, sedangkan visible surface tetap ringkas. Search dan category pills memakai pola katalog Produk, sedangkan scan tetap menjadi aksi icon-only dengan target sentuh 44px di top bar; aksi checkout utama memakai tinggi mobile besar 52px. Kartu mengikuti tinggi kontennya tanpa footer, divider, minimum height, atau auto spacer. Saat ruang katalog mencukupi, grid menjadi 4 kolom dengan pola kartu yang sama. Saat keranjang berisi item, cart memakai floating pill di tengah bawah, tepat di atas navigation bar, lalu membuka bottom drawer yang memenuhi seluruh viewport seperti navigasi ke halaman baru; saat kosong, trigger tidak dirender. Trigger masuk dengan Scale in yang dipasangkan dengan fade dan keluar dengan gerak kebalikannya. Reduced motion mempertahankan fade singkat tanpa perubahan scale. Cart tidak berubah menjadi kolom permanen pada tablet atau desktop.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Kontrol tambah pada kartu POS mempertahankan visible circle 36px di dalam target 44px, dengan ikon plus stroke 3px dan ujung rounded. Floating cart memakai clearance dasar 1rem sebelum mengikuti pergerakan scroll navigation.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Floating cart memakai ikon, label Keranjang, dan jumlah item agar tetap jelas tanpa memenuhi toolbar. Header drawer memakai kontrol kembali leading ‹ Kasir, judul Keranjang dan jumlah item di tengah, serta overflow action di trailing edge sehingga wayfinding terasa seperti halaman baru tanpa membuat judul bergeser. Drawer menjaga fokus di dalam panel tanpa memasukkan kontrol inert, membuat katalog inert, mengembalikan fokus setelah ditutup, dan mempertahankan scrim selama transisi keluar. Pada perangkat sentuh, header dapat digeser turun dengan momentum terproyeksi dan tahanan rubber-band dua arah; spring dimulai dari posisi layar terkini, mewarisi kecepatan jari, serta dapat diraih dan dibalik saat masih bergerak. Reduced motion memakai cross-fade tanpa drag spasial.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Aksi destruktif yang jarang dipakai, Kosongkan keranjang, berada di overflow menu header di samping jumlah item—berseberangan dengan kontrol kembali Kasir—bukan sebagai tombol penuh yang bersaing dengan checkout. Item menu memakai danger styling, tetap mounted tetapi disabled saat checkout, lalu membuka dialog konfirmasi. Setiap baris keranjang memakai hierarki yang stabil: gambar 48px, nama produk hingga dua baris, harga satuan di bawah nama, subtotal tetap di kanan atas, lalu action rail dengan stepper di kiri dan Hapus berlabel di kanan. Kategori, barcode, dan chip add-on tidak tampil di cart operasional. Harga pada row menghilangkan pengulangan prefix Rp serta memakai system font dengan tabular numerals; ringkasan dan total pembayaran tetap memakai format Rupiah lengkap. Antar-item memakai divider inset yang sejajar dengan teks produk, bukan card terpisah. Minus pada jumlah satu menghapus item. Saat checkout berlangsung, kontrol tetap berada di tempatnya dalam keadaan disabled agar baris tidak bergeser. Saat angka diketik, text morph singkat memberi umpan balik. Saat stepper berubah, direction-aware transition menggeser nilai dari bawah ketika bertambah dan dari atas ketika berkurang. Gerak dinonaktifkan pada reduced motion dan tidak memperlambat input keyboard.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Cart memenuhi seluruh viewport pada setiap ukuran layar dan menutup top bar serta bottom navigation aplikasi. Daftar item tetap menjadi satu-satunya area scroll, sedangkan surface grand total menempel di bawah. Bayar memperluas surface yang sama menjadi ringkasan pembayaran; Escape atau Kembali menciutkannya sebelum cart ditutup. Dialog konfirmasi di atasnya mengonsumsi Escape lebih dahulu sehingga satu tekanan hanya menutup satu layer. Tinggi disclosure bergerak dari 0 ke auto memakai physical spring tanpa bounce, sementara isi tetap mounted tetapi inert saat tertutup. Heading dan grand total melakukan cross-fade pada slot yang sama, dan tombol mempertahankan ukuran tetap pada semua viewport.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Feedback tunai memakai satu live region yang melakukan blend hanya ketika status berpindah antara Uang kurang dan Kembalian. Nilai yang berubah di dalam status yang sama tetap instan agar pengetikan terasa cepat.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Hasil pencarian dan kategori mengumumkan jumlah produk melalui live region polite yang stabil, sementara filter kosong menjelaskan bahwa tidak ada produk yang cocok dan menyediakan Atur ulang filter. Harga kartu POS memakai JetBrains Mono dengan angka tabular, dan nominal tunai mengikuti format angka yang sama. Ringkasan pembayaran memakai label Total akhir secara konsisten. Saat cart terbuka, seluruh latar app-shell dibuat inert; focus trap mencakup cart serta overflow menu yang dirender melalui portal, dan error checkout tetap tampil sampai ditutup atau dipulihkan.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Grid katalog memakai gap 8px pada settled dan loading states. Checkout surface tidak menjadi scroll container kedua; jika disclosure panjang, overflow dibatasi pada detailnya sementara heading dan action tetap terlihat. Nama produk POS memakai balanced wrapping, dan feedback ring mengikuti radius foto agar tidak membentuk sudut konsentris yang berbeda.
        </p>
      </div>
      <div className="grid gap-3 rounded-panel bg-black/90 p-4 sm:grid-cols-2">
        <ScanResultConfirmation
          visible
          announce={false}
          feedback={{
            tone: "success",
            message: "Produk ditambahkan",
            description: "8997001230011",
            product: {
              name: "Beras Premium 5 kg",
              price: 72000,
              quantity: 2,
              barcode: "8997001230011",
            },
          }}
        />
        <ScanResultConfirmation
          visible
          announce={false}
          feedback={{ tone: "error", message: "Produk tidak ditemukan", description: "8997001230999" }}
        />
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="pos-smartphone-card-preview grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Kartu produk</p>
          <PosProductCard product={sampleProduct} onAdd={() => ({ ok: true })} />
        </div>
        <div className="grid content-start gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Kontrol katalog dan top bar</p>
          <div className="grid gap-2 rounded-card border border-border bg-surface p-3">
            <div className="mobile-search-control flex h-11 min-w-0 items-center gap-3 rounded-card border border-border px-3.5">
              <Icon name="search" className="size-4 text-text-muted" />
              <input
                aria-label="Cari produk contoh"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Nama produk atau barcode…"
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
              />
            </div>
            <ProductCategoryPills
              value={selectedCategory}
              onChange={setSelectedCategory}
              label="Filter kategori produk kasir contoh"
              options={[
                { value: "", label: "Semua" },
                { value: "sembako", label: "Sembako" },
                { value: "minuman", label: "Minuman" },
              ]}
            />
          </div>
          <div className="flex items-center gap-1 rounded-card border border-border bg-surface p-2">
            <button aria-label="Pindai barcode" title="Pindai barcode" className="pos-toolbar-scan pos-touch-target grid size-11 shrink-0 place-items-center rounded-control text-text hover:bg-surface-muted">
              <Icon name="scan" className="size-6" />
            </button>
            <span className="account-avatar ml-auto size-9 rounded-full bg-surface-muted" />
          </div>
        </div>
        <div className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Ringkasan pembayaran</p>
          <div className="rounded-card border border-border bg-surface p-4">
            <div className="mb-4 grid grid-cols-2 gap-2">
              {methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={paymentMethod === m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`grid min-h-11 place-items-center gap-1 rounded-button border px-3 py-2.5 text-xs font-semibold transition ${
                    paymentMethod === m.id
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border text-text-muted hover:bg-surface-muted"
                  }`}
                >
                  <Icon name={m.icon} className="size-4" />
                  {m.label}
                </button>
              ))}
            </div>
            <dl className="grid gap-3 text-[15px]">
              {[
                ["Subtotal", "Rp41.000"],
                ["Pajak", "Rp4.500"],
                ["Diskon", "-Rp0"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-text-muted">
                  <dt>{label}</dt>
                  <dd className="font-semibold font-mono tabular-nums">{value}</dd>
                </div>
              ))}
              <div className="pt-3">
                <div className="flex justify-between text-lg font-semibold text-text">
                  <dt>Total akhir</dt>
                  <dd className="font-mono tabular-nums">Rp45.500</dd>
                </div>
              </div>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setCashFeedbackPreview("shortfall")}>
                Uang kurang
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setCashFeedbackPreview("change")}>
                Kembalian
              </Button>
            </div>
            <div className="mt-3">
              <CashPaymentFeedback
                status={cashFeedbackPreview}
                value={cashFeedbackPreview === "change" ? "Rp4.500" : "Rp5.500"}
              />
            </div>
            <Button variant="primary" mobileSize="large" className="mt-4 h-12 w-full text-base">
              Selesaikan transaksi
            </Button>
          </div>
        </div>
      </div>
      <div className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Checkout cart smartphone</p>
        <p className="text-sm leading-6 text-text-muted">Ringkasan memakai continuity transition: tinggi disclosure bergerak antara 0 dan auto, header crossfade pada slot yang sama, dan tombol mempertahankan ukuran tetap agar buka-tutup terasa menyatu.</p>
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-panel border border-border bg-surface">
          <div className="grid min-h-48 content-start gap-3 p-4">
            <div className="rounded-card border border-border bg-surface-muted p-3 text-sm text-text-muted">Daftar item tetap dapat di-scroll di atas surface pembayaran.</div>
          </div>
          <MobileCheckoutPanel
            expanded={mobileCheckoutExpanded}
            onExpand={() => setMobileCheckoutExpanded(true)}
            onCollapse={() => setMobileCheckoutExpanded(false)}
            grandTotal="Rp45.500"
          >
            <div className="grid gap-3">
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between text-text-muted"><dt>Subtotal</dt><dd className="font-mono font-semibold tabular-nums">Rp41.000</dd></div>
                <div className="flex justify-between text-text-muted"><dt>Pajak</dt><dd className="font-mono font-semibold tabular-nums">Rp4.500</dd></div>
              </dl>
              <Button variant="primary" mobileSize="large" className="pos-touch-target w-full">Selesaikan transaksi</Button>
            </div>
          </MobileCheckoutPanel>
        </div>
      </div>
    </Panel>
  );
}
