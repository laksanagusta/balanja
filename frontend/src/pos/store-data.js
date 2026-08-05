import { parseNumberInput } from "./domain.js";
import { sortMasterData } from "./master-data.js";

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

export async function loadCategories(api, options = {}) {
  return sortMasterData(await api.listCategories(options));
}

export async function loadUnits(api, options = {}) {
  return sortMasterData(await api.listUnits(options));
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
  const updates = Array.isArray(result?.products) ? result.products : [];
  return products.map((product) => {
    const productUpdates = updates.filter((update) => (
      update.productId === product.id
      || (!update.productId && !update.variantId && update.id === product.id)
      || (!update.productId && Array.isArray(product.variants) && product.variants.some((variant) => variant.id === (update.variantId || update.id)))
    ));
    if (productUpdates.length === 0) return product;
    const directUpdate = productUpdates.find((update) => !update.variantId && update.id === product.id);
    const updated = directUpdate
      ? { ...product, stock: directUpdate.stock, updatedAt: directUpdate.updatedAt }
      : { ...product };
    if (Array.isArray(product.variants)) {
      updated.variants = product.variants.map((variant) => {
        const update = productUpdates.find((item) => (item.variantId || item.id) === variant.id);
        if (!update) return variant;
        if (Object.keys(variant.attributes || {}).length === 0) {
          updated.stock = update.stock;
          updated.updatedAt = update.updatedAt;
        }
        return { ...variant, stock: update.stock, updatedAt: update.updatedAt };
      });
    }
    return updated;
  });
}

export function applyProductStock(products, productStock) {
  return products.map((product) => {
    if (product.id !== (productStock.productId || productStock.id)) return product;
    if (!productStock.variantId) return { ...product, stock: productStock.stock, updatedAt: productStock.updatedAt };

    const matchedVariant = (product.variants || []).find((variant) => variant.id === productStock.variantId);
    return {
      ...product,
      ...(matchedVariant && Object.keys(matchedVariant.attributes || {}).length === 0
        ? { stock: productStock.stock, updatedAt: productStock.updatedAt }
        : {}),
      variants: (product.variants || []).map((variant) => (
        variant.id === productStock.variantId
          ? { ...variant, stock: productStock.stock, updatedAt: productStock.updatedAt }
          : variant
      )),
    };
  });
}

export function toProductPayload(product, includeStock) {
  return {
    name: String(product.name || "").trim(),
    barcode: String(product.barcode || "").trim(),
    categoryId: String(product.categoryId || "").trim(),
    price: parseNumberInput(product.price),
    ...(includeStock ? { stock: parseNumberInput(product.stock) } : {}),
    unitId: String(product.unitId || "").trim(),
    image: product.image || "",
    ...(!includeStock ? { active: product.active !== false } : {}),
    attributesConfig: Array.isArray(product.attributesConfig) ? product.attributesConfig : [],
    variants: Array.isArray(product.variants) ? product.variants.map((variant) => ({
      ...(variant.id ? { id: variant.id } : {}),
      attributes: variant.attributes || {},
      price: parseNumberInput(variant.price),
      stock: parseNumberInput(variant.stock),
      barcode: String(variant.barcode || "").trim(),
      active: variant.active !== false,
    })) : [],
  };
}

export function toProductFormData(product, includeStock) {
  const payload = toProductPayload(product, includeStock);
  delete payload.image;
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    form.set(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
  });
  if (product.imageFile) form.set("image_file", product.imageFile, product.imageFile.name);
  if (product.removeImage) form.set("remove_image", "true");
  return form;
}

function normalizeTransactions(items) {
  if (!Array.isArray(items)) return [];
  return items.map((transaction) => ({
    ...transaction,
    cashierName: transaction?.cashierName || transaction?.cashier_name || "",
    cashierUserId: transaction?.cashierUserId || transaction?.cashier_user_id || "",
    items: normalizeTransactionItems(transaction?.items),
  }));
}

function normalizeStockMovement(movement) {
  return {
    id: movement.id,
    productId: movement.productId,
    variantId: movement.variantId || "",
    variantAttributes: movement.variantAttributes || "",
    productName: movement.productName || "Unknown product",
    productImage: movement.productImage || movement.product_image || "",
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
    createdByUserName: movement.createdByUserName || movement.createdByUser?.name || movement.createdByName || "",
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
