import React from "react";
import { EmptyState } from "../feedback/EmptyState.jsx";
import { Button } from "../primitives.jsx";
import { formatPrice } from "../../shared.jsx";
import { PosProductCard } from "./ProductCard.jsx";

export const ProductCatalog = React.memo(function ProductCatalog({
  activeProducts,
  cart,
  query,
  category,
  checkoutPending,
  isUpdating,
  onAdd,
  onClearFilters,
}) {
  const deferredQuery = React.useDeferredValue(query);
  const qtyByProduct = React.useMemo(
    () => new Map(cart.map((item) => [item.productId, item.qty])),
    [cart],
  );
  const products = React.useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    return activeProducts.filter((product) => {
      const matchesCategory = category === "Semua" || product.category === category;
      const searchableText = `${product.name} ${product.barcode}`.toLowerCase();
      return matchesCategory && searchableText.includes(normalizedQuery);
    });
  }, [activeProducts, category, deferredQuery]);

  return (
    <div
      className={`menu-grid-transition grid flex-1 auto-rows-max gap-4 overflow-y-auto p-6 transition-opacity duration-base ease-standard sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 ${
        isUpdating ? "opacity-60" : "opacity-100"
      }`}
    >
      {products.length === 0 ? (
        <div className="sm:col-span-2 lg:col-span-3 2xl:col-span-4">
          <EmptyState
            icon={null}
            title="Produk tidak ditemukan"
            description="Hapus pencarian atau ganti kategori untuk melanjutkan transaksi."
            className="min-h-[260px] p-7"
            borderClassName="border"
            titleClassName="text-sm"
            descriptionClassName="text-sm"
          />
          <div className="mt-3 flex justify-center">
            <Button variant="secondary" onClick={onClearFilters}>
              Reset filter
            </Button>
          </div>
        </div>
      ) : (
        products.map((product) => {
          const qtyInCart = qtyByProduct.get(product.id) || 0;
          const remainingStock = Math.max(Number(product.stock) - qtyInCart, 0);

          return (
            <PosProductCard
              key={product.id}
              product={{
                ...product,
                stock: remainingStock,
                price: formatPrice(product.price),
                qty: qtyInCart,
              }}
              actionLabel={qtyInCart > 0 ? "Tambah lagi" : "Tambah ke keranjang"}
              disabled={remainingStock <= 0 || checkoutPending}
              onAdd={() => onAdd(product.id)}
            />
          );
        })
      )}
    </div>
  );
});
