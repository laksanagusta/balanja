export const defaultSettings = {
  storeName: "Toko Balanja",
  storeAddress: "Jl. UMKM No. 1",
  taxEnabled: false,
  taxRate: 11,
  qrisLabel: "QRIS Toko Balanja",
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

export function validateProduct(product, products) {
  const errors = {};
  const barcode = normalizeBarcode(product.barcode);
  const duplicate = products.some(
    (item) => item.active && item.id !== product.id && normalizeBarcode(item.barcode) === barcode,
  );

  if (!String(product.name || "").trim()) errors.name = "Name is required";
  if (!barcode) errors.barcode = "Barcode is required";
  if (duplicate) errors.barcode = "Barcode already exists";
  if (!String(product.category || "").trim()) errors.category = "Category is required";
  if (!String(product.unit || "").trim()) errors.unit = "Unit is required";
  if (Number(product.price) < 1 || Number.isNaN(Number(product.price))) {
    errors.price = "Price must be at least 1";
  }
  if (Number(product.stock) < 0 || Number.isNaN(Number(product.stock))) {
    errors.stock = "Stock must be zero or greater";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateScannedProduct(product, products) {
  const result = validateProduct(product, products);
  const errors = { ...result.errors };

  if (Number(product.price) < 1 || Number.isNaN(Number(product.price))) {
    errors.price = "Price must be at least 1";
  }
  if (Number(product.stock) < 1 || Number.isNaN(Number(product.stock))) {
    errors.stock = "Stock must be at least 1 to add this product to cart";
  }
  if (!String(product.unit || "").trim()) errors.unit = "Unit is required";

  return { ok: Object.keys(errors).length === 0, errors };
}

export function findProductByBarcode(products, barcode) {
  const normalized = normalizeBarcode(barcode);
  return products.find((item) => item.active && normalizeBarcode(item.barcode) === normalized) || null;
}

export function addProductToCart(cart, products, barcodeOrProductId) {
  const product =
    products.find((item) => item.active && item.id === barcodeOrProductId) ||
    findProductByBarcode(products, barcodeOrProductId);

  if (!product) return { ok: false, error: "Product not found", cart };
  if (product.stock <= 0) return { ok: false, error: "Product is out of stock", cart };

  const existing = cart.find((item) => item.productId === product.id);
  const nextQty = existing ? existing.qty + 1 : 1;
  if (nextQty > product.stock) return { ok: false, error: "Cart quantity exceeds stock", cart };

  const nextCart = existing
    ? cart.map((item) => (item.productId === product.id ? { ...item, qty: nextQty } : item))
    : [
        ...cart,
        {
          productId: product.id,
          name: product.name,
          barcode: product.barcode,
          price: product.price,
          qty: 1,
          stockAtAdd: product.stock,
        },
      ];

  return { ok: true, cart: nextCart };
}

export function addSavedProductToCart(cart, products, product) {
  return addProductToCart(cart, [...products, product], product.id);
}

export function calculateCartTotals(cart, settings) {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
  const tax = settings.taxEnabled ? Math.round(subtotal * (Number(settings.taxRate) / 100)) : 0;
  return { subtotal, tax, total: subtotal + tax };
}
