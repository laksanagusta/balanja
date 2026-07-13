import { parseNumberInput } from "./domain.js";

export async function loadProducts(api, options = {}) {
  return api.listProducts(options);
}

export async function loadTransactions(api, options = {}) {
  const transactionPage = await api.listTransactions({ limit: 50, ...options });
  return normalizeTransactions(transactionPage.items);
}

export async function loadSettings(api, options = {}) {
  return api.getSettings(options);
}

export async function loadStockMovements(api, { signal, ...filters } = {}) {
  const page = await api.listStockMovements(filters, { signal });
  return {
    items: Array.isArray(page.items) ? page.items.map(normalizeStockMovement) : [],
    nextCursor: page.nextCursor || "",
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
