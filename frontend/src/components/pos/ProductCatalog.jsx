import React from "react";
import { Drawer } from "vaul";
import { EmptyState } from "../feedback/EmptyState.jsx";
import { Button, Icon, useOverlayDepth } from "../primitives.jsx";
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
  useOverlayDepth(Boolean(selectorProduct));
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
  const hasActiveFilter = Boolean(deferredQuery.trim() || category);
  const resultStatus = hasActiveFilter
    ? products.length > 0
      ? `${products.length} produk ditemukan.`
      : "Tidak ada produk yang cocok."
    : "";

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {resultStatus}
      </div>
      <div className="product-catalog-grid menu-grid-transition grid auto-rows-max gap-2 p-3 sm:p-6">
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
                Atur ulang filter
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
      <Drawer.Root
        open={Boolean(selectorProduct)}
        onOpenChange={(open) => {
          if (!open) setSelectorProduct(null);
        }}
        direction="bottom"
        dismissible
        modal
        shouldScaleBackground={false}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="overlay-scrim pos-variant-drawer-overlay fixed inset-0 z-[70]" />
          <Drawer.Content
            aria-describedby={undefined}
            className="pos-variant-drawer fixed inset-x-0 bottom-0 z-[80] mx-auto flex max-h-[min(86svh,42rem)] w-full max-w-[36rem] flex-col overflow-hidden rounded-t-overlay border border-border bg-surface outline-none shadow-panel"
          >
            <Drawer.Handle className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-border" />
            <div className="overlay-sticky-header relative px-4 pb-3 pt-4 sm:px-6">
              <Drawer.Title className="min-w-0 pr-12 text-lg font-semibold tracking-[-0.01em] text-text">
                Pilih variasi
              </Drawer.Title>
              <Drawer.Close asChild>
                <button
                  type="button"
                  aria-label="Tutup pilihan variasi"
                  className="absolute right-4 top-2 grid size-11 place-items-center rounded-control text-text-muted transition-[transform,background-color,color] duration-fast ease-standard hover:bg-surface-muted hover:text-text active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:right-6"
                >
                  <Icon name="x" className="size-5" />
                </button>
              </Drawer.Close>
            </div>
            <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-1 sm:px-6">
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
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
});
