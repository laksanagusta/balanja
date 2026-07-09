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
  if (Number(product.price) < 0 || Number.isNaN(Number(product.price))) {
    errors.price = "Price must be zero or greater";
  }
  if (Number(product.stock) < 0 || Number.isNaN(Number(product.stock))) {
    errors.stock = "Stock must be zero or greater";
  }

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

export function calculateCartTotals(cart, settings) {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
  const tax = settings.taxEnabled ? Math.round(subtotal * (Number(settings.taxRate) / 100)) : 0;
  return { subtotal, tax, total: subtotal + tax };
}

export function checkoutCart({
  cart,
  products,
  settings,
  payment,
  cashierName,
  now = new Date(),
  transactionNumber,
}) {
  if (cart.length === 0) return { ok: false, error: "Cart is empty" };

  for (const item of cart) {
    const product = products.find((entry) => entry.id === item.productId);
    if (!product || !product.active) return { ok: false, error: `${item.name} is unavailable` };
    if (item.qty > product.stock) return { ok: false, error: `${item.name} stock is not enough` };
  }

  const totals = calculateCartTotals(cart, settings);
  const method = payment.method;
  const cashReceived = method === "cash" ? Number(payment.cashReceived) : 0;
  if (method === "cash" && cashReceived < totals.total) {
    return { ok: false, error: "Cash received is less than total" };
  }

  const createdAt = now.toISOString();
  const transaction = {
    id: `txn-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    number: transactionNumber,
    createdAt,
    cashierName,
    items: cart.map((item) => ({ ...item })),
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    paymentMethod: method,
    cashReceived: method === "cash" ? cashReceived : 0,
    changeDue: method === "cash" ? cashReceived - totals.total : 0,
    status: "completed",
  };

  const nextProducts = products.map((product) => {
    const cartItem = cart.find((item) => item.productId === product.id);
    return cartItem ? { ...product, stock: product.stock - cartItem.qty, updatedAt: createdAt } : product;
  });

  return { ok: true, transaction, products: nextProducts };
}

export function createTransactionNumber(count) {
  return `TRX-${String(count + 1).padStart(4, "0")}`;
}
