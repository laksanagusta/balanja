const TRANSACTION_ERROR_MESSAGES = {
  AUTH_REQUIRED: "Sesi masuk diperlukan. Masuk kembali untuk melihat transaksi.",
  AUTH_INVALID: "Sesi masuk sudah berakhir. Masuk kembali untuk melanjutkan.",
  NETWORK_ERROR: "Koneksi bermasalah. Periksa internet lalu coba lagi.",
  REQUEST_TIMEOUT: "Permintaan terlalu lama. Coba lagi.",
  INVALID_RESPONSE: "Server mengirim respons yang tidak dapat dibaca. Coba lagi.",
  INTERNAL_ERROR: "Terjadi masalah di server. Coba lagi.",
  INVALID_CURSOR: "Daftar transaksi berubah. Muat ulang untuk melanjutkan.",
  INVALID_TRANSACTION_FILTER: "Filter transaksi tidak valid. Periksa tanggal lalu coba lagi.",
};

export function getTransactionErrorMessage(error, fallback = "Transaksi belum dapat dimuat. Coba lagi.") {
  return TRANSACTION_ERROR_MESSAGES[error?.code] || fallback;
}
