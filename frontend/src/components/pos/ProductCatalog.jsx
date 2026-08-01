import React from "react";
import { EmptyState } from "../feedback/EmptyState.jsx";
import { Button, Dialog } from "../primitives.jsx";
import { formatPrice } from "../../shared.jsx";
import { variantKey } from "../../pos/domain.js";
import { PosProductCard } from "./ProductCard.jsx";
import { VariantSelector } from "./VariantSelector.jsx";

export const ProductCatalog = React.memo(function ProductCatalog({
  activeProducts,
  cart,
  query,
  category,
  checkoutPending,
  onAdd,
  onClearFilters,
}) {
  const deferredQuery = React.useDeferredValue(query);
  const [selectorProduct, setSelectorProduct] = React.useState(null);
  const qtyByLine = React.useMemo(
    () => new Map(cart.map((item) => [variantKey(item.productId, item.variantId), item.qty])),
    [cart],
  );
  const products = React.useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    return activeProducts.filter((product) => {
      const matchesCategory = !category || product.categoryId === category;
      const searchableText = `${product.name} ${product.barcode}`.toLowerCase();
      return matchesCategory && searchableText.includes(normalizedQuery);
    });
  }, [activeProducts, category, deferredQuery]);

  return (
    <>
      <div className="product-catalog-grid menu-grid-transition grid auto-rows-max gap-4 p-3 sm:p-6">
        {products.length === 0 ? (
          <div className="product-catalog-empty">
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
            const hasMultipleVariants = Array.isArray(product.variants) && product.variants.length > 1;
            const lineKey = variantKey(product.id, "");
            const qtyInCart = qtyByLine.get(lineKey) || 0;
            const remainingStock = Math.max(Number(product.stock) - qtyInCart, 0);

            return (
              <PosProductCard
                key={product.id}
                product={{
                  ...product,
                  stock: hasMultipleVariants ? Math.max(...product.variants.map((v) => v.stock)) : remainingStock,
                  price: formatPrice(product.price).replace(/^Rp/, ""),
                  qty: qtyInCart,
                }}
                disabled={checkoutPending || (!hasMultipleVariants && remainingStock <= 0)}
                onAdd={() => onAdd(product.id)}
                onOpenVariants={setSelectorProduct}
              />
            );
          })
        )}
      </div>
      <Dialog
        open={Boolean(selectorProduct)}
        onClose={() => setSelectorProduct(null)}
        title="Pilih variasi"
        size="sm"
      >
        {selectorProduct && (
          <VariantSelector
            product={selectorProduct}
            onChoose={(variant) => {
              onAdd(selectorProduct.id, variant);
              setSelectorProduct(null);
            }}
            onClose={() => setSelectorProduct(null)}
          />
        )}
      </Dialog>
    </>
  );
});
