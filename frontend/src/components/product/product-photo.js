export const MAX_PRODUCT_PHOTO_BYTES = 5 * 1024 * 1024;
export const PRODUCT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export function validateProductPhoto(file) {
  if (!file) return "";
  if (file.size > MAX_PRODUCT_PHOTO_BYTES) return "Ukuran foto maksimal 5 MB.";
  if (!PRODUCT_PHOTO_TYPES.includes(file.type)) return "Gunakan format JPG, PNG, atau WebP.";
  return "";
}
