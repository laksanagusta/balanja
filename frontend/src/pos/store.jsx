import React from "react";
import { addProductToCart, addSavedProductToCart, validateProduct } from "./domain.js";
import { loadCart, saveCart, clearCartStorage } from "./cart-storage.js";
import { applyCheckoutResult, applyProductStock, loadProducts as fetchProducts, loadSettings as fetchSettings, searchProducts as fetchProductSearch, toProductFormData } from "./store-data.js";

const POSStoreContext = React.createContext(null);
const defaultSettings = { storeName: "Toko Balanja", storeAddress: "", taxEnabled: false, taxRate: 11, qrisLabel: "QRIS Toko Balanja" };

export function POSStoreProvider({ children, api, cashierName = "" }) {
  const [products, setProducts] = React.useState([]);
  const [settings, setSettings] = React.useState(defaultSettings);
  const [cart, setCart] = React.useState(() => loadCart());
  const [notice, setNotice] = React.useState("");
  const [loading, setLoading] = React.useState({ products: false, settings: false });
  const [loaded, setLoaded] = React.useState({ products: false, settings: false });
  const lastLoadedAt = React.useRef({ products: 0, settings: 0 });
  const productsRef = React.useRef(products);
  const settingsRef = React.useRef(settings);
  const loadingRef = React.useRef(loading);
  const loadedRef = React.useRef(loaded);

  React.useEffect(() => { saveCart(cart); }, [cart]);
  React.useEffect(() => { productsRef.current = products; }, [products]);
  React.useEffect(() => { settingsRef.current = settings; }, [settings]);
  React.useEffect(() => { loadingRef.current = loading; }, [loading]);
  React.useEffect(() => { loadedRef.current = loaded; }, [loaded]);

  const loadProducts = React.useCallback(async ({ force = false, signal } = {}) => {
    if (!force && (loadedRef.current.products || loadingRef.current.products)) return productsRef.current;
    loadingRef.current = { ...loadingRef.current, products: true };
    setLoading((current) => ({ ...current, products: true }));
    try {
      const result = await fetchProducts(api, { signal });
      productsRef.current = result;
      loadedRef.current = { ...loadedRef.current, products: true };
      setProducts(result);
      setLoaded((current) => ({ ...current, products: true }));
      lastLoadedAt.current.products = Date.now();
      setNotice("");
      return result;
    } catch (error) {
      if (error.code !== "REQUEST_TIMEOUT") setNotice(error.message || "Failed to load products");
      return null;
    } finally {
      loadingRef.current = { ...loadingRef.current, products: false };
      setLoading((current) => ({ ...current, products: false }));
    }
  }, [api]);

  const searchProducts = React.useCallback(async ({ q = "", limit = 6, signal } = {}) => {
    try {
      return await fetchProductSearch(api, { q, limit, signal });
    } catch (error) {
      if (error.code !== "REQUEST_TIMEOUT") setNotice(error.message || "Failed to search products");
      return [];
    }
  }, [api]);

  const loadSettings = React.useCallback(async ({ force = false, signal } = {}) => {
    if (!force && (loadedRef.current.settings || loadingRef.current.settings)) return settingsRef.current;
    loadingRef.current = { ...loadingRef.current, settings: true };
    setLoading((current) => ({ ...current, settings: true }));
    try {
      const result = await fetchSettings(api, { signal });
      settingsRef.current = result;
      loadedRef.current = { ...loadedRef.current, settings: true };
      setSettings(result);
      setLoaded((current) => ({ ...current, settings: true }));
      lastLoadedAt.current.settings = Date.now();
      setNotice("");
      return result;
    } catch (error) {
      if (error.code !== "REQUEST_TIMEOUT") setNotice(error.message || "Failed to load settings");
      return null;
    } finally {
      loadingRef.current = { ...loadingRef.current, settings: false };
      setLoading((current) => ({ ...current, settings: false }));
    }
  }, [api]);

  const refreshLoadedResources = React.useCallback(() => {
    const now = Date.now();
    if (loadedRef.current.products && now - lastLoadedAt.current.products >= 30_000) loadProducts({ force: true });
    if (loadedRef.current.settings && now - lastLoadedAt.current.settings >= 30_000) loadSettings({ force: true });
  }, [loadProducts, loadSettings]);

  React.useEffect(() => {
    const refetchStaleData = () => {
      if (document.visibilityState === "visible") refreshLoadedResources();
    };
    document.addEventListener("visibilitychange", refetchStaleData);
    return () => document.removeEventListener("visibilitychange", refetchStaleData);
  }, [refreshLoadedResources]);

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

  const saveProduct = React.useCallback(async (product, { throwOnError = false } = {}) => {
    const validation = validateProduct(product, products);
    if (!validation.ok) { setNotice(Object.values(validation.errors)[0]); return null; }
    try {
      const exists = Boolean(product.id);
      const form = toProductFormData(product, !exists);
      const saved = exists
        ? await api.updateProduct(product.id, form)
        : await api.createProduct(form);
      setProducts((current) => exists ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setNotice("");
      return saved;
    } catch (error) {
      setNotice(error.message || "Failed to save product");
      if (throwOnError) throw error;
      return null;
    }
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
      return { ok: true, product: saved };
    } catch (error) {
      const message = error.message || "Failed to deactivate product";
      setNotice(message);
      return { ok: false, error: message };
    }
  }, [api]);

  const checkout = React.useCallback(async (payment) => {
    if (cart.length === 0) { setNotice("Cart is empty"); return { ok: false, error: "Cart is empty" }; }
    try {
      const result = await api.checkout({ cart, payment, cashierName });
      setProducts((current) => applyCheckoutResult(current, result));
      setCart([]);
      clearCartStorage();
      setNotice("Transaction completed");
      return { ok: true, transaction: result.transaction };
    } catch (error) { setNotice(error.message || "Checkout failed"); return { ok: false, error: error.message || "Checkout failed" }; }
  }, [api, cart, cashierName]);

  const createStockMovement = React.useCallback(async (input) => {
    try {
      const result = await api.createStockMovement(input);
      setProducts((current) => applyProductStock(current, result.product));
      productsRef.current = applyProductStock(productsRef.current, result.product);
      setNotice("Stock movement saved");
      return result;
    } catch (error) {
      setNotice(error.message || "Failed to save stock movement");
      return null;
    }
  }, [api]);

  const updateSettings = React.useCallback(async (input) => {
    try {
      const saved = await api.updateSettings({ ...input, taxRate: Number(input.taxRate) || 0, taxEnabled: Boolean(input.taxEnabled) });
      settingsRef.current = saved;
      loadedRef.current = { ...loadedRef.current, settings: true };
      setSettings(saved);
      setLoaded((current) => ({ ...current, settings: true }));
      lastLoadedAt.current.settings = Date.now();
      setNotice("Settings saved");
      return saved;
    } catch (error) { setNotice(error.message || "Failed to save settings"); return null; }
  }, [api]);

  const activeProducts = React.useMemo(() => products.filter((item) => item.active), [products]);
  const isLoading = loading.products || loading.settings;

  const value = React.useMemo(() => ({
    api, products, activeProducts, cart, settings, notice, isLoading, loading, loaded,
    addToCart, updateCartQty, clearCart, saveProduct, addScannedProductToCart, deactivateProduct, checkout,
    createStockMovement, updateSettings, getDashboardSummary: api.getDashboardSummary,
    loadProducts, loadSettings, searchProducts,
    setNotice, clearNotice: () => setNotice(""),
  }), [products, activeProducts, cart, settings, notice, isLoading, loading, loaded, addToCart, updateCartQty, clearCart, saveProduct, addScannedProductToCart, deactivateProduct, checkout, createStockMovement, updateSettings, api, loadProducts, loadSettings, searchProducts]);

  return <POSStoreContext.Provider value={value}>{children}</POSStoreContext.Provider>;
}

export function usePOSStore() {
  const value = React.useContext(POSStoreContext);
  if (!value) throw new Error("usePOSStore must be used inside POSStoreProvider");
  return value;
}
