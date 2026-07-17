import { parseNumberInput } from "./domain.js";

export async function loadProducts(api, options = {}) {
  const products = [];
  let cursor = "";
  do {
    const page = await api.listProducts({ ...options, limit: 100, cursor });
    products.push(...page.items);
    cursor = page.hasNextPage ? page.nextCursor : "";
  } while (cursor);
  return products;
}

export async function searchProducts(api, options = {}) {
  return (await api.listProducts(options)).items;
}

export async function loadTransactions(api, options = {}) {
  return (await loadTransactionPage(api, { limit: 50, ...options })).items;
}

export async function loadTransactionPage(api, options = {}) {
  const page = await api.listTransactions(options);
  return { ...page, items: normalizeTransactions(page.items) };
}

export async function loadSettings(api, options = {}) {
  return api.getSettings(options);
}

export async function loadStockMovements(api, { signal, ...filters } = {}) {
  return loadStockMovementPage(api, filters, { signal });
}

export async function loadStockMovementPage(api, filters = {}, options = {}) {
  const page = await api.listStockMovements(filters, options);
  return {
    ...page,
    items: Array.isArray(page.items) ? page.items.map(normalizeStockMovement) : [],
    nextCursor: page.nextCursor || "",
    hasNextPage: page.hasNextPage === true,
  };
}

export function applyCheckoutResult(products, result) {
  const updates = new Map(result.products.map((product) => [product.id, product]));
  return products.map((product) => {
    const update = updates.get(product.id);
    return update ? { ...product, stock: update.stock, updatedAt: update.updatedAt } : product;
  });
}

export function applyProductStock(products, productStock) {
  return products.map((product) => (
    product.id === productStock.id ? { ...product, stock: productStock.stock, updatedAt: productStock.updatedAt } : product
  ));
}

export function toProductPayload(product, includeStock) {
  return {
    name: String(product.name || "").trim(),
    barcode: String(product.barcode || "").trim(),
    category: String(product.category || "").trim(),
    price: parseNumberInput(product.price),
    ...(includeStock ? { stock: parseNumberInput(product.stock) } : {}),
    unit: String(product.unit || "").trim(),
    image: product.image || "",
    ...(!includeStock ? { active: product.active !== false } : {}),
  };
}

export function toProductFormData(product, includeStock) {
  const payload = toProductPayload(product, includeStock);
  delete payload.image;
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => form.set(key, String(value)));
  if (product.imageFile) form.set("image_file", product.imageFile, product.imageFile.name);
  if (product.removeImage) form.set("remove_image", "true");
  return form;
}

function normalizeTransactions(items) {
  if (!Array.isArray(items)) return [];
  return items.map((transaction) => ({
    ...transaction,
    items: normalizeTransactionItems(transaction?.items),
  }));
}

function normalizeStockMovement(movement) {
  return {
    id: movement.id,
    productId: movement.productId,
    productName: movement.productName || "Unknown product",
    productBarcode: movement.productBarcode || "",
    productCategory: movement.productCategory || "",
    productUnit: movement.productUnit || "pcs",
    type: movement.type,
    quantityDelta: Number(movement.quantityDelta) || 0,
    stockBefore: Number(movement.stockBefore) || 0,
    stockAfter: Number(movement.stockAfter) || 0,
    reason: movement.reason || "",
    referenceType: movement.referenceType || "",
    referenceId: movement.referenceId || "",
    createdByUserId: movement.createdByUserId || "",
    createdAt: movement.createdAt,
  };
}

function normalizeTransactionItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter(Boolean)
    .map((item) => ({
      ...item,
      qty: Number(item.qty ?? item.quantity) || 0,
    }));
}
