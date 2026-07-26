function cleanMessageValue(value, fallback) {
  const cleaned = String(value || "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || fallback).slice(0, 120);
}

function normalizeWhatsApp(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = raw.replace(/[\s()+.-]/g, "");
  return /^\d{8,15}$/.test(normalized) ? normalized : "";
}

function normalizeEmail(value) {
  const normalized = String(value || "").trim();
  if (/[\r\n]/.test(normalized)) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

export function upgradeContacts({
  whatsapp,
  email,
  storeName = "",
  supportReference = "",
} = {}) {
  const result = {};
  const number = normalizeWhatsApp(whatsapp);
  const address = normalizeEmail(email);
  const safeStoreName = cleanMessageValue(storeName, "Toko Balanja");
  const safeReference = cleanMessageValue(supportReference, "belum tersedia");
  const message = `Halo, saya ingin mengaktifkan paket berbayar Balanja untuk ${safeStoreName}. ID toko: ${safeReference}.`;
  if (number) result.whatsapp = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  if (address) {
    const query = new URLSearchParams({
      subject: `Aktivasi Balanja — ${safeStoreName}`,
      body: message,
    });
    result.email = `mailto:${address}?${query.toString()}`;
  }
  return result;
}
