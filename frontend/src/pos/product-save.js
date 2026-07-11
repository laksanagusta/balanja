export function createSavedProduct(product, now = new Date()) {
  const timestamp = now.toISOString();

  return {
    ...product,
    id: product.id || `prod-${now.getTime()}`,
    price: Number(product.price),
    stock: Number(product.stock),
    active: product.active !== false,
    updatedAt: timestamp,
    createdAt: product.createdAt || timestamp,
  };
}
