export const defaultSettings = {
  storeName: "Toko Wipay",
  storeAddress: "Jl. UMKM No. 1",
  taxEnabled: false,
  taxRate: 11,
  qrisLabel: "QRIS Toko Wipay",
};

export const retailCategories = ["Semua", "Sembako", "Minuman", "Snack", "Perawatan", "Rumah Tangga"];

export const seedProducts = [
  {
    id: "prod-rice-5kg",
    name: "Beras Ramos 5kg",
    barcode: "8991001000011",
    category: "Sembako",
    price: 72000,
    stock: 18,
    unit: "pack",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
    active: true,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z",
  },
  {
    id: "prod-sugar-1kg",
    name: "Gula Pasir 1kg",
    barcode: "8991001000028",
    category: "Sembako",
    price: 17500,
    stock: 24,
    unit: "pack",
    image: "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=600&q=80",
    active: true,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z",
  },
  {
    id: "prod-noodle",
    name: "Mie Instan Goreng",
    barcode: "8991001000035",
    category: "Snack",
    price: 3500,
    stock: 80,
    unit: "pcs",
    image: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=600&q=80",
    active: true,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z",
  },
  {
    id: "prod-water",
    name: "Air Mineral 600ml",
    barcode: "8991001000042",
    category: "Minuman",
    price: 4000,
    stock: 64,
    unit: "botol",
    image: "https://images.unsplash.com/photo-1616118132534-381148898bb4?auto=format&fit=crop&w=600&q=80",
    active: true,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z",
  },
  {
    id: "prod-soap",
    name: "Sabun Mandi Batang",
    barcode: "8991001000059",
    category: "Perawatan",
    price: 5500,
    stock: 36,
    unit: "pcs",
    image: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80",
    active: true,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z",
  },
  {
    id: "prod-detergent",
    name: "Deterjen Bubuk 800g",
    barcode: "8991001000066",
    category: "Rumah Tangga",
    price: 18500,
    stock: 20,
    unit: "pack",
    image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80",
    active: true,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z",
  },
];

export function formatIDR(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  })
    .format(Number(value) || 0)
    .replace(/\s+/g, "");
}

export function normalizeBarcode(value) {
  return String(value || "").trim();
}

export function parseNumberInput(value) {
  if (typeof value === "number") return value;
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return Number.NaN;
  return raw.startsWith("-") ? -Number(digits) : Number(digits);
}

export function validateProduct(product, products) {
  const errors = {};
  const barcode = normalizeBarcode(product.barcode);
  const duplicate = products.some(
    (item) => item.active && item.id !== product.id && normalizeBarcode(item.barcode) === barcode,
  );
  const price = parseNumberInput(product.price);
  const stock = parseNumberInput(product.stock);

  if (!String(product.name || "").trim()) errors.name = "Nama wajib diisi.";
  if (!barcode) errors.barcode = "Barcode wajib diisi.";
  if (duplicate) errors.barcode = "Barcode sudah digunakan.";
  if (!String(product.categoryId || "").trim()) errors.categoryId = "Kategori wajib dipilih.";
  if (!String(product.unitId || "").trim()) errors.unitId = "Satuan wajib dipilih.";
  if (price < 1 || Number.isNaN(price)) {
    errors.price = "Harga minimal Rp1.";
  }
  if (stock < 0 || Number.isNaN(stock)) {
    errors.stock = "Stok harus 0 atau lebih.";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateScannedProduct(product, products) {
  const result = validateProduct(product, products);
  const errors = { ...result.errors };

  const price = parseNumberInput(product.price);
  const stock = parseNumberInput(product.stock);

  if (price < 1 || Number.isNaN(price)) {
    errors.price = "Harga minimal Rp1.";
  }
  if (stock < 1 || Number.isNaN(stock)) {
    errors.stock = "Stok minimal 1 untuk menambahkan produk ke kasir.";
  }
  if (!String(product.unitId || "").trim()) errors.unitId = "Satuan wajib dipilih.";

  return { ok: Object.keys(errors).length === 0, errors };
}

export function findProductByBarcode(products, barcode) {
  const normalized = normalizeBarcode(barcode);
  return findProductVariantByBarcode(products, normalized)?.product || null;
}

export function findProductVariantByBarcode(products, barcode) {
  const normalized = normalizeBarcode(barcode);
  if (!normalized) return null;
  const matches = [];
  for (const product of products) {
    if (!product.active) continue;
    if (normalizeBarcode(product.barcode) === normalized) matches.push({ product, variant: null });
    for (const variant of product.variants || []) {
      if (variant.active !== false && normalizeBarcode(variant.barcode) === normalized) matches.push({ product, variant });
    }
  }
  if (matches.length !== 1) return matches.length > 1 ? { ambiguous: true } : null;
  return matches[0];
}

export function variantKey(productId, variantId) {
  return `${productId}|${variantId || ""}`;
}

export function formatVariantAttributes(attributes) {
  if (!attributes || Object.keys(attributes).length === 0) return "";
  return Object.entries(attributes).map(([k, v]) => `${k}: ${v}`).join(", ");
}

export function addProductToCart(cart, products, barcodeOrProductId, variant) {
  const productByID = products.find((item) => item.active && item.id === barcodeOrProductId);
  const barcodeMatch = productByID ? null : findProductVariantByBarcode(products, barcodeOrProductId);
  if (barcodeMatch?.ambiguous) return { ok: false, error: "Barcode matches multiple products", cart };
  const product = productByID || barcodeMatch?.product;
  if (!product) return { ok: false, error: "Product not found", cart };

  const targetVariant = variant || barcodeMatch?.variant || (product.variants && product.variants.length === 1 ? product.variants[0] : null);
  if (product.variants && product.variants.length > 1 && !targetVariant) {
    return { ok: false, error: "Select a variant", cart };
  }
  const variantId = targetVariant ? targetVariant.id : "";
  const variantStock = targetVariant ? targetVariant.stock : product.stock;
  const variantPrice = targetVariant ? targetVariant.price : product.price;
  if (variantStock <= 0) return { ok: false, error: "Product is out of stock", cart };

  const lineKey = variantKey(product.id, variantId);
  const existing = cart.find((item) => variantKey(item.productId, item.variantId) === lineKey);
  const nextQty = existing ? existing.qty + 1 : 1;
  if (nextQty > variantStock) return { ok: false, error: "Cart quantity exceeds stock", cart };

  const nextCart = existing
    ? cart.map((item) => (variantKey(item.productId, item.variantId) === lineKey ? { ...item, qty: nextQty } : item))
    : [
        ...cart,
        {
          productId: product.id,
          variantId,
          variantAttributes: targetVariant ? targetVariant.attributes : null,
          name: product.name,
          barcode: targetVariant ? targetVariant.barcode : product.barcode,
          price: variantPrice,
          qty: 1,
          stockAtAdd: variantStock,
        },
      ];
  return { ok: true, cart: nextCart, product, variant: targetVariant, quantity: nextQty };
}

export function addSavedProductToCart(cart, products, product) {
  return addProductToCart(cart, [...products, product], product.id);
}

export function calculateCartTotals(cart, settings) {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
  const tax = settings.taxEnabled ? Math.round(subtotal * (Number(settings.taxRate) / 100)) : 0;
  return { subtotal, tax, total: subtotal + tax };
}
