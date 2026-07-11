export async function loadPOSData(api) {
  const [products, transactionPage, settings] = await Promise.all([
    api.listProducts(),
    api.listTransactions({ limit: 50 }),
    api.getSettings(),
  ]);
  return { products, transactions: transactionPage.items, settings };
}

export function applyCheckoutResult(products, result) {
  const updates = new Map(result.products.map((product) => [product.id, product]));
  return products.map((product) => {
    const update = updates.get(product.id);
    return update ? { ...product, stock: update.stock, updatedAt: update.updatedAt } : product;
  });
}

export function toProductPayload(product, includeStock) {
  return {
    name: String(product.name || "").trim(),
    barcode: String(product.barcode || "").trim(),
    category: String(product.category || "").trim(),
    price: Number(product.price),
    ...(includeStock ? { stock: Number(product.stock) } : {}),
    unit: String(product.unit || "").trim(),
    image: product.image || "",
    active: product.active !== false,
  };
}
