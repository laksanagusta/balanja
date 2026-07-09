import React from "react";
import {
  addProductToCart,
  checkoutCart,
  createTransactionNumber,
  validateProduct,
} from "./domain.js";
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
    setState((current) => {
      const result = addProductToCart(current.cart, current.products, barcodeOrProductId);
      return result.ok
        ? { ...current, cart: result.cart, notice: "" }
        : { ...current, notice: result.error };
    });
  }, []);

  const updateCartQty = React.useCallback((productId, qty) => {
    setState((current) => {
      const product = current.products.find((item) => item.id === productId);
      const nextQty = Math.max(0, Number(qty));

      if (!product) return { ...current, notice: "Product not found" };
      if (nextQty > product.stock) return { ...current, notice: "Cart quantity exceeds stock" };

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
  }, []);

  const clearCart = React.useCallback(() => {
    setState((current) => ({ ...current, cart: [], notice: "" }));
  }, []);

  const saveProduct = React.useCallback((product) => {
    setState((current) => {
      const now = new Date().toISOString();
      const normalized = {
        ...product,
        price: Number(product.price),
        stock: Number(product.stock),
        active: product.active !== false,
        updatedAt: now,
        createdAt: product.createdAt || now,
      };
      const validation = validateProduct(normalized, current.products);

      if (!validation.ok) return { ...current, notice: Object.values(validation.errors)[0] };

      const exists = current.products.some((item) => item.id === normalized.id);
      return {
        ...current,
        products: exists
          ? current.products.map((item) => (item.id === normalized.id ? normalized : item))
          : [...current.products, { ...normalized, id: normalized.id || `prod-${Date.now()}` }],
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
