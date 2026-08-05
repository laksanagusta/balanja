const STOCK_ERROR_MESSAGES = {
  AUTH_REQUIRED: "Sesi masuk diperlukan. Masuk kembali untuk melanjutkan.",
  AUTH_INVALID: "Sesi masuk sudah berakhir. Masuk kembali untuk melanjutkan.",
  NETWORK_ERROR: "Koneksi bermasalah. Periksa internet lalu coba lagi.",
  REQUEST_TIMEOUT: "Permintaan terlalu lama. Coba lagi.",
  INVALID_RESPONSE: "Server mengirim respons yang tidak dapat dibaca. Coba lagi.",
  INTERNAL_ERROR: "Terjadi masalah di server. Coba lagi.",
  INVALID_CURSOR: "Riwayat stok berubah. Muat ulang untuk melanjutkan.",
  INVALID_STOCK_MOVEMENT: "Data pergerakan stok belum valid. Periksa kembali isian Anda.",
  PRODUCT_NOT_FOUND: "Produk tidak ditemukan atau sudah tidak tersedia.",
  PRODUCT_INACTIVE: "Produk sudah tidak aktif. Pilih produk aktif lain.",
  INSUFFICIENT_STOCK: "Stok berubah dan tidak mencukupi untuk jumlah ini. Perbarui jumlah lalu coba lagi.",
};

export function getStockErrorMessage(error, fallback = "Aktivitas stok belum dapat dimuat. Coba lagi.") {
  return STOCK_ERROR_MESSAGES[error?.code] || fallback;
}
