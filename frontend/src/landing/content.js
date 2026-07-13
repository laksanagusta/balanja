export const navItems = [
  { label: "Fitur", href: "#fitur" },
  { label: "Cara Kerja", href: "#cara-kerja" },
  { label: "FAQ", href: "#faq" },
];

export const features = [
  {
    title: "Kasir cepat",
    description: "Cari produk, atur jumlah, dan selesaikan transaksi dari satu layar yang fokus.",
    visual: "pos",
    size: "wide",
  },
  {
    title: "Katalog produk",
    description: "Kelola nama, kategori, harga, barcode, dan status produk dengan rapi.",
    visual: "products",
    size: "standard",
  },
  {
    title: "Stok tercatat",
    description: "Pantau pergerakan stok dan lihat jumlah akhir tanpa pencatatan terpisah.",
    visual: "stock",
    size: "standard",
  },
  {
    title: "Riwayat transaksi",
    description: "Temukan kembali transaksi berdasarkan nomor, metode pembayaran, atau tanggal.",
    visual: "transactions",
    size: "standard",
  },
  {
    title: "Dashboard penjualan",
    description: "Baca ringkasan performa toko dari data transaksi yang sudah selesai.",
    visual: "dashboard",
    size: "standard",
  },
  {
    title: "Pemindaian barcode",
    description: "Tambahkan produk ke keranjang langsung dari barcode saat melayani pembeli.",
    visual: "barcode",
    size: "standard",
  },
];

export const workflowPoints = [
  "Produk dan stok tersedia langsung untuk alur kasir.",
  "Transaksi selesai tersimpan dalam riwayat.",
  "Dashboard merangkum performa penjualan toko.",
];

export const faqs = [
  {
    question: "Untuk jenis usaha apa Balanja dibuat?",
    answer:
      "Balanja dirancang untuk operasional UMKM retail yang membutuhkan kasir, katalog produk, pencatatan stok, dan riwayat transaksi dalam satu aplikasi.",
  },
  {
    question: "Apakah Balanja mendukung pemindaian barcode?",
    answer:
      "Ya. Kasir dapat memindai barcode untuk mencari produk dan menambahkannya ke keranjang. Barcode yang belum dikenal dapat dilanjutkan ke alur penambahan produk.",
  },
  {
    question: "Bagaimana produk dan stok dikelola?",
    answer:
      "Produk dikelola melalui katalog, sedangkan perubahan stok dicatat sebagai pergerakan dengan jenis, jumlah, alasan, dan pratinjau stok akhir.",
  },
  {
    question: "Apakah riwayat transaksi dapat dicari?",
    answer:
      "Ya. Riwayat transaksi dapat dicari dan disaring berdasarkan informasi operasional seperti metode pembayaran serta rentang tanggal.",
  },
  {
    question: "Perangkat apa yang dapat digunakan?",
    answer:
      "Balanja berjalan sebagai aplikasi web responsif. Gunakan browser modern pada komputer atau tablet dengan ukuran layar yang memadai untuk alur kasir.",
  },
  {
    question: "Bagaimana cara mulai menggunakan Balanja?",
    answer:
      "Masuk melalui halaman login, siapkan katalog dan stok produk, lalu buka layar POS untuk mulai mencatat penjualan.",
  },
];
