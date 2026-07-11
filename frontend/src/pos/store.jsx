import React from "react";
import {
  addSavedProductToCart,
  addProductToCart,
  checkoutCart,
  createTransactionNumber,
  validateProduct,
} from "./domain.js";
import { createSavedProduct } from "./product-save.js";
import { loadPersistedState, resetPersistedState, savePersistedState } from "./storage.js";

const POSStoreContext = React.createContext(null);

export function POSStoreProvider({ children }) {
  const [state, setState] = React.useState(() => loadPersistedState());

  React.useEffect(() => {
    savePersistedState(state);
  }, [state.products, state.cart, state.transactions, state.settings]);

  const setNotice = React.useCallback((notice) => {
    setState((current) => ({ ...current, notice }));
  }, []);

  const clearNotice = React.useCallback(() => {
    setState((current) => ({ ...current, notice: "" }));
  }, []);

  const addToCart = React.useCallback((barcodeOrProductId) => {
    let response = null;
    setState((current) => {
      const result = addProductToCart(current.cart, current.products, barcodeOrProductId);
      response = result;
      return result.ok
        ? { ...current, cart: result.cart, notice: "" }
        : { ...current, notice: result.error };
    });
    return response;
  }, []);

  const updateCartQty = React.useCallback((productId, qty) => {
    let response = null;
    setState((current) => {
      const product = current.products.find((item) => item.id === productId);
      const nextQty = Math.max(0, Number(qty));

      if (!product) {
        response = { ok: false, error: "Product not found" };
        return { ...current, notice: response.error };
      }
      if (nextQty > product.stock) {
        response = { ok: false, error: "Cart quantity exceeds stock" };
        return { ...current, notice: response.error };
      }

      response = { ok: true };
      return {
        ...current,
        cart:
          nextQty === 0
            ? current.cart.filter((item) => item.productId !== productId)
            : current.cart.map((item) =>
                item.productId === productId ? { ...item, qty: nextQty } : item,
              ),
        notice: "",
      };
    });
    return response;
  }, []);

  const clearCart = React.useCallback(() => {
    setState((current) => ({ ...current, cart: [], notice: "" }));
  }, []);

  const saveProduct = React.useCallback((product) => {
    setState((current) => {
      const savedProduct = createSavedProduct(product);
      const validation = validateProduct(savedProduct, current.products);

      if (!validation.ok) {
        return { ...current, notice: Object.values(validation.errors)[0] };
      }

      const exists = current.products.some((item) => item.id === savedProduct.id);
      return {
        ...current,
        products: exists
          ? current.products.map((item) => (item.id === savedProduct.id ? savedProduct : item))
          : [...current.products, savedProduct],
        notice: "",
      };
    });
  }, []);

  const addScannedProductToCart = React.useCallback((product) => {
    setState((current) => {
      const savedProduct = createSavedProduct(product);
      const validation = validateProduct(savedProduct, current.products);

      if (!validation.ok) {
        return { ...current, notice: Object.values(validation.errors)[0] };
      }

      const result = addSavedProductToCart(current.cart, current.products, savedProduct);
      if (!result.ok) return { ...current, notice: result.error };

      return {
        ...current,
        products: [...current.products, savedProduct],
        cart: result.cart,
        notice: "",
      };
    });
  }, []);

  const deactivateProduct = React.useCallback((productId) => {
    setState((current) => ({
      ...current,
      products: current.products.map((item) =>
        item.id === productId ? { ...item, active: false, updatedAt: new Date().toISOString() } : item,
      ),
      cart: current.cart.filter((item) => item.productId !== productId),
      notice: "",
    }));
  }, []);

  const checkout = React.useCallback((payment, cashierName) => {
    let response = null;
    setState((current) => {
      const result = checkoutCart({
        cart: current.cart,
        products: current.products,
        settings: current.settings,
        payment,
        cashierName,
        transactionNumber: createTransactionNumber(current.transactions.length),
      });
      response = result;

      if (!result.ok) return { ...current, notice: result.error };

      return {
        ...current,
        products: result.products,
        transactions: [result.transaction, ...current.transactions],
        cart: [],
        notice: "Transaction completed",
      };
    });

    return response;
  }, []);

  const updateSettings = React.useCallback((settings) => {
    setState((current) => ({
      ...current,
      settings: { ...current.settings, ...settings },
      notice: "Settings saved",
    }));
  }, []);

  const resetDemoData = React.useCallback(() => {
    setState(resetPersistedState());
  }, []);

  const value = {
    ...state,
    activeProducts: state.products.filter((item) => item.active),
    addToCart,
    updateCartQty,
    clearCart,
    saveProduct,
    addScannedProductToCart,
    deactivateProduct,
    checkout,
    updateSettings,
    resetDemoData,
    setNotice,
    clearNotice,
  };

  return <POSStoreContext.Provider value={value}>{children}</POSStoreContext.Provider>;
}

export function usePOSStore() {
  const value = React.useContext(POSStoreContext);
  if (!value) throw new Error("usePOSStore must be used inside POSStoreProvider");
  return value;
}
