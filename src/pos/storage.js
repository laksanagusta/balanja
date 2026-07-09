import { defaultSettings, seedProducts } from "./domain.js";

const STORAGE_KEY = "balanja-retail-pos-v1";

export function createInitialState() {
  return {
    products: seedProducts,
    cart: [],
    transactions: [],
    settings: defaultSettings,
    notice: "",
  };
}

export function loadPersistedState(storage = window.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);

    return {
      ...createInitialState(),
      ...parsed,
      settings: { ...defaultSettings, ...(parsed.settings || {}) },
    };
  } catch {
    return {
      ...createInitialState(),
      notice: "Demo data restored because saved data could not be read.",
    };
  }
}

export function savePersistedState(state, storage = window.localStorage) {
  const payload = {
    products: state.products,
    cart: state.cart,
    transactions: state.transactions,
    settings: state.settings,
  };

  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function resetPersistedState(storage = window.localStorage) {
  storage.removeItem(STORAGE_KEY);
  return createInitialState();
}
