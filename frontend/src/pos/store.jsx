import React from "react";
import { addProductToCart, addSavedProductToCart, validateProduct } from "./domain.js";
import { loadCart, saveCart, clearCartStorage } from "./cart-storage.js";
import { applyCheckoutResult, applyProductStock, loadProducts as fetchProducts, loadSettings as fetchSettings, loadStockMovements as fetchStockMovements, loadTransactions as fetchTransactions, toProductPayload } from "./store-data.js";

const POSStoreContext = React.createContext(null);
const defaultSettings = { storeName: "Toko Balanja", storeAddress: "", taxEnabled: false, taxRate: 11, qrisLabel: "QRIS Toko Balanja" };

export function POSStoreProvider({ children, api }) {
  const [products, setProducts] = React.useState([]);
  const [transactions, setTransactions] = React.useState([]);
  const [stockMovements, setStockMovements] = React.useState([]);
  const [stockMovementCursor, setStockMovementCursor] = React.useState("");
  const [stockMovementFilters, setStockMovementFilters] = React.useState({});
  const [settings, setSettings] = React.useState(defaultSettings);
  const [cart, setCart] = React.useState(() => loadCart());
  const [notice, setNotice] = React.useState("");
  const [loading, setLoading] = React.useState({ products: false, transactions: false, settings: false, stockMovements: false });
  const [loaded, setLoaded] = React.useState({ products: false, transactions: false, settings: false, stockMovements: false });
  const lastLoadedAt = React.useRef({ products: 0, transactions: 0, settings: 0, stockMovements: 0 });
  const productsRef = React.useRef(products);
  const transactionsRef = React.useRef(transactions);
  const stockMovementsRef = React.useRef(stockMovements);
  const stockMovementFiltersRef = React.useRef(stockMovementFilters);
  const settingsRef = React.useRef(settings);
  const loadingRef = React.useRef(loading);
  const loadedRef = React.useRef(loaded);
  const stockMovementRequestRef = React.useRef(0);

  React.useEffect(() => { saveCart(cart); }, [cart]);
  React.useEffect(() => { productsRef.current = products; }, [products]);
  React.useEffect(() => { transactionsRef.current = transactions; }, [transactions]);
  React.useEffect(() => { stockMovementsRef.current = stockMovements; }, [stockMovements]);
  React.useEffect(() => { stockMovementFiltersRef.current = stockMovementFilters; }, [stockMovementFilters]);
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
      return await fetchProducts(api, { q, limit, signal });
    } catch (error) {
      if (error.code !== "REQUEST_TIMEOUT") setNotice(error.message || "Failed to search products");
      return [];
    }
  }, [api]);

  const loadTransactions = React.useCallback(async ({ force = false, signal } = {}) => {
    if (!force && (loadedRef.current.transactions || loadingRef.current.transactions)) return transactionsRef.current;
    loadingRef.current = { ...loadingRef.current, transactions: true };
    setLoading((current) => ({ ...current, transactions: true }));
    try {
      const result = await fetchTransactions(api, { signal });
      transactionsRef.current = result;
      loadedRef.current = { ...loadedRef.current, transactions: true };
      setTransactions(result);
      setLoaded((current) => ({ ...current, transactions: true }));
      lastLoadedAt.current.transactions = Date.now();
      setNotice("");
      return result;
    } catch (error) {
      if (error.code !== "REQUEST_TIMEOUT") setNotice(error.message || "Failed to load transactions");
      return null;
    } finally {
      loadingRef.current = { ...loadingRef.current, transactions: false };
      setLoading((current) => ({ ...current, transactions: false }));
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

  const loadStockMovements = React.useCallback(async ({ force = false, signal, append = false, ...filters } = {}) => {
    const cacheKey = JSON.stringify(filters);
    const currentKey = JSON.stringify(stockMovementFiltersRef.current);
    if (!force && !append && cacheKey === currentKey && (loadedRef.current.stockMovements || loadingRef.current.stockMovements)) return stockMovementsRef.current;
    const requestId = stockMovementRequestRef.current + 1;
    stockMovementRequestRef.current = requestId;
    loadingRef.current = { ...loadingRef.current, stockMovements: true };
    setLoading((current) => ({ ...current, stockMovements: true }));
    try {
      const result = await fetchStockMovements(api, { ...filters, signal });
      if (requestId !== stockMovementRequestRef.current) return result;
      const nextItems = append ? [...stockMovementsRef.current, ...result.items] : result.items;
      stockMovementsRef.current = nextItems;
      loadedRef.current = { ...loadedRef.current, stockMovements: true };
      setStockMovements(nextItems);
      setStockMovementCursor(result.nextCursor);
      stockMovementFiltersRef.current = filters;
      setStockMovementFilters(filters);
      setLoaded((current) => ({ ...current, stockMovements: true }));
      lastLoadedAt.current.stockMovements = Date.now();
      setNotice("");
      return result;
    } catch (error) {
      if (requestId === stockMovementRequestRef.current && error.code !== "REQUEST_TIMEOUT" && error.name !== "AbortError") setNotice(error.message || "Failed to load stock movements");
      return null;
    } finally {
      if (requestId !== stockMovementRequestRef.current) return;
      loadingRef.current = { ...loadingRef.current, stockMovements: false };
      setLoading((current) => ({ ...current, stockMovements: false }));
    }
  }, [api]);

  const refreshLoadedResources = React.useCallback(() => {
    const now = Date.now();
    if (loadedRef.current.products && now - lastLoadedAt.current.products >= 30_000) loadProducts({ force: true });
    if (loadedRef.current.transactions && now - lastLoadedAt.current.transactions >= 30_000) loadTransactions({ force: true });
    if (loadedRef.current.settings && now - lastLoadedAt.current.settings >= 30_000) loadSettings({ force: true });
    if (loadedRef.current.stockMovements && now - lastLoadedAt.current.stockMovements >= 30_000) loadStockMovements({ force: true, ...stockMovementFiltersRef.current });
  }, [loadProducts, loadSettings, loadStockMovements, loadTransactions]);

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
      const result = await api.checkout({ cart, payment });
      setTransactions((current) => [result.transaction, ...current.filter((item) => item.id !== result.transaction.id)]);
      setProducts((current) => applyCheckoutResult(current, result));
      setCart([]);
      clearCartStorage();
      setNotice("Transaction completed");
      return { ok: true, transaction: result.transaction };
    } catch (error) { setNotice(error.message || "Checkout failed"); return { ok: false, error: error.message || "Checkout failed" }; }
  }, [api, cart]);

  const createStockMovement = React.useCallback(async (input) => {
    try {
      const result = await api.createStockMovement(input);
      setProducts((current) => applyProductStock(current, result.product));
      productsRef.current = applyProductStock(productsRef.current, result.product);
      await loadStockMovements({ force: true, ...stockMovementFiltersRef.current });
      setNotice("Stock movement saved");
      return result;
    } catch (error) {
      setNotice(error.message || "Failed to save stock movement");
      return null;
    }
  }, [api, loadStockMovements]);

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
  const isLoading = loading.products || loading.transactions || loading.settings || loading.stockMovements;

  const value = React.useMemo(() => ({
    products, activeProducts, cart, transactions, stockMovements, stockMovementCursor, settings, notice, isLoading, loading, loaded,
    addToCart, updateCartQty, clearCart, saveProduct, addScannedProductToCart, deactivateProduct, checkout,
    createStockMovement, updateSettings, getDashboardSummary: api.getDashboardSummary,
    loadProducts, loadTransactions, loadSettings, loadStockMovements, searchProducts,
    setNotice, clearNotice: () => setNotice(""),
  }), [products, activeProducts, cart, transactions, stockMovements, stockMovementCursor, settings, notice, isLoading, loading, loaded, addToCart, updateCartQty, clearCart, saveProduct, addScannedProductToCart, deactivateProduct, checkout, createStockMovement, updateSettings, api, loadProducts, loadTransactions, loadSettings, loadStockMovements, searchProducts]);

  return <POSStoreContext.Provider value={value}>{children}</POSStoreContext.Provider>;
}

export function usePOSStore() {
  const value = React.useContext(POSStoreContext);
  if (!value) throw new Error("usePOSStore must be used inside POSStoreProvider");
  return value;
}
