import React from "react";
import { CashPaymentFeedback } from "../pos/CashPaymentFeedback.jsx";
import { PosProductCard } from "../pos/ProductCard.jsx";
import { MobileCheckoutPanel } from "../pos/MobileCheckoutPanel.jsx";
import { ScanResultConfirmation } from "../scan/ScanResultConfirmation.jsx";
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
  const [selectedCategory, setSelectedCategory] = React.useState("Sembako");
  const categoryTabsRef = React.useRef(null);
  const categoryTabRefs = React.useRef(new Map());
  const [categoryIndicator, setCategoryIndicator] = React.useState({ left: 0, width: 0, ready: false });

  React.useLayoutEffect(() => {
    const tabs = categoryTabsRef.current;
    const activeTab = categoryTabRefs.current.get(selectedCategory);
    if (!tabs || !activeTab) return undefined;

    const updateIndicator = () => {
      setCategoryIndicator({ left: activeTab.offsetLeft, width: activeTab.offsetWidth, ready: true });
    };
    updateIndicator();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateIndicator);
    observer?.observe(tabs);
    observer?.observe(activeTab);
    return () => observer?.disconnect();
  }, [selectedCategory]);

  return (
    <Panel className="grid gap-6 p-6">
      <div>
        <h3 className="text-xl font-semibold text-text">Pola komposit kasir</h3>
        <p className="mt-1 text-sm text-text-muted">
          Kartu produk, pencarian barcode, tab kategori, dan ringkasan pembayaran dibangun dari primitive di atas. Scanner memprioritaskan kamera belakang 720p, menjelaskan kegagalan izin atau perangkat secara spesifik, dan tetap menyediakan input manual. Aksi teks Selesai di header menyediakan jalan keluar eksplisit dengan target sentuh 44px. Kamera tampil bersih tanpa kotak bidik permanen; saat barcode diproses, scanner menampilkan status ringkas selama minimal 180ms. Barcode yang sama memakai cooldown pasti 1 detik sebelum dapat menambah kuantitas lagi. Hasil tampil di bawah sebagai material hitam blur tanpa toast global: indikator hijau muda untuk berhasil dan kuning untuk tidak ditemukan atau gagal. Keberhasilan scan kasir menyertakan nama produk, harga, jumlah terbaru di keranjang, dan barcode. Material masuk 180ms dan keluar 140ms; reduced motion mempertahankan cross-fade saja. Bunyi halus tetap menyertai keberhasilan saat preferensinya aktif.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Satu vertical scroller dipakai pada layout ringkas. Density visual tetap ringkas: katalog menampilkan 2 kartu per baris pada smartphone dengan gap 8px, media persegi yang lebih dominan, dan tombol visual 36px di dalam target sentuh 44px. Pada semua ukuran container, kartu mengikuti tinggi kontennya dan harga bersama aksi tambah dibaca sebagai satu kelompok dengan jarak visual tetap 8px tanpa divider; harga kartu menghilangkan prefix Rp yang berulang. Aksi tambah mengikuti treatment flat global ala Uber: hitam solid dengan teks putih, tanpa gradient highlight, edge ring, text shadow, atau elevation shadow; hover hanya menggelapkan warna dan active state memakai scale ringan. Footer tidak memakai minimum height atau auto spacer, sehingga perubahan lebar kartu tidak menciptakan ruang kosong. Saat ruang katalog mencukupi, grid kembali menjadi 4 kolom dan density kartu normal. Hanya smartphone hingga 639px yang menampilkan trigger cart dan drawer penuh dari kanan; mulai 640px cart selalu terlihat sebagai kolom selebar 320–360px, lalu 360–420px pada workspace lebar. Workspace dan katalog beradaptasi melalui container query.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Trigger drawer memakai ikon cart dan jumlah item; aksi di dalam drawer memakai teks Tutup tanpa chevron ganda. Drawer menjaga fokus di dalam panel tanpa memasukkan kontrol inert, membuat katalog inert hanya pada layout ringkas, mengembalikan fokus setelah ditutup, dan mempertahankan scrim selama transisi keluar. Rotasi ke layout persisten langsung melepas semantik modal. Pada perangkat sentuh, header dapat digeser ke kanan dengan momentum terproyeksi dan tahanan rubber-band dua arah; spring dimulai dari posisi layar terkini, mewarisi kecepatan jari, serta dapat diraih dan dibalik saat masih bergerak. Reduced motion memakai cross-fade tanpa drag spasial.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Aksi destruktif yang jarang dipakai, Kosongkan keranjang, berada di overflow menu header di samping jumlah item—sebelum Tutup pada drawer ringkas—bukan sebagai tombol penuh yang bersaing dengan checkout. Item menu memakai danger styling, tetap mounted tetapi disabled saat checkout, lalu membuka dialog konfirmasi. Setiap baris keranjang memakai hierarki yang stabil: gambar 48px, nama produk hingga dua baris, harga satuan di bawah nama, subtotal tetap di kanan atas, lalu action rail dengan stepper di kiri dan Hapus berlabel di kanan. Kategori, barcode, dan chip add-on tidak tampil di cart operasional. Harga pada row menghilangkan pengulangan prefix Rp serta memakai system font dengan tabular numerals; ringkasan dan total pembayaran tetap memakai format Rupiah lengkap. Antar-item memakai divider inset yang sejajar dengan teks produk, bukan card terpisah. Minus pada jumlah satu menghapus item. Saat checkout berlangsung, kontrol tetap berada di tempatnya dalam keadaan disabled agar baris tidak bergeser. Saat angka diketik, text morph singkat memberi umpan balik. Saat stepper berubah, direction-aware transition menggeser nilai dari bawah ketika bertambah dan dari atas ketika berkurang. Gerak dinonaktifkan pada reduced motion dan tidak memperlambat input keyboard.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Pada smartphone hingga 639px, cart memakai lebar penuh. Daftar item tetap menjadi satu-satunya area scroll, sedangkan surface grand total menempel di bawah. Bayar memperluas surface yang sama menjadi ringkasan pembayaran; Escape atau Kembali menciutkannya sebelum cart ditutup. Dialog konfirmasi di atasnya mengonsumsi Escape lebih dahulu sehingga satu tekanan hanya menutup satu layer. Tinggi disclosure bergerak dari 0 ke auto memakai physical spring tanpa bounce, sementara isi tetap mounted tetapi inert saat tertutup. Heading dan grand total melakukan cross-fade pada slot yang sama, dan tombol mempertahankan ukuran tetap. Tablet dan desktop mempertahankan ringkasan pembayaran lama tanpa perubahan.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Feedback tunai memakai satu live region yang melakukan blend hanya ketika status berpindah antara Uang kurang dan Kembalian. Nilai yang berubah di dalam status yang sama tetap instan agar pengetikan terasa cepat.
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
        <div className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Pencarian dan pindai</p>
          <div className="flex min-w-0 flex-col gap-2">
            <label className="pos-touch-target flex min-w-0 items-center">
              <span className="pos-toolbar-control-surface flex h-9 w-full min-w-0 items-center gap-3 rounded-card border border-border bg-surface px-4 shadow-inner-soft focus-within:border-border-strong focus-within:outline-1 focus-within:outline-focus/30">
                <Icon name="search" className="size-5 text-text-muted" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
                  name="designProductSearch"
                  autoComplete="off"
                  aria-label="Cari produk atau barcode"
                  aria-keyshortcuts="Meta+K Control+K"
                  placeholder="Cari produk atau barcode…"
                />
              </span>
            </label>
            <Button variant="primary" size="base" compactVisual className="header-compact-action pos-toolbar-scan pos-touch-target">
              <Icon name="scan" className="size-4" />
              Pindai barcode
            </Button>
          </div>
        </div>
        <div className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Tab kategori</p>
          <div ref={categoryTabsRef} className="category-tabs relative flex w-full gap-1 overflow-x-auto rounded-control border border-border bg-surface-muted p-1">
            <span
              aria-hidden="true"
              className="category-tabs-indicator"
              style={{
                "--category-indicator-x": `${categoryIndicator.left}px`,
                "--category-indicator-width": `${categoryIndicator.width}px`,
                opacity: categoryIndicator.ready ? 1 : 0,
              }}
            />
            {["Semua", "Sembako", "Minuman"].map((cat) => (
              <button
                ref={(node) => {
                  if (node) categoryTabRefs.current.set(cat, node);
                  else categoryTabRefs.current.delete(cat);
                }}
                key={cat}
                type="button"
                aria-pressed={cat === selectedCategory}
                onClick={() => setSelectedCategory(cat)}
                className={`pos-touch-target relative z-10 h-8 min-w-max flex-1 basis-0 rounded-md px-5 text-sm font-medium transition-colors duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  cat === selectedCategory
                    ? "text-text"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {cat}
              </button>
            ))}
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
                  className={`grid min-h-11 place-items-center gap-1 rounded-md border px-3 py-2.5 text-xs font-semibold transition ${
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
              <div className="border-t border-dashed border-border pt-3">
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
            <Button variant="primary" className="mt-4 h-12 w-full text-base">
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
              <Button variant="primary" className="pos-touch-target w-full">Selesaikan transaksi</Button>
            </div>
          </MobileCheckoutPanel>
        </div>
      </div>
    </Panel>
  );
}
