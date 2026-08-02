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
      const searchableText = [
        product.name,
        product.barcode,
        ...(product.variants || []).flatMap((variant) => [
          variant.barcode,
          ...Object.values(variant.attributes || {}),
        ]),
      ].join(" ").toLowerCase();
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
            const variants = Array.isArray(product.variants) ? product.variants : [];
            const configuredVariants = product.attributesConfig?.length > 0
              ? variants.filter((variant) => Object.keys(variant.attributes || {}).length > 0)
              : variants;
            const variantsWithAvailability = configuredVariants.map((variant) => ({
              ...variant,
              availableStock: Math.max(Number(variant.stock) - (qtyByLine.get(variantKey(product.id, variant.id)) || 0), 0),
            }));
            const hasMultipleVariants = product.attributesConfig?.length > 0 && variantsWithAvailability.length > 1;
            const directVariant = variantsWithAvailability.length === 1 ? variantsWithAvailability[0] : null;
            const lineKey = variantKey(product.id, directVariant?.id || "");
            const qtyInCart = qtyByLine.get(lineKey) || 0;
            const remainingStock = directVariant
              ? directVariant.availableStock
              : Math.max(Number(product.stock) - qtyInCart, 0);
            const availableStock = hasMultipleVariants
              ? Math.max(0, ...variantsWithAvailability.filter((variant) => variant.active !== false).map((variant) => variant.availableStock))
              : remainingStock;

            return (
              <PosProductCard
                key={product.id}
                product={{
                  ...product,
                  variants: variantsWithAvailability,
                  stock: availableStock,
                  price: formatPrice(product.price).replace(/^Rp/, ""),
                  qty: qtyInCart,
                }}
                disabled={checkoutPending || availableStock <= 0}
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
              const result = onAdd(selectorProduct.id, variant);
              if (result?.ok) setSelectorProduct(null);
              return result;
            }}
          />
        )}
      </Dialog>
    </>
  );
});
