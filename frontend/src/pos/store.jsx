import React from "react";
import { addProductToCart, addSavedProductToCart, validateProduct } from "./domain.js";
import { loadCart, saveCart, clearCartStorage } from "./cart-storage.js";
import { applyCheckoutResult, loadPOSData, toProductPayload } from "./store-data.js";

const POSStoreContext = React.createContext(null);
const defaultSettings = { storeName: "Toko Balanja", storeAddress: "", taxEnabled: false, taxRate: 11, qrisLabel: "QRIS Toko Balanja" };

export function POSStoreProvider({ children, api }) {
  const [products, setProducts] = React.useState([]);
  const [transactions, setTransactions] = React.useState([]);
  const [settings, setSettings] = React.useState(defaultSettings);
  const [cart, setCart] = React.useState(() => loadCart());
  const [notice, setNotice] = React.useState("");
  const lastLoadedAt = React.useRef(0);

  React.useEffect(() => { saveCart(cart); }, [cart]);

  const refresh = React.useCallback(async () => {
    try {
      const data = await loadPOSData(api);
      setProducts(data.products);
      setTransactions(data.transactions);
      setSettings(data.settings);
      lastLoadedAt.current = Date.now();
      setNotice("");
    } catch (error) {
      setNotice(error.message || "Failed to load store data");
    }
  }, [api]);

  React.useEffect(() => { refresh(); }, [refresh]);
  React.useEffect(() => {
    const refetchStaleData = () => {
      if (document.visibilityState === "visible" && Date.now() - lastLoadedAt.current >= 30_000) refresh();
    };
    document.addEventListener("visibilitychange", refetchStaleData);
    return () => document.removeEventListener("visibilitychange", refetchStaleData);
  }, [refresh]);

  const addToCart = React.useCallback((barcodeOrProductId) => {
    let response;
    setCart((current) => {
      response = addProductToCart(current, products, barcodeOrProductId);
      return response.ok ? response.cart : current;
    });
    if (response && !response.ok) setNotice(response.error);
    return response;
  }, [products]);

  const updateCartQty = React.useCallback((productId, qty) => {
    const product = products.find((item) => item.id === productId);
    const nextQty = Math.max(0, Number(qty));
    if (!product) { setNotice("Product not found"); return { ok: false, error: "Product not found" }; }
    if (nextQty > product.stock) { setNotice("Cart quantity exceeds stock"); return { ok: false, error: "Cart quantity exceeds stock" }; }
    setCart((current) => nextQty === 0 ? current.filter((item) => item.productId !== productId) : current.map((item) => item.productId === productId ? { ...item, qty: nextQty } : item));
    setNotice("");
    return { ok: true };
  }, [products]);

  const clearCart = React.useCallback(() => { setCart([]); clearCartStorage(); setNotice(""); }, []);

  const saveProduct = React.useCallback(async (product) => {
    const validation = validateProduct(product, products);
    if (!validation.ok) { setNotice(Object.values(validation.errors)[0]); return null; }
    try {
      const exists = Boolean(product.id);
      const saved = exists
        ? await api.updateProduct(product.id, toProductPayload(product, false))
        : await api.createProduct(toProductPayload(product, true));
      setProducts((current) => exists ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setNotice("");
      return saved;
    } catch (error) { setNotice(error.message || "Failed to save product"); return null; }
  }, [api, products]);

  const addScannedProductToCart = React.useCallback(async (product) => {
    const saved = await saveProduct(product);
    if (!saved) return;
    setCart((current) => {
      const result = addSavedProductToCart(current, [...products, saved], saved);
      if (!result.ok) setNotice(result.error);
      return result.ok ? result.cart : current;
    });
  }, [products, saveProduct]);

  const deactivateProduct = React.useCallback(async (productId) => {
    try {
      const saved = await api.deactivateProduct(productId);
      setProducts((current) => current.map((item) => item.id === productId ? saved : item));
      setCart((current) => current.filter((item) => item.productId !== productId));
      setNotice("");
    } catch (error) { setNotice(error.message || "Failed to deactivate product"); }
  }, [api]);

  const checkout = React.useCallback(async (payment) => {
    if (cart.length === 0) { setNotice("Cart is empty"); return { ok: false, error: "Cart is empty" }; }
    try {
      const result = await api.checkout({ cart, payment });
      setTransactions((current) => [result.transaction, ...current.filter((item) => item.id !== result.transaction.id)]);
      setProducts((current) => applyCheckoutResult(current, result));
      setCart([]);
      clearCartStorage();
      setNotice("Transaction completed");
      return { ok: true, transaction: result.transaction };
    } catch (error) { setNotice(error.message || "Checkout failed"); return { ok: false, error: error.message || "Checkout failed" }; }
  }, [api, cart]);

  const updateSettings = React.useCallback(async (input) => {
    try {
      const saved = await api.updateSettings({ ...input, taxRate: Number(input.taxRate) || 0, taxEnabled: Boolean(input.taxEnabled) });
      setSettings(saved);
      setNotice("Settings saved");
      return saved;
    } catch (error) { setNotice(error.message || "Failed to save settings"); return null; }
  }, [api]);

  const value = React.useMemo(() => ({
    products, activeProducts: products.filter((item) => item.active), cart, transactions, settings, notice,
    addToCart, updateCartQty, clearCart, saveProduct, addScannedProductToCart, deactivateProduct, checkout,
    updateSettings, getDashboardSummary: api.getDashboardSummary, refresh,
    setNotice, clearNotice: () => setNotice(""),
  }), [products, cart, transactions, settings, notice, addToCart, updateCartQty, clearCart, saveProduct, addScannedProductToCart, deactivateProduct, checkout, updateSettings, api, refresh]);

  return <POSStoreContext.Provider value={value}>{children}</POSStoreContext.Provider>;
}

export function usePOSStore() {
  const value = React.useContext(POSStoreContext);
  if (!value) throw new Error("usePOSStore must be used inside POSStoreProvider");
  return value;
}
